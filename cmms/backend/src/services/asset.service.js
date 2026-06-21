import prisma from './prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listAssets({ page = 1, limit = 20, search, status, areaId, plantId }) {
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;
  if (areaId) where.areaId = areaId;
  if (plantId) where.plantId = plantId;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        area: { select: { id: true, name: true } },
        plant: { select: { id: true, name: true } },
        _count: { select: { sensors: true, workOrders: true, alerts: true } },
      },
    }),
    prisma.asset.count({ where }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getAssetById(id) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      area: true,
      plant: true,
      components: {
        include: { sensors: true },
        orderBy: { name: 'asc' },
      },
      sensors: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
      digitalTwin: true,
      _count: {
        select: {
          workOrders: true,
          alerts: true,
          maintenanceLogs: true,
          documents: true,
          spareParts: true,
        },
      },
    },
  });

  if (!asset) throw new AppError('Activo no encontrado', 404);
  return asset;
}

export async function createAsset(data) {
  return prisma.asset.create({ data });
}

export async function updateAsset(id, data) {
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Activo no encontrado', 404);
  return prisma.asset.update({ where: { id }, data });
}

export async function deleteAsset(id) {
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) throw new AppError('Activo no encontrado', 404);
  return prisma.asset.update({ where: { id }, data: { status: 'DECOMMISSIONED' } });
}

export async function getAssetSensors(assetId) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AppError('Activo no encontrado', 404);
  return prisma.sensor.findMany({
    where: { assetId },
    include: { component: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function assignSensor(assetId, sensorId) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AppError('Activo no encontrado', 404);
  return prisma.sensor.update({ where: { id: sensorId }, data: { assetId } });
}

export async function getAssetReadings(assetId, { from, to, limit = 100 }) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AppError('Activo no encontrado', 404);

  const where = { sensor: { assetId } };
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }

  return prisma.sensorReading.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: { sensor: { select: { id: true, name: true, unit: true, type: true } } },
  });
}

export async function getAssetMaintenance(assetId) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AppError('Activo no encontrado', 404);
  return prisma.maintenanceLog.findMany({
    where: { assetId },
    orderBy: { performedAt: 'desc' },
  });
}
