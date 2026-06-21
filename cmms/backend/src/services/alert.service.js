import prisma from './prisma.js';
import logger from '../config/logger.js';
import { sendNotification } from './notification.service.js';

const cooldownCache = new Map();

export async function evaluateAlert(sensor, reading) {
  const alertConfigs = await prisma.alertConfig.findMany({
    where: { sensorId: sensor.id, enabled: true },
  });

  for (const config of alertConfigs) {
    const triggered = checkThreshold(config, reading.value);
    if (!triggered) continue;

    const cooldownKey = `${config.id}:${sensor.id}`;
    const lastTriggered = cooldownCache.get(cooldownKey);
    const now = Date.now();

    if (lastTriggered && (now - lastTriggered) < config.cooldownMin * 60 * 1000) {
      logger.debug(`Alerta ${config.name} en cooldown para sensor ${sensor.code}`);
      continue;
    }

    cooldownCache.set(cooldownKey, now);

    const alert = await prisma.alert.create({
      data: {
        message: `${config.name}: ${sensor.name} registró ${reading.value}${sensor.unit || ''} (umbral: ${config.threshold})`,
        severity: config.severity,
        status: 'ACTIVE',
        value: reading.value,
        alertConfigId: config.id,
        sensorId: sensor.id,
        assetId: sensor.assetId,
      },
    });

    logger.warn(`Alerta creada: ${alert.message}`);

    if (config.notifyApp || config.notifyEmail || config.notifyWhatsApp || config.notifyTelegram) {
      const channels = [];
      if (config.notifyApp) channels.push('app');
      if (config.notifyEmail) channels.push('email');
      if (config.notifyWhatsApp) channels.push('whatsapp');
      if (config.notifyTelegram) channels.push('telegram');

      for (const channel of channels) {
        sendNotification(channel, alert.message, null, alert.id).catch((err) => {
          logger.error(`Error enviando notificación ${channel}:`, err);
        });
      }
    }

    return alert;
  }

  return null;
}

function checkThreshold(config, value) {
  if (config.threshold === null || config.threshold === undefined) return false;

  switch (config.condition) {
    case 'GT':
    case 'GREATER_THAN':
      return value > config.threshold;
    case 'LT':
    case 'LESS_THAN':
      return value < config.threshold;
    case 'GTE':
    case 'GREATER_THAN_OR_EQUAL':
      return value >= config.threshold;
    case 'LTE':
    case 'LESS_THAN_OR_EQUAL':
      return value <= config.threshold;
    case 'EQ':
    case 'EQUAL':
      return Math.abs(value - config.threshold) < 0.001;
    case 'RANGE':
      return config.min !== undefined && config.max !== undefined
        ? value < config.min || value > config.max
        : false;
    default:
      return value > config.threshold;
  }
}

export async function getActiveAlerts() {
  return prisma.alert.findMany({
    where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
    include: {
      sensor: { select: { id: true, name: true, code: true, unit: true } },
      asset: { select: { id: true, name: true, code: true } },
      alertConfig: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAlertHistory(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sensor: { select: { id: true, name: true, code: true, unit: true } },
        asset: { select: { id: true, name: true, code: true } },
        alertConfig: { select: { id: true, name: true } },
        acknowledgedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.alert.count(),
  ]);
  return { data: alerts, total, page, totalPages: Math.ceil(total / limit) };
}

export async function acknowledgeAlert(id, userId) {
  const alert = await prisma.alert.update({
    where: { id },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
      acknowledgedById: userId,
    },
  });
  return alert;
}

export async function resolveAlert(id, userId) {
  const alert = await prisma.alert.update({
    where: { id },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedById: userId,
    },
  });
  return alert;
}
