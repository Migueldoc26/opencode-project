import prisma from './prisma.js';

export async function calculateMTBF(assetId) {
  const logs = await prisma.maintenanceLog.findMany({
    where: { assetId, type: { in: ['CORRECTIVE', 'BREAKDOWN'] } },
    orderBy: { performedAt: 'asc' },
  });

  if (logs.length < 2) return null;

  const totalDowntime = logs.reduce((sum, log) => sum + (log.durationMin || 0), 0);
  const operatingTime = logs.reduce((sum, log, i) => {
    if (i === 0) return sum;
    const diff = (new Date(log.performedAt) - new Date(logs[i - 1].performedAt)) / (1000 * 60);
    return sum + Math.max(0, diff);
  }, 0);

  const failures = logs.length;
  return failures > 0 ? Math.round(operatingTime / failures) : null;
}

export async function calculateMTTR(assetId) {
  const logs = await prisma.maintenanceLog.findMany({
    where: { assetId, type: { in: ['CORRECTIVE', 'BREAKDOWN'] } },
  });

  if (logs.length === 0) return null;

  const totalRepairTime = logs.reduce((sum, log) => sum + (log.durationMin || 0), 0);
  return Math.round(totalRepairTime / logs.length);
}

export async function calculateAvailability(assetId) {
  const totalTime = 24 * 60;
  const logs = await prisma.maintenanceLog.findMany({
    where: { assetId },
  });

  const totalDowntime = logs.reduce((sum, log) => sum + (log.durationMin || 0), 0);
  const uptime = totalTime - totalDowntime;
  return totalTime > 0 ? Math.round((uptime / totalTime) * 10000) / 100 : 100;
}

export async function calculateOEE(assetId) {
  const availability = await calculateAvailability(assetId);
  const performance = 90;
  const quality = 95;

  const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;
  return Math.round(oee * 100) / 100;
}

export async function getKpiTrends(assetId, period = '7d') {
  const now = new Date();
  let startDate;

  switch (period) {
    case '24h': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
    default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const readings = await prisma.sensorReading.findMany({
    where: {
      sensor: { assetId },
      timestamp: { gte: startDate },
    },
    orderBy: { timestamp: 'asc' },
  });

  const maintenances = await prisma.maintenanceLog.findMany({
    where: {
      assetId,
      performedAt: { gte: startDate },
    },
    orderBy: { performedAt: 'asc' },
  });

  return {
    period,
    readingsCount: readings.length,
    maintenancesCount: maintenances.length,
    averageReadings: readings.length > 0
      ? readings.reduce((s, r) => s + r.value, 0) / readings.length
      : null,
    lastMaintenance: maintenances.length > 0
      ? maintenances[maintenances.length - 1]
      : null,
  };
}

export async function getAssetKpis(assetId) {
  const [mtbf, mttr, availability, oee] = await Promise.all([
    calculateMTBF(assetId),
    calculateMTTR(assetId),
    calculateAvailability(assetId),
    calculateOEE(assetId),
  ]);

  return { mtbf, mttr, availability, oee };
}

export async function getDashboardKpis() {
  const [
    totalAssets,
    activeAlerts,
    pendingWorkOrders,
    inProgressWorkOrders,
    completedToday,
    totalUsers,
  ] = await Promise.all([
    prisma.asset.count({ where: { status: 'OPERATIONAL' } }),
    prisma.alert.count({ where: { status: 'ACTIVE' } }),
    prisma.workOrder.count({ where: { status: 'PENDING' } }),
    prisma.workOrder.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.workOrder.count({
      where: {
        status: 'COMPLETED',
        completionDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  return {
    totalAssets,
    activeAlerts,
    pendingWorkOrders,
    inProgressWorkOrders,
    completedToday,
    totalUsers,
  };
}

export async function createSnapshot(companyId, type, value, metadata = null) {
  return prisma.kpiSnapshot.create({
    data: {
      type,
      value,
      companyId,
      metadata,
      periodStart: new Date(new Date().setHours(0, 0, 0, 0)),
      periodEnd: new Date(),
    },
  });
}

export async function getKpiHistory(companyId, type, limit = 30) {
  return prisma.kpiSnapshot.findMany({
    where: { companyId, ...(type && { type }) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
