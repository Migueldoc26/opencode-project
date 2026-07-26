import prisma from './prisma.js'
import { AppError } from '../middleware/errorHandler.js'

export async function createLog({ action, entity, entityId, description, userId, ipAddress, metadata }) {
  return prisma.auditLog.create({
    data: { action, entity, entityId, description, userId, ipAddress, metadata: metadata || undefined },
  })
}

export async function listLogs({ page = 1, limit = 50, search, entity, action, userId, startDate, endDate }) {
  const where = {}
  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { entity: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (entity) where.entity = entity
  if (action) where.action = action
  if (userId) where.userId = userId
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) where.createdAt.lte = new Date(endDate)
  }

  const total = await prisma.auditLog.count({ where })
  const items = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  return { items, total, page, totalPages: Math.ceil(total / limit) }
}

export async function getLog(id) {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  })
  if (!log) throw new AppError('Registro no encontrado', 404)
  return log
}
