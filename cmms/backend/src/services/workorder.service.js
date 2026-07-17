import prisma from './prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const validTransitions = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'PENDING'],
  COMPLETED: [],
  CANCELLED: ['PENDING'],
};

export async function listWorkOrders({ page = 1, limit = 20, status, priority, assetId, assignedToId }, companyId) {
  const where = { asset: { companyId } };
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

export async function getWorkOrderStats(companyId) {
  const baseWhere = { asset: { companyId } };
  const [pending, inProgress, completed, cancelled] = await Promise.all([
    prisma.workOrder.count({ where: { ...baseWhere, status: 'PENDING' } }),
    prisma.workOrder.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
    prisma.workOrder.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
    prisma.workOrder.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
  ]);
  const total = pending + inProgress + completed + cancelled;
  return { total, pending, inProgress, completed, cancelled };
}

export async function getWorkOrderById(id, companyId) {
  const workOrder = await prisma.workOrder.findFirst({
    where: { id, asset: { companyId } },
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

export async function createWorkOrder(data, userId, companyId) {
  if (data.assetId) {
    const asset = await prisma.asset.findFirst({ where: { id: data.assetId, companyId } });
    if (!asset) throw new AppError('Activo no encontrado', 404);
  }
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

export async function updateWorkOrder(id, data, companyId) {
  const workOrder = await prisma.workOrder.findFirst({ where: { id, asset: { companyId } } });
  if (!workOrder) throw new AppError('Orden de trabajo no encontrada', 404);

  const updateData = { ...data };
  if (data.scheduledDate) updateData.scheduledDate = new Date(data.scheduledDate);
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.completionDate) updateData.completionDate = new Date(data.completionDate);

  return prisma.workOrder.update({ where: { id }, data: updateData });
}

export async function changeWorkOrderStatus(id, newStatus, userId, companyId) {
  const workOrder = await prisma.workOrder.findFirst({ where: { id, asset: { companyId } } });
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

export async function deleteWorkOrder(id, companyId) {
  const workOrder = await prisma.workOrder.findFirst({ where: { id, asset: { companyId } } });
  if (!workOrder) throw new AppError('Orden de trabajo no encontrada', 404);
  return prisma.workOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
}
