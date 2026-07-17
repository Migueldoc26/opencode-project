import * as digitalTwinService from '../services/digitalTwin.service.js';

export async function listDigitalTwins(req, res) {
  const twins = await digitalTwinService.listDigitalTwins(req.user.companyId);
  res.json(twins);
}

export async function getDigitalTwin(req, res) {
  const twin = await digitalTwinService.getDigitalTwin(req.params.id, req.user.companyId);
  res.json(twin);
}

export async function createDigitalTwin(req, res) {
  const twin = await digitalTwinService.createDigitalTwin(req.body, req.user.companyId);
  res.status(201).json(twin);
}

export async function updateDigitalTwin(req, res) {
  const twin = await digitalTwinService.updateDigitalTwin(req.params.id, req.body, req.user.companyId);
  res.json(twin);
}

export async function deleteDigitalTwin(req, res) {
  await digitalTwinService.deleteDigitalTwin(req.params.id, req.user.companyId);
  res.json({ message: 'Gemelo digital eliminado exitosamente' });
}

export async function getDigitalTwinStatus(req, res) {
  const status = await digitalTwinService.getDigitalTwinStatus(req.params.id, req.user.companyId);
  res.json(status);
}

export async function uploadModel(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Archivo de modelo requerido' });
  }
  const twin = await digitalTwinService.uploadModel(req.params.id, req.file.filename, req.user.companyId);
  res.json(twin);
}
