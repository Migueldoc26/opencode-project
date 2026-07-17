import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  sensor: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  asset: { findFirst: vi.fn() },
  sensorReading: { findMany: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock('../services/prisma.js', () => ({ default: mockPrisma }));

const mqttMock = { ensureSensorSubscribed: vi.fn(), unsubscribeSensor: vi.fn() };
vi.mock('../mqtt/mqtt.service.js', () => ({ mqttService: mqttMock }));

const { createSensor, updateSensor, getSensorById, deleteSensor, saveSensorPosition, deleteSensorPosition } = await import('../services/sensor.service.js');

const companyId = 'comp-001';
const userId = 'user-001';
const req = { user: { id: userId, companyId, role: 'ADMIN' } };

describe('createSensor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a sensor with valid payload', async () => {
    const asset = { id: 'asset-001', name: 'Bomba 1', companyId };
    mockPrisma.asset.findFirst.mockResolvedValue(asset);
    mockPrisma.sensor.create.mockResolvedValue({ id: 'sen-001', name: 'Sensor Temp', code: 'TEMP-001', assetId: 'asset-001', isActive: true });

    const result = await createSensor({
      name: 'Sensor Temp',
      code: 'TEMP-001',
      type: 'TEMPERATURE',
      assetId: 'asset-001',
      unit: '°C',
    }, companyId);

    expect(result).toMatchObject({ id: 'sen-001', name: 'Sensor Temp' });
    expect(mockPrisma.sensor.create).toHaveBeenCalledOnce();
    const callArgs = mockPrisma.sensor.create.mock.calls[0][0].data;
    expect(callArgs.name).toBe('Sensor Temp');
    expect(callArgs.code).toBe('TEMP-001');
    expect(callArgs.assetId).toBe('asset-001');
    expect(callArgs.isActive).toBe(true);
  });

  it('rejects when name is missing', async () => {
    await expect(createSensor({ assetId: 'asset-001', type: 'TEMPERATURE' }, companyId))
      .rejects.toThrow('Nombre requerido');
    expect(mockPrisma.sensor.create).not.toHaveBeenCalled();
  });

  it('rejects when assetId is missing', async () => {
    await expect(createSensor({ name: 'Sensor', type: 'TEMPERATURE' }, companyId))
      .rejects.toThrow('Activo requerido');
    expect(mockPrisma.sensor.create).not.toHaveBeenCalled();
  });

  it('strips unknown fields like companyId from the payload', async () => {
    const asset = { id: 'asset-001', name: 'Bomba 1', companyId };
    mockPrisma.asset.findFirst.mockResolvedValue(asset);
    mockPrisma.sensor.create.mockResolvedValue({ id: 'sen-001', name: 'Sensor', code: 'SEN-001', assetId: 'asset-001' });

    await createSensor({
      name: 'Sensor',
      code: 'SEN-001',
      type: 'TEMPERATURE',
      assetId: 'asset-001',
      companyId: 'other-company',
      createdAt: '2020-01-01',
      updatedAt: '2020-01-01',
    }, companyId);

    const saved = mockPrisma.sensor.create.mock.calls[0][0].data;
    expect(saved.companyId).toBeUndefined();
    expect(saved.createdAt).toBeUndefined();
    expect(saved.updatedAt).toBeUndefined();
    expect(saved.name).toBe('Sensor');
  });

  it('rejects when the asset belongs to another company', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue(null);

    await expect(createSensor({
      name: 'Sensor',
      code: 'SEN-001',
      type: 'TEMPERATURE',
      assetId: 'asset-002',
    }, companyId)).rejects.toThrow('Activo no encontrado');
    expect(mockPrisma.sensor.create).not.toHaveBeenCalled();
  });

  it('auto-generates code when not provided', async () => {
    const asset = { id: 'asset-001', name: 'Bomba 1', companyId };
    mockPrisma.asset.findFirst.mockResolvedValue(asset);
    mockPrisma.sensor.create.mockResolvedValue({ id: 'sen-001', name: 'Sensor', code: 'SEN-xxx', assetId: 'asset-001' });

    await createSensor({ name: 'Sensor', type: 'TEMPERATURE', assetId: 'asset-001' }, companyId);

    const saved = mockPrisma.sensor.create.mock.calls[0][0].data;
    expect(saved.code).toBeDefined();
    expect(saved.code).toMatch(/^SEN-/);
  });

  it('wraps Prisma errors with a generic message', async () => {
    const asset = { id: 'asset-001', name: 'Bomba 1', companyId };
    mockPrisma.asset.findFirst.mockResolvedValue(asset);
    mockPrisma.sensor.create.mockRejectedValue(new Error('Unique constraint violation'));

    await expect(createSensor({
      name: 'Sensor',
      code: 'TEMP-001',
      type: 'TEMPERATURE',
      assetId: 'asset-001',
    }, companyId)).rejects.toThrow('Error al crear sensor');
  });
});

