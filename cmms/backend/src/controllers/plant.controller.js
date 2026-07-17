import * as plantService from '../services/plant.service.js';

export async function listPlants(req, res) {
  const plants = await plantService.listPlants(req.user.companyId);
  res.json(plants);
}

export async function createPlant(req, res) {
  const plant = await plantService.createPlant(req.body, req.user.companyId);
  res.status(201).json(plant);
}

export async function getPlant(req, res) {
  const plant = await plantService.getPlant(req.params.id, req.user.companyId);
  res.json(plant);
}

export async function updatePlant(req, res) {
  const plant = await plantService.updatePlant(req.params.id, req.body, req.user.companyId);
  res.json(plant);
}

export async function deletePlant(req, res) {
  await plantService.deletePlant(req.params.id, req.user.companyId);
  res.json({ message: 'Planta desactivada exitosamente' });
}

export async function getPlantAreas(req, res) {
  const areas = await plantService.getPlantAreas(req.params.id, req.user.companyId);
  res.json(areas);
}
