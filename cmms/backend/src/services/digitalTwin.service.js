import prisma from './prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listDigitalTwins(companyId) {
  return prisma.digitalTwin.findMany({
    where: { asset: { companyId } },
    include: {
      asset: { select: { id: true, name: true, code: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getDigitalTwin(id, companyId) {
  const twin = await prisma.digitalTwin.findFirst({
    where: { id, asset: { companyId } },
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
  return twin;
}

export async function createDigitalTwin(body, companyId) {
  if (body.assetId) {
    const asset = await prisma.asset.findFirst({ where: { id: body.assetId, companyId } });
    if (!asset) throw new AppError('Activo no encontrado', 404);
  }
  return prisma.digitalTwin.create({
    data: body,
    include: { asset: { select: { id: true, name: true, code: true } } },
  });
}

export async function updateDigitalTwin(id, body, companyId) {
  const twin = await prisma.digitalTwin.findFirst({ where: { id, asset: { companyId } } });
  if (!twin) throw new AppError('Gemelo digital no encontrado', 404);
  return prisma.digitalTwin.update({
    where: { id },
    data: body,
  });
}

export async function deleteDigitalTwin(id, companyId) {
  const twin = await prisma.digitalTwin.findFirst({ where: { id, asset: { companyId } } });
  if (!twin) throw new AppError('Gemelo digital no encontrado', 404);
  await prisma.digitalTwin.delete({ where: { id } });
}

export async function getDigitalTwinStatus(id, companyId) {
  const twin = await prisma.digitalTwin.findFirst({
    where: { id, asset: { companyId } },
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

  return {
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
}

export async function uploadModel(id, filename, companyId) {
  const twin = await prisma.digitalTwin.findFirst({ where: { id, asset: { companyId } } });
  if (!twin) throw new AppError('Gemelo digital no encontrado', 404);

  return prisma.digitalTwin.update({
    where: { id },
    data: { modelUrl: `/uploads/${filename}` },
  });
}
