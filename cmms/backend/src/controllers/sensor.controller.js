import prisma from '../services/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listSensors(req, res) {
  const { page = 1, limit = 50, assetId, type, isActive } = req.query;
  const where = {};
  if (assetId) where.assetId = assetId;
  if (type) where.type = type;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [data, total] = await Promise.all([
    prisma.sensor.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { name: 'asc' },
      include: {
        asset: { select: { id: true, name: true, code: true } },
        component: { select: { id: true, name: true } },
      },
    }),
    prisma.sensor.count({ where }),
  ]);

  res.json({ data, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
}

export async function getSensor(req, res) {
  const sensor = await prisma.sensor.findUnique({
    where: { id: req.params.id },
    include: {
      asset: { select: { id: true, name: true, code: true } },
      component: { select: { id: true, name: true } },
      alertConfigs: true,
    },
  });
  if (!sensor) throw new AppError('Sensor no encontrado', 404);
  res.json(sensor);
}

export async function getSensorReadings(req, res) {
  const { from, to, limit = 200 } = req.query;
  const where = { sensorId: req.params.id };
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }
  const readings = await prisma.sensorReading.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: parseInt(limit),
  });
  res.json(readings);
}

export async function updateSensor(req, res) {
  const sensor = await prisma.sensor.findUnique({ where: { id: req.params.id } });
  if (!sensor) throw new AppError('Sensor no encontrado', 404);
  const updated = await prisma.sensor.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(updated);
}

export async function deleteSensor(req, res) {
  const sensor = await prisma.sensor.findUnique({ where: { id: req.params.id } });
  if (!sensor) throw new AppError('Sensor no encontrado', 404);
  await prisma.sensor.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'Sensor desactivado exitosamente' });
}

export async function saveSensorPosition(req, res) {
  const { x, y, z } = req.body;
  const sensor = await prisma.sensor.findUnique({ where: { id: req.params.id } });
  if (!sensor) throw new AppError('Sensor no encontrado', 404);
  const updated = await prisma.sensor.update({
    where: { id: req.params.id },
    data: { position: { x, y, z } },
  });
  res.json(updated);
}

export async function deleteSensorPosition(req, res) {
  const sensor = await prisma.sensor.findUnique({ where: { id: req.params.id } });
  if (!sensor) throw new AppError('Sensor no encontrado', 404);
  const updated = await prisma.sensor.update({
    where: { id: req.params.id },
    data: { position: null },
  });
  res.json(updated);
}
