import * as assetService from '../services/asset.service.js';

export async function listAssets(req, res) {
  const { page, limit, search, status, areaId, plantId } = req.query;
  const result = await assetService.listAssets({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    search,
    status,
    areaId,
    plantId,
  }, req.user.companyId);
  res.json(result);
}

export async function getAsset(req, res) {
  const asset = await assetService.getAssetById(req.params.id, req.user.companyId);
  res.json(asset);
}

export async function createAsset(req, res) {
  const asset = await assetService.createAsset(req.body, req.user.companyId);
  res.status(201).json(asset);
}

export async function updateAsset(req, res) {
  const asset = await assetService.updateAsset(req.params.id, req.body, req.user.companyId);
  res.json(asset);
}

export async function deleteAsset(req, res) {
  await assetService.deleteAsset(req.params.id, req.user.companyId);
  res.json({ message: 'Activo descomisionado exitosamente' });
}

export async function getAssetSensors(req, res) {
  const sensors = await assetService.getAssetSensors(req.params.id, req.user.companyId);
  res.json(sensors);
}

export async function assignSensor(req, res) {
  const { sensorId } = req.body;
  const sensor = await assetService.assignSensor(req.params.id, sensorId, req.user.companyId);
  res.status(201).json(sensor);
}

export async function getAssetReadings(req, res) {
  const { from, to, limit } = req.query;
  const readings = await assetService.getAssetReadings(req.params.id, {
    from,
    to,
    limit: parseInt(limit) || 100,
  }, req.user.companyId);
  res.json(readings);
}

export async function getAssetMaintenance(req, res) {
  const logs = await assetService.getAssetMaintenance(req.params.id, req.user.companyId);
  res.json(logs);
}
