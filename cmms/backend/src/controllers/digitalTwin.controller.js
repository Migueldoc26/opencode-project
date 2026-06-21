import prisma from '../services/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listDigitalTwins(req, res) {
  const twins = await prisma.digitalTwin.findMany({
    include: {
      asset: { select: { id: true, name: true, code: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(twins);
}

export async function getDigitalTwin(req, res) {
  const twin = await prisma.digitalTwin.findUnique({
    where: { id: req.params.id },
    include: {
      asset: {
        include: {
          sensors: { where: { isActive: true } },
          components: true,
        },
      },
      scenes: true,
    },
  });
  if (!twin) throw new AppError('Gemelo digital no encontrado', 404);
  res.json(twin);
}

export async function createDigitalTwin(req, res) {
  const twin = await prisma.digitalTwin.create({
    data: req.body,
    include: { asset: { select: { id: true, name: true, code: true } } },
  });
  res.status(201).json(twin);
}

export async function updateDigitalTwin(req, res) {
  const twin = await prisma.digitalTwin.findUnique({ where: { id: req.params.id } });
  if (!twin) throw new AppError('Gemelo digital no encontrado', 404);
  const updated = await prisma.digitalTwin.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(updated);
}

export async function deleteDigitalTwin(req, res) {
  const twin = await prisma.digitalTwin.findUnique({ where: { id: req.params.id } });
  if (!twin) throw new AppError('Gemelo digital no encontrado', 404);
  await prisma.digitalTwin.delete({ where: { id: req.params.id } });
  res.json({ message: 'Gemelo digital eliminado exitosamente' });
}

export async function getDigitalTwinStatus(req, res) {
  const twin = await prisma.digitalTwin.findUnique({
    where: { id: req.params.id },
    include: {
      asset: {
        include: {
          sensors: {
            where: { isActive: true },
            select: { id: true, name: true, type: true, lastValue: true, lastValueAt: true, unit: true },
          },
        },
      },
    },
  });
  if (!twin) throw new AppError('Gemelo digital no encontrado', 404);

  const statusData = {
    id: twin.id,
    name: twin.name,
    assetStatus: twin.asset?.status || 'UNKNOWN',
    sensors: (twin.asset?.sensors || []).map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      value: s.lastValue,
      unit: s.unit,
      lastValueAt: s.lastValueAt,
    })),
    lastUpdated: new Date(),
  };
  res.json(statusData);
}

export async function uploadModel(req, res) {
  const twin = await prisma.digitalTwin.findUnique({ where: { id: req.params.id } });
  if (!twin) throw new AppError('Gemelo digital no encontrado', 404);

  if (!req.file) {
    return res.status(400).json({ error: 'Archivo de modelo requerido' });
  }

  const modelUrl = `/uploads/${req.file.filename}`;
  const updated = await prisma.digitalTwin.update({
    where: { id: req.params.id },
    data: { modelUrl },
  });
  res.json(updated);
}
