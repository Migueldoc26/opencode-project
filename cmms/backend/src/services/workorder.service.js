import prisma from './prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const validTransitions = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'PENDING'],
  COMPLETED: [],
  CANCELLED: ['PENDING'],
};

export async function listWorkOrders({ page = 1, limit = 20, status, priority, assetId, assignedToId }) {
  const where = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assetId) where.assetId = assetId;
  if (assignedToId) where.assignedToId = assignedToId;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        asset: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { activities: true, spareParts: true } },
      },
    }),
    prisma.workOrder.count({ where }),
  ]);
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getWorkOrderStats() {
  const [pending, inProgress, completed, cancelled] = await Promise.all([
    prisma.workOrder.count({ where: { status: 'PENDING' } }),
    prisma.workOrder.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.workOrder.count({ where: { status: 'COMPLETED' } }),
    prisma.workOrder.count({ where: { status: 'CANCELLED' } }),
  ]);
  const total = pending + inProgress + completed + cancelled;
  return { total, pending, inProgress, completed, cancelled };
}

export async function getWorkOrderById(id) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      asset: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      activities: { orderBy: { orderIndex: 'asc' } },
      spareParts: {
        include: { sparePart: { select: { id: true, name: true, code: true, unitPrice: true } } },
      },
      inspection: { select: { id: true, title: true, status: true } },
    },
  });
  if (!workOrder) throw new AppError('Orden de trabajo no encontrada', 404);
  return workOrder;
}

export async function createWorkOrder(data, userId) {
  const code = await generateWorkOrderCode();
  return prisma.workOrder.create({
    data: {
      code,
      title: data.title,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      status: 'PENDING',
      estimatedHours: data.estimatedHours,
      costEstimate: data.costEstimate,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      assetId: data.assetId,
      assignedToId: data.assignedToId,
      createdById: userId,
      inspectionId: data.inspectionId,
      failureCode: data.failureCode,
      metadata: data.metadata,
    },
    include: {
      asset: { select: { id: true, name: true, code: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

async function generateWorkOrderCode() {
  const count = await prisma.workOrder.count();
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(5, '0');
  return `OT-${year}-${seq}`;
}

export async function updateWorkOrder(id, data) {
  const workOrder = await prisma.workOrder.findUnique({ where: { id } });
  if (!workOrder) throw new AppError('Orden de trabajo no encontrada', 404);

  const updateData = { ...data };
  if (data.scheduledDate) updateData.scheduledDate = new Date(data.scheduledDate);
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.completionDate) updateData.completionDate = new Date(data.completionDate);

  return prisma.workOrder.update({ where: { id }, data: updateData });
}

export async function changeWorkOrderStatus(id, newStatus, userId) {
  const workOrder = await prisma.workOrder.findUnique({ where: { id } });
  if (!workOrder) throw new AppError('Orden de trabajo no encontrada', 404);

  const allowed = validTransitions[workOrder.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Transición inválida: ${workOrder.status} -> ${newStatus}. Permitidas: ${allowed.join(', ')}`,
      400,
    );
  }

  const updateData = { status: newStatus };

  if (newStatus === 'IN_PROGRESS' && !workOrder.startDate) {
    updateData.startDate = new Date();
  }

  if (newStatus === 'COMPLETED') {
    updateData.completionDate = new Date();
    if (!workOrder.actualHours && workOrder.estimatedHours) {
      const start = workOrder.startDate || new Date();
      updateData.actualHours = Math.round((Date.now() - new Date(start).getTime()) / 3600000 * 10) / 10;
    }
  }

  return prisma.workOrder.update({ where: { id }, data: updateData });
}

export async function deleteWorkOrder(id) {
  const workOrder = await prisma.workOrder.findUnique({ where: { id } });
  if (!workOrder) throw new AppError('Orden de trabajo no encontrada', 404);
  return prisma.workOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
}
