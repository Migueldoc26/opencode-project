import * as alertService from '../services/alert.service.js';

export async function getActiveAlerts(req, res) {
  const alerts = await alertService.getActiveAlerts(req.user.companyId);
  res.json(alerts);
}

export async function getAlertHistory(req, res) {
  const { page, limit } = req.query;
  const result = await alertService.getAlertHistory(
    parseInt(page) || 1,
    parseInt(limit) || 20,
    req.user.companyId,
  );
  res.json(result);
}

export async function acknowledgeAlert(req, res) {
  const alert = await alertService.acknowledgeAlert(req.params.id, req.user.id, req.user.companyId);
  res.json(alert);
}

export async function resolveAlert(req, res) {
  const alert = await alertService.resolveAlert(req.params.id, req.user.id, req.user.companyId);
  res.json(alert);
}