describe('updateSensor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates allowed fields', async () => {
    const existing = { id: 'sen-001', name: 'Old', code: 'TEMP-001', type: 'TEMPERATURE', assetId: 'asset-001', isActive: true, companyId };
    mockPrisma.sensor.findFirst.mockResolvedValue(existing);
    mockPrisma.sensor.update.mockResolvedValue({ ...existing, name: 'New Name' });

    const result = await updateSensor('sen-001', { name: 'New Name' }, companyId);

    expect(result.name).toBe('New Name');
    expect(mockPrisma.sensor.update).toHaveBeenCalledOnce();
    const updateData = mockPrisma.sensor.update.mock.calls[0][0].data;
    expect(updateData.name).toBe('New Name');
  });

  it('strips protected fields (id, companyId, createdAt, updatedAt)', async () => {
    const existing = { id: 'sen-001', name: 'Sensor', code: 'TEMP-001', type: 'TEMPERATURE', assetId: 'asset-001', isActive: true };
    mockPrisma.sensor.findFirst.mockResolvedValue(existing);
    mockPrisma.sensor.update.mockResolvedValue(existing);

    await updateSensor('sen-001', {
      name: 'Updated',
      id: 'new-id',
      companyId: 'other-company',
      createdAt: '2020-01-01',
      updatedAt: '2020-01-01',
    }, companyId);

    const updateData = mockPrisma.sensor.update.mock.calls[0][0].data;
    expect(updateData.name).toBe('Updated');
    expect(updateData.id).toBeUndefined();
    expect(updateData.companyId).toBeUndefined();
    expect(updateData.createdAt).toBeUndefined();
    expect(updateData.updatedAt).toBeUndefined();
  });

  it('rejects when sensor does not exist', async () => {
    mockPrisma.sensor.findFirst.mockResolvedValue(null);

    await expect(updateSensor('nonexistent', { name: 'New' }, companyId))
      .rejects.toThrow('Sensor no encontrado');
    expect(mockPrisma.sensor.update).not.toHaveBeenCalled();
  });

  it('rejects when sensor belongs to another company', async () => {
    mockPrisma.sensor.findFirst.mockResolvedValue(null);

    await expect(updateSensor('sen-002', { name: 'Hack' }, 'other-company'))
      .rejects.toThrow('Sensor no encontrado');
    expect(mockPrisma.sensor.update).not.toHaveBeenCalled();
  });

  it('wraps Prisma errors', async () => {
    const existing = { id: 'sen-001', name: 'Sensor', code: 'TEMP-001', type: 'TEMPERATURE', assetId: 'asset-001' };
    mockPrisma.sensor.findFirst.mockResolvedValue(existing);
    mockPrisma.sensor.update.mockRejectedValue(new Error('DB error'));

    await expect(updateSensor('sen-001', { name: 'New' }, companyId))
      .rejects.toThrow('Error al actualizar sensor');
  });
});

describe('getSensorById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns sensor when it belongs to the same company', async () => {
    const sensor = { id: 'sen-001', name: 'Sensor', asset: { companyId } };
    mockPrisma.sensor.findFirst.mockResolvedValue(sensor);

    const result = await getSensorById('sen-001', companyId);
    expect(result).toBe(sensor);
  });

  it('returns null when sensor belongs to another company', async () => {
    mockPrisma.sensor.findFirst.mockResolvedValue(null);

    const result = await getSensorById('sen-002', 'other-company');
    expect(result).toBeNull();
  });
});

describe('deleteSensor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('soft-deletes sensor when it belongs to the same company', async () => {
    mockPrisma.sensor.findFirst.mockResolvedValue({ id: 'sen-001', asset: { companyId } });
    mockPrisma.sensor.update.mockResolvedValue({ id: 'sen-001', isActive: false });

    await deleteSensor('sen-001', companyId);
    expect(mockPrisma.sensor.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sen-001' }, data: { isActive: false } })
    );
  });

  it('rejects when sensor belongs to another company', async () => {
    mockPrisma.sensor.findFirst.mockResolvedValue(null);

    await expect(deleteSensor('sen-002', 'other-company'))
      .rejects.toThrow('Sensor no encontrado');
    expect(mockPrisma.sensor.update).not.toHaveBeenCalled();
  });
});

describe('saveSensorPosition', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('saves position when sensor belongs to the same company', async () => {
    mockPrisma.sensor.findFirst.mockResolvedValue({ id: 'sen-001' });
    mockPrisma.sensor.update.mockResolvedValue({ id: 'sen-001', position: { x: 1, y: 2, z: 3 } });

    const result = await saveSensorPosition('sen-001', { x: 1, y: 2, z: 3 }, companyId);
    expect(result.position).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('rejects when sensor belongs to another company', async () => {
    mockPrisma.sensor.findFirst.mockResolvedValue(null);

    await expect(saveSensorPosition('sen-002', { x: 0, y: 0, z: 0 }, 'other-company'))
      .rejects.toThrow('Sensor no encontrado');
  });
});

describe('deleteSensorPosition', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('clears position when sensor belongs to the same company', async () => {
    mockPrisma.sensor.findFirst.mockResolvedValue({ id: 'sen-001' });
    mockPrisma.sensor.update.mockResolvedValue({ id: 'sen-001', position: null });

    const result = await deleteSensorPosition('sen-001', companyId);
    expect(result.position).toBeNull();
  });

  it('rejects when sensor belongs to another company', async () => {
    mockPrisma.sensor.findFirst.mockResolvedValue(null);

    await expect(deleteSensorPosition('sen-002', 'other-company'))
      .rejects.toThrow('Sensor no encontrado');
  });
});
