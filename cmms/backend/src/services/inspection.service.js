import prisma from './prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listInspections({ page = 1, limit = 20, status, areaId }, companyId) {
  const where = { area: { plant: { companyId } } };
  if (status) where.status = status;
  if (areaId) where.areaId = areaId;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        area: { select: { id: true, name: true } },
        conductedBy: { select: { id: true, name: true } },
        checklist: { select: { id: true, name: true } },
        _count: { select: { anomalies: true, media: true } },
      },
    }),
    prisma.inspection.count({ where }),
  ]);
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getInspectionById(id, companyId) {
  const inspection = await prisma.inspection.findFirst({
    where: { id, area: { plant: { companyId } } },
    include: {
      area: true,
      conductedBy: { select: { id: true, name: true, email: true } },
      checklist: {
        include: {
          items: { orderBy: { orderIndex: 'asc' } },
        },
      },
      itemResults: {
        include: { checklistItem: true },
      },
      media: { orderBy: { uploadedAt: 'desc' } },
      anomalies: { orderBy: { createdAt: 'desc' } },
      workOrders: true,
    },
  });
  if (!inspection) throw new AppError('Inspección no encontrada', 404);
  return inspection;
}

export async function createInspection(data, companyId) {
  if (data.areaId) {
    const area = await prisma.area.findFirst({
      where: { id: data.areaId, plant: { companyId } },
    });
    if (!area) throw new AppError('Área no encontrada', 404);
  }
  return prisma.inspection.create({
    data: {
      title: data.title,
      status: data.status || 'SCHEDULED',
      observationMode: data.observationMode || 'VISUAL',
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      notes: data.notes,
      areaId: data.areaId,
      conductedById: data.conductedById,
      checklistId: data.checklistId,
    },
  });
}

export async function updateInspection(id, data, companyId) {
  const inspection = await prisma.inspection.findFirst({ where: { id, area: { plant: { companyId } } } });
  if (!inspection) throw new AppError('Inspección no encontrada', 404);
  return prisma.inspection.update({ where: { id }, data });
}

export async function completeInspection(id, results, companyId) {
  const inspection = await prisma.inspection.findFirst({ where: { id, area: { plant: { companyId } } } });
  if (!inspection) throw new AppError('Inspección no encontrada', 404);

  if (results && results.length > 0) {
    for (const item of results) {
      await prisma.inspectionChecklistItem.upsert({
        where: {
          id: item.id || 'none',
        },
        update: {
          value: item.value,
          observation: item.observation,
          imageUrl: item.imageUrl,
        },
        create: {
          inspectionId: id,
          checklistItemId: item.checklistItemId,
          value: item.value,
          observation: item.observation,
          imageUrl: item.imageUrl,
        },
      });
    }
  }

  return prisma.inspection.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}

export async function addAnomaly(inspectionId, data, companyId) {
  const inspection = await prisma.inspection.findFirst({ where: { id: inspectionId, area: { plant: { companyId } } } });
  if (!inspection) throw new AppError('Inspección no encontrada', 404);

  return prisma.inspectionAnomaly.create({
    data: {
      inspectionId,
      type: data.type,
      description: data.description,
      severity: data.severity || 'MEDIUM',
      imageUrl: data.imageUrl,
      aiDetected: data.aiDetected || false,
      confidence: data.confidence,
      location: data.location,
      status: 'OPEN',
    },
  });
}

export async function addMedia(inspectionId, file, description, companyId) {
  const inspection = await prisma.inspection.findFirst({ where: { id: inspectionId, area: { plant: { companyId } } } });
  if (!inspection) throw new AppError('Inspección no encontrada', 404);

  const type = file.mimetype?.startsWith('video') ? 'VIDEO' : 'IMAGE';

  return prisma.inspectionMedia.create({
    data: {
      inspectionId,
      type,
      url: `/uploads/${file.filename}`,
      description,
    },
  });
}

export async function createChecklist(data) {
  const { items, ...checklistData } = data;
  return prisma.checklist.create({
    data: {
      ...checklistData,
      items: {
        create: items.map((item, index) => ({
          label: item.label,
          type: item.type || 'boolean',
          required: item.required ?? true,
          orderIndex: item.orderIndex ?? index,
          options: item.options,
        })),
      },
    },
    include: { items: { orderBy: { orderIndex: 'asc' } } },
  });
}

export async function listChecklists() {
  return prisma.checklist.findMany({
    include: { items: { orderBy: { orderIndex: 'asc' } } },
    orderBy: { name: 'asc' },
  });
}
