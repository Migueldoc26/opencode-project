import prisma from '../services/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listPlants(req, res) {
  const plants = await prisma.plant.findMany({
    include: { _count: { select: { areas: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(plants);
}

export async function createPlant(req, res) {
  const plant = await prisma.plant.create({ data: req.body });
  res.status(201).json(plant);
}

export async function getPlant(req, res) {
  const plant = await prisma.plant.findUnique({
    where: { id: req.params.id },
    include: {
      areas: {
        include: { _count: { select: { assets: true } } },
        orderBy: { name: 'asc' },
      },
    },
  });
  if (!plant) throw new AppError('Planta no encontrada', 404);
  res.json(plant);
}

export async function updatePlant(req, res) {
  const plant = await prisma.plant.findUnique({ where: { id: req.params.id } });
  if (!plant) throw new AppError('Planta no encontrada', 404);
  const updated = await prisma.plant.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
}

export async function deletePlant(req, res) {
  const plant = await prisma.plant.findUnique({ where: { id: req.params.id } });
  if (!plant) throw new AppError('Planta no encontrada', 404);
  await prisma.plant.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'Planta desactivada exitosamente' });
}

export async function getPlantAreas(req, res) {
  const plant = await prisma.plant.findUnique({ where: { id: req.params.id } });
  if (!plant) throw new AppError('Planta no encontrada', 404);
  const areas = await prisma.area.findMany({
    where: { plantId: req.params.id },
    include: { _count: { select: { assets: true, inspections: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(areas);
}
