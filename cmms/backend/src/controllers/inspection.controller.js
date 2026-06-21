import * as inspectionService from '../services/inspection.service.js';

export async function listInspections(req, res) {
  const { page, limit, status, areaId } = req.query;
  const result = await inspectionService.listInspections({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status,
    areaId,
  });
  res.json(result);
}

export async function getInspection(req, res) {
  const inspection = await inspectionService.getInspectionById(req.params.id);
  res.json(inspection);
}

export async function createInspection(req, res) {
  const inspection = await inspectionService.createInspection(req.body);
  res.status(201).json(inspection);
}

export async function updateInspection(req, res) {
  const inspection = await inspectionService.updateInspection(req.params.id, req.body);
  res.json(inspection);
}

export async function completeInspection(req, res) {
  const { results } = req.body;
  const inspection = await inspectionService.completeInspection(req.params.id, results);
  res.json(inspection);
}

export async function addAnomaly(req, res) {
  const anomaly = await inspectionService.addAnomaly(req.params.id, req.body);
  res.status(201).json(anomaly);
}

export async function addMedia(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Archivo requerido' });
  }
  const media = await inspectionService.addMedia(req.params.id, req.file, req.body.description);
  res.status(201).json(media);
}

export async function createChecklist(req, res) {
  const checklist = await inspectionService.createChecklist(req.body);
  res.status(201).json(checklist);
}

export async function listChecklists(req, res) {
  const checklists = await inspectionService.listChecklists();
  res.json(checklists);
}
