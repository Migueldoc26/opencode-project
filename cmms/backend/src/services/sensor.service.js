import prisma from './prisma.js';

const ALLOWED_CREATE_FIELDS = [
  'name', 'code', 'type', 'mqttTopic', 'unit',
  'minThreshold', 'maxThreshold',
  'warningMin', 'warningMax', 'criticalMin', 'criticalMax',
  'isActive', 'samplingRate', 'metadata',
  'position', 'assetId', 'componentId',
];

const ALLOWED_UPDATE_FIELDS = [
  'name', 'type', 'mqttTopic', 'unit', 'assetId',
  'minThreshold', 'maxThreshold',
  'warningMin', 'warningMax', 'criticalMin', 'criticalMax',
  'isActive', 'samplingRate', 'metadata', 'position',
];

const PROTECTED_FIELDS = ['id', 'companyId', 'createdAt', 'updatedAt', 'lastValue', 'lastValueAt'];

function pick(data, allowed) {
  const result = {};
  for (const key of allowed) {
    if (key in data) {
      result[key] = data[key] === '' ? null : data[key];
    }
  }
  return result;
}

function stripProtected(data) {
  const result = { ...data };
  for (const key of PROTECTED_FIELDS) {
    delete result[key];
  }
  return result;
}

const THRESHOLD_KEYS = ['minThreshold', 'maxThreshold', 'warningMin', 'warningMax', 'criticalMin', 'criticalMax'];

function normalizeNumericFields(data) {
  for (const key of THRESHOLD_KEYS) {
    if (data[key] !== undefined && data[key] !== null) {
      data[key] = Number(data[key]);
    }
  }
  if (data.samplingRate !== undefined) {
    data.samplingRate = Number(data.samplingRate) || 60;
  }
  return data;
}

function packThresholds(data) {
  const hasAny = THRESHOLD_KEYS.some(k => k in data);
  if (hasAny) {
    const t = {};
    for (const k of THRESHOLD_KEYS) {
      if (data[k] !== undefined && data[k] !== null) {
        t[k] = data[k];
      }
      delete data[k];
    }
    data.thresholds = Object.keys(t).length ? t : null;
  }
  return data;
}

function unpackThresholds(data) {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(unpackThresholds);
  }
  if (data.thresholds && typeof data.thresholds === 'object') {
    for (const k of THRESHOLD_KEYS) {
      if (data.thresholds[k] !== undefined) {
        data[k] = data.thresholds[k];
      }
    }
  }
  return data;
}

export async function createSensor(body, companyId) {
  let data = pick(body, ALLOWED_CREATE_FIELDS);
  data = stripProtected(data);

  if (!data.name) throw Object.assign(new Error('Nombre requerido'), { statusCode: 400 });
  if (!data.assetId) throw Object.assign(new Error('Activo requerido'), { statusCode: 400 });

  if (!data.type) data.type = 'TEMPERATURE';
  if (!data.code) data.code = `SEN-${Date.now().toString(36).toUpperCase()}`;
  if (data.isActive === undefined) data.isActive = true;

  normalizeNumericFields(data);
  packThresholds(data);

  const asset = await prisma.asset.findFirst({
    where: { id: data.assetId, companyId },
  });
  if (!asset) throw Object.assign(new Error('Activo no encontrado'), { statusCode: 404 });

  try {
    const created = await prisma.sensor.create({
      data,
      include: {
        asset: { select: { id: true, name: true } },
        component: { select: { id: true, name: true } },
        alertConfigs: { select: { id: true, name: true, severity: true, enabled: true, condition: true, threshold: true } },
        _count: { select: { readings: true, alerts: true } },
      },
    });
    return unpackThresholds(created);
  } catch (err) {
    throw Object.assign(new Error('Error al crear sensor'), { statusCode: 500, cause: err });
  }
}

