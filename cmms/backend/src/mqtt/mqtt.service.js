import mqtt from 'mqtt';
import { config } from '../config/index.js';
import logger from '../config/logger.js';
import prisma from '../services/prisma.js';
import { evaluateAlert } from '../services/alert.service.js';

let client = null;
let connected = false;

export function getMqttClient() {
  return client;
}

export function isMqttConnected() {
  return connected;
}

export async function startMqttClient() {
  if (client) {
    logger.warn('Cliente MQTT ya iniciado');
    return;
  }

  const options = {
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 5000,
    will: {
      topic: 'cmms/status',
      payload: JSON.stringify({ service: 'backend', status: 'offline' }),
      qos: 1,
      retain: true,
    },
  };

  if (config.MQTT_USERNAME) {
    options.username = config.MQTT_USERNAME;
    options.password = config.MQTT_PASSWORD;
  }

  logger.info(`Conectando a MQTT broker: ${config.MQTT_BROKER_URL}`);

  try {
    client = mqtt.connect(config.MQTT_BROKER_URL, options);

    client.on('connect', () => {
      connected = true;
      logger.info('MQTT conectado exitosamente');

      client.publish('cmms/status', JSON.stringify({ service: 'backend', status: 'online' }), {
        qos: 1,
        retain: true,
      });

      subscribeToTopics();
    });

    client.on('message', async (topic, payload) => {
      try {
        await handleMessage(topic, payload);
      } catch (error) {
        logger.error(`Error procesando mensaje MQTT [${topic}]:`, error);
      }
    });

    client.on('error', (error) => {
      logger.error('Error MQTT:', error);
    });

    client.on('close', () => {
      connected = false;
      logger.warn('Conexión MQTT cerrada');
    });

    client.on('offline', () => {
      connected = false;
      logger.warn('Cliente MQTT offline');
    });

    client.on('reconnect', () => {
      logger.info('Reconectando MQTT...');
    });
  } catch (error) {
    logger.error('Error iniciando cliente MQTT:', error);
    connected = false;
  }
}

function subscribeToTopics() {
  const topics = [
    'cmms/sensors/#',
    'cmms/commands/#',
    'cmms/alerts/#',
  ];

  topics.forEach((topic) => {
    client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`Error suscribiendo a ${topic}:`, err);
      } else {
        logger.info(`Suscrito a: ${topic}`);
      }
    });
  });
}

async function handleMessage(topic, payload) {
  const message = payload.toString();
  logger.debug(`MQTT mensaje recibido [${topic}]: ${message.substring(0, 200)}`);

  if (topic.startsWith('cmms/sensors/')) {
    const parts = topic.split('/');
    const sensorCode = parts[2];

    if (!sensorCode) return;

    let data;
    try {
      data = JSON.parse(message);
    } catch {
      data = { value: parseFloat(message) };
    }

    const value = data.value;
    if (value === undefined || value === null || isNaN(value)) {
      logger.warn(`Valor inválido de sensor ${sensorCode}: ${message}`);
      return;
    }

    const sensor = await prisma.sensor.findUnique({
      where: { code: sensorCode },
      include: { asset: true },
    });

    if (!sensor || !sensor.isActive) {
      logger.warn(`Sensor no encontrado o inactivo: ${sensorCode}`);
      return;
    }

    const reading = await prisma.sensorReading.create({
      data: {
        sensorId: sensor.id,
        value,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    });

    await prisma.sensor.update({
      where: { id: sensor.id },
      data: { lastValue: value, lastValueAt: new Date() },
    });

    await evaluateAlert(sensor, reading);

    const { getIO } = await import('../websocket/ws.service.js');
    const io = getIO();
    if (io) {
      io.to(`sensor:${sensor.id}`).emit('sensor:reading', {
        sensorId: sensor.id,
        sensorCode: sensor.code,
        value,
        unit: sensor.unit,
        timestamp: reading.timestamp,
      });

      if (sensor.assetId) {
        io.to(`asset:${sensor.assetId}`).emit('asset:reading', {
          assetId: sensor.assetId,
          sensorId: sensor.id,
          sensorCode: sensor.code,
          value,
          timestamp: reading.timestamp,
        });
      }
    }
  }
}

export async function stopMqttClient() {
  if (client) {
    client.publish('cmms/status', JSON.stringify({ service: 'backend', status: 'offline' }), {
      qos: 1,
      retain: true,
    });
    client.end(true);
    client = null;
    connected = false;
    logger.info('Cliente MQTT detenido');
  }
}

export function publish(topic, data) {
  if (!client || !connected) {
    logger.warn('No se puede publicar MQTT: cliente no conectado');
    return false;
  }

  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  client.publish(topic, payload, { qos: 1 });
  return true;
}
