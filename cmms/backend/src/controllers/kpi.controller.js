import * as kpiService from '../services/kpi.service.js';
import prisma from '../services/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getAssetKpis(req, res) {
  const kpis = await kpiService.getAssetKpis(req.params.assetId);
  const trends = await kpiService.getKpiTrends(req.params.assetId, req.query.period);
  res.json({ ...kpis, trends });
}

export async function getDashboardKpis(req, res) {
  const kpis = await kpiService.getDashboardKpis();
  res.json(kpis);
}

export async function createSnapshot(req, res) {
  const { type, value, metadata } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new AppError('Usuario no encontrado', 404);
  const snapshot = await kpiService.createSnapshot(user.companyId, type, value, metadata);
  res.status(201).json(snapshot);
}

export async function getKpiHistory(req, res) {
  const { type, limit } = req.query;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new AppError('Usuario no encontrado', 404);
  const history = await kpiService.getKpiHistory(user.companyId, type, parseInt(limit) || 30);
  res.json(history);
}
