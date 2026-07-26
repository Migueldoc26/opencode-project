import prisma from './prisma.js';
import { AppError } from '../middleware/errorHandler.js';

async function findAccessibleTwin(id, companyId) {
  const twin = await prisma.digitalTwin.findUnique({ where: { id }, include: { asset: true } });
  if (!twin) throw new AppError('Gemelo digital no encontrado', 404);
  if (twin.asset && twin.asset.companyId !== companyId) throw new AppError('Gemelo digital no encontrado', 404);
  return twin;
}

export async function listDigitalTwins(companyId) {
  return prisma.digitalTwin.findMany({
    where: { OR: [{ asset: { companyId } }, { assetId: null }] },
    include: {
      asset: { select: { id: true, name: true, code: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getDigitalTwin(id, companyId) {
  const twin = await findAccessibleTwin(id, companyId);
  const full = await prisma.digitalTwin.findUnique({
    where: { id },
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
  return full || twin;
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
  await findAccessibleTwin(id, companyId);
  return prisma.digitalTwin.update({
    where: { id },
    data: body,
  });
}

export async function deleteDigitalTwin(id, companyId) {
  await findAccessibleTwin(id, companyId);
  await prisma.digitalTwin.delete({ where: { id } });
}

export async function getDigitalTwinStatus(id, companyId) {
  const twin = await findAccessibleTwin(id, companyId);
  const full = await prisma.digitalTwin.findUnique({
    where: { id },
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

  return {
    id: twin.id,
    name: twin.name,
    assetStatus: full?.asset?.status || 'UNKNOWN',
    sensors: (full?.asset?.sensors || []).map((s) => ({
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
  await findAccessibleTwin(id, companyId);
  return prisma.digitalTwin.update({
    where: { id },
    data: { modelUrl: `/uploads/${filename}` },
  });
}
