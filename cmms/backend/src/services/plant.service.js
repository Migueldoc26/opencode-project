import prisma from './prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listPlants(companyId) {
  return prisma.plant.findMany({
    where: { companyId },
    include: { _count: { select: { areas: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createPlant(body, companyId) {
  return prisma.plant.create({
    data: { ...body, companyId },
  });
}

export async function getPlant(id, companyId) {
  const plant = await prisma.plant.findFirst({
    where: { id, companyId },
    include: {
      areas: {
        include: { _count: { select: { assets: true } } },
        orderBy: { name: 'asc' },
      },
    },
  });
  if (!plant) throw new AppError('Planta no encontrada', 404);
  return plant;
}

export async function updatePlant(id, body, companyId) {
  const plant = await prisma.plant.findFirst({ where: { id, companyId } });
  if (!plant) throw new AppError('Planta no encontrada', 404);
  return prisma.plant.update({ where: { id }, data: body });
}

export async function deletePlant(id, companyId) {
  const plant = await prisma.plant.findFirst({ where: { id, companyId } });
  if (!plant) throw new AppError('Planta no encontrada', 404);
  await prisma.plant.update({ where: { id }, data: { isActive: false } });
}

export async function getPlantAreas(id, companyId) {
  const plant = await prisma.plant.findFirst({ where: { id, companyId } });
  if (!plant) throw new AppError('Planta no encontrada', 404);
  return prisma.area.findMany({
    where: { plantId: id },
    include: { _count: { select: { assets: true, inspections: true } } },
    orderBy: { name: 'asc' },
  });
}
