import * as kpiService from '../services/kpi.service.js';

export async function getAssetKpis(req, res) {
  const kpis = await kpiService.getAssetKpis(req.params.assetId, req.user.companyId);
  const trends = await kpiService.getKpiTrends(req.params.assetId, req.query.period);
  res.json({ ...kpis, trends });
}

export async function getDashboardKpis(req, res) {
  const kpis = await kpiService.getDashboardKpis(req.user.companyId);
  res.json(kpis);
}

export async function createSnapshot(req, res) {
  const { type, value, metadata } = req.body;
  const snapshot = await kpiService.createSnapshot(req.user.companyId, type, value, metadata);
  res.status(201).json(snapshot);
}

export async function getKpiHistory(req, res) {
  const { type, limit } = req.query;
  const history = await kpiService.getKpiHistory(req.user.companyId, type, parseInt(limit) || 30);
  res.json(history);
}
