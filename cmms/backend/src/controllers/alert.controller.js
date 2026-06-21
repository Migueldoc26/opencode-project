import * as alertService from '../services/alert.service.js';

export async function getActiveAlerts(req, res) {
  const alerts = await alertService.getActiveAlerts();
  res.json(alerts);
}

export async function getAlertHistory(req, res) {
  const { page, limit } = req.query;
  const result = await alertService.getAlertHistory(
    parseInt(page) || 1,
    parseInt(limit) || 20,
  );
  res.json(result);
}

export async function acknowledgeAlert(req, res) {
  const alert = await alertService.acknowledgeAlert(req.params.id, req.user.id);
  res.json(alert);
}

export async function resolveAlert(req, res) {
  const alert = await alertService.resolveAlert(req.params.id, req.user.id);
  res.json(alert);
}