export async function updateSensor(id, body, companyId) {
  let data = pick(body, ALLOWED_UPDATE_FIELDS);
  data = stripProtected(data);

  const existing = await prisma.sensor.findFirst({ where: { id, asset: { companyId } } });
  if (!existing) throw Object.assign(new Error('Sensor no encontrado'), { statusCode: 404 });

  normalizeNumericFields(data);
  packThresholds(data);

  try {
    const updated = await prisma.sensor.update({
      where: { id },
      data,
      include: {
        asset: { select: { id: true, name: true } },
        alertConfigs: true,
      },
    });
    return unpackThresholds(updated);
  } catch (err) {
    throw Object.assign(new Error('Error al actualizar sensor'), { statusCode: 500, cause: err });
  }
}

export async function getSensorById(id, companyId) {
  const sensor = await prisma.sensor.findFirst({
    where: { id, asset: { companyId } },
    include: {
      asset: { select: { id: true, name: true, code: true } },
      component: { select: { id: true, name: true } },
      alertConfigs: true,
    },
  });
  return unpackThresholds(sensor);
}

export async function listSensors(query, companyId) {
  const { page = 1, limit = 50, assetId, type, isActive, search } = query;
  const where = { asset: { companyId } };
  if (assetId) where.assetId = assetId;
  if (type) where.type = type;
  if (isActive !== undefined && isActive !== 'all') where.isActive = isActive === 'true';
  else where.isActive = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { mqttTopic: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [data, total] = await Promise.all([
    prisma.sensor.findMany({
      where,
      skip,
      take: parseInt(limit, 10),
      orderBy: { name: 'asc' },
      include: {
        asset: { select: { id: true, name: true } },
        component: { select: { id: true, name: true } },
        alertConfigs: { select: { id: true, name: true, severity: true, enabled: true, condition: true, threshold: true } },
        _count: { select: { readings: true, alerts: true } },
      },
    }),
    prisma.sensor.count({ where }),
  ]);

  const enriched = unpackThresholds(data).map((s) => {
    const isOnline = s.lastValueAt && (Date.now() - new Date(s.lastValueAt).getTime()) < 300000;
    return { ...s, status: isOnline ? 'ONLINE' : 'OFFLINE' };
  });

  return { data: enriched, total, page: parseInt(page, 10), totalPages: Math.ceil(total / parseInt(limit, 10)) };
}

export async function getSensorReadings(id, query, companyId) {
  const sensor = await prisma.sensor.findFirst({ where: { id, asset: { companyId } }, select: { id: true } });
  if (!sensor) throw Object.assign(new Error('Sensor no encontrado'), { statusCode: 404 });

  const { from, to, limit = 200 } = query;
  const where = { sensorId: id };
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }
  const readings = await prisma.sensorReading.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: parseInt(limit, 10),
  });
  return readings;
}

export async function deleteSensor(id, companyId) {
  const existing = await prisma.sensor.findFirst({ where: { id, asset: { companyId } } });
  if (!existing) throw Object.assign(new Error('Sensor no encontrado'), { statusCode: 404 });

  await prisma.sensor.update({ where: { id }, data: { isActive: false } });
}

export async function saveSensorPosition(id, position, companyId) {
  const existing = await prisma.sensor.findFirst({ where: { id, asset: { companyId } } });
  if (!existing) throw Object.assign(new Error('Sensor no encontrado'), { statusCode: 404 });

  const updated = await prisma.sensor.update({
    where: { id },
    data: { position },
  });
  return updated;
}

export async function deleteSensorPosition(id, companyId) {
  const existing = await prisma.sensor.findFirst({ where: { id, asset: { companyId } } });
  if (!existing) throw Object.assign(new Error('Sensor no encontrado'), { statusCode: 404 });

  const updated = await prisma.sensor.update({
    where: { id },
    data: { position: null },
  });
  return updated;
}

export async function setManualValue(code, value, companyId) {
  const sensor = await prisma.sensor.findFirst({
    where: { code, asset: { companyId } },
  });
  if (!sensor) throw Object.assign(new Error('Sensor no encontrado'), { statusCode: 404 });

  const [reading] = await Promise.all([
    prisma.sensorReading.create({
      data: { sensorId: sensor.id, value, timestamp: new Date() },
    }),
    prisma.sensor.update({
      where: { id: sensor.id },
      data: { lastValue: value, lastValueAt: new Date() },
    }),
  ]);

  return { sensor, reading };
}
