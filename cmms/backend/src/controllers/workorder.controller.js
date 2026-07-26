import * as workOrderService from '../services/workorder.service.js';
import { createLog } from '../services/auditLog.service.js';

export async function listWorkOrders(req, res) {
  const { page, limit, status, priority, assetId, assignedToId } = req.query;
  const result = await workOrderService.listWorkOrders({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status,
    priority,
    assetId,
    assignedToId,
  }, req.user.companyId);
  res.json(result);
}

export async function getWorkOrderStats(req, res) {
  const stats = await workOrderService.getWorkOrderStats(req.user.companyId);
  res.json(stats);
}

export async function getWorkOrder(req, res) {
  const workOrder = await workOrderService.getWorkOrderById(req.params.id, req.user.companyId);
  res.json(workOrder);
}

export async function createWorkOrder(req, res) {
  const workOrder = await workOrderService.createWorkOrder(req.body, req.user.id, req.user.companyId);
  createLog({ action: 'CREATE', entity: 'WORK_ORDER', entityId: workOrder.id, description: 'OT creada: ' + (workOrder.title || ''), userId: req.user.id, ipAddress: req.ip }).catch(() => {})
  res.status(201).json(workOrder);
}

export async function updateWorkOrder(req, res) {
  const workOrder = await workOrderService.updateWorkOrder(req.params.id, req.body, req.user.companyId);
  createLog({ action: 'UPDATE', entity: 'WORK_ORDER', entityId: workOrder.id, description: 'OT actualizada: ' + (workOrder.title || ''), userId: req.user.id, ipAddress: req.ip }).catch(() => {})
  res.json(workOrder);
}

export async function changeWorkOrderStatus(req, res) {
  const { status } = req.body;
  const workOrder = await workOrderService.changeWorkOrderStatus(req.params.id, status, req.user.id, req.user.companyId);
  createLog({ action: 'STATUS_CHANGE', entity: 'WORK_ORDER', entityId: workOrder.id, description: 'OT cambio a ' + status + ': ' + (workOrder.title || ''), userId: req.user.id, ipAddress: req.ip }).catch(() => {})
  res.json(workOrder);
}

export async function deleteWorkOrder(req, res) {
  await workOrderService.deleteWorkOrder(req.params.id, req.user.companyId);
  createLog({ action: 'DELETE', entity: 'WORK_ORDER', entityId: req.params.id, description: 'OT cancelada', userId: req.user.id, ipAddress: req.ip }).catch(() => {})
  res.json({ message: 'Orden de trabajo cancelada exitosamente' });
}
