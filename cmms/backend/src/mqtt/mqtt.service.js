import mqtt from 'mqtt';
import config from '../config/index.js';
import logger from '../config/logger.js';
import prisma from '../services/prisma.js';
import { alertService } from '../services/alert.service.js';
import { wsService } from '../websocket/ws.service.js';

class MqttService {
  constructor() {
    this.client = null;
    this.brokers = new Map();
    this.topics = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 0;
    this.reconnectDelay = 5000;
    this._reconnecting = false;
  }

  async connect() {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }

    const options = {
      clientId: `cmms-backend-${Date.now()}`,
      clean: true,
      connectTimeout: 10000,
    };

    if (config.MQTT_USERNAME) options.username = config.MQTT_USERNAME;
    if (config.MQTT_PASSWORD) options.password = config.MQTT_PASSWORD;

    let settled = false;
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(config.MQTT_BROKER_URL, options);

      const timeout = setTimeout(() => {
        if (!settled) { settled = true; reject(new Error('MQTT connection timeout')); }
      }, 10000);

      this.client.on('connect', () => {
        clearTimeout(timeout);
        if (settled) return;
        settled = true;
        this._reconnecting = false;
        this.reconnectAttempts = 0;
        this.brokers.set('default', { connected: true, url: config.MQTT_BROKER_URL });
        logger.info('MQTT conectado a ' + config.MQTT_BROKER_URL);

        ['cmms/sensors/#', 'cmms/commands/#', 'cmms/alerts/#', 'controlmc/esp32/+/sensores'].forEach(
          (topic) => this.topics.set(topic, null)
        );

        this.subscribePending();
        resolve();
      });

      this.client.on('message', (topic, payload) => {
        this.handleMessage(topic, payload);
      });

      this.client.on('error', (err) => {
        if (!settled) { settled = true; clearTimeout(timeout); reject(err); }
        else { logger.warn(`MQTT error: ${err.message}`); }
      });

      this.client.on('close', () => {
        logger.warn('MQTT conexión cerrada');
        this.brokers.delete('default');
        if (!settled) { settled = true; reject(new Error('MQTT connection closed')); }
        this.scheduleReconnect();
      });

      this.client.on('offline', () => {
        logger.warn('MQTT offline');
        this.brokers.delete('default');
        if (!settled) { settled = true; reject(new Error('MQTT offline')); }
        this.scheduleReconnect();
      });
    });
  }

  scheduleReconnect() {
    if (this._reconnecting) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn('MQTT: Máximo de reintentos alcanzado');
      return;
    }
    this._reconnecting = true;
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    logger.info(`MQTT: Reintentando conexión en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    setTimeout(() => {
      this.connect().catch((err) => {
        logger.warn(`MQTT reconnect failed: ${err.message}`);
      });
    }, delay);
  }

  subscribe(topic) {
    this.topics.set(topic, true);
    if (this.client?.connected) {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) logger.error(`Error suscribiendo a ${topic}: ${err.message}`);
        else logger.info(`MQTT suscrito a ${topic}`);
      });
    }
  }

  subscribePending() {
    for (const topic of this.topics.keys()) {
      if (this.client?.connected) {
        this.client.subscribe(topic, { qos: 1 }, (err) => {
          if (err) logger.error('Error suscribiendo a ' + topic + ': ' + err.message);
          else logger.info('MQTT suscrito a ' + topic);
        });
      }
    }
  }

  ensureSensorSubscribed(sensor) {
    if (sensor.mqttTopic) {
      this.subscribe(sensor.mqttTopic);
    }
    return Promise.resolve();
  }

  unsubscribeSensor(sensor) {
    if (sensor.mqttTopic && this.client?.connected) {
      this.client.unsubscribe(sensor.mqttTopic, (err) => {
        if (err) logger.error(`Error desuscribiendo ${sensor.mqttTopic}: ${err.message}`);
      });
    }
    return Promise.resolve();
  }

  handleMessage(topic, payload) {
    try {
      const data = JSON.parse(payload.toString());

      if (topic.startsWith('controlmc/esp32/') && topic.endsWith('/sensores')) {
        const deviceId = topic.split('/')[2];
        if (!deviceId) return;
      }

      wsService.emitRawMqtt(topic, data);

      this.processSensorData(topic, data);
    } catch (err) {
      logger.error('Error procesando mensaje MQTT [' + topic + ']: ' + err.message);
    }
  }

  async processSensorData(topic, data) {
    try {
      if (topic.startsWith('controlmc/esp32/') && topic.endsWith('/sensores')) {
        const parts = topic.split('/');
        const deviceId = parts[2];
        if (!deviceId || data.device_id !== deviceId) return;

        const metricMap = [
          { key: 'temperature_c', type: 'TEMPERATURE', unit: '°C', label: 'Temperatura' },
          { key: 'humidity_percent', type: 'HUMIDITY', unit: '%', label: 'Humedad' },
          { key: 'gas_raw', type: 'GAS', unit: 'raw', label: 'Gas' },
          { key: 'distance_cm', type: 'LEVEL', unit: 'cm', label: 'Distancia' },
        ]

        for (const metric of metricMap) {
          if (data[metric.key] === undefined) continue
          const sensorCode = deviceId + '_' + metric.key
          const value = parseFloat(data[metric.key])
          if (isNaN(value)) continue

          let sensor = await prisma.sensor.findUnique({ where: { code: sensorCode } })
          if (!sensor) {
            const asset = await prisma.asset.findFirst({
              where: { code: { startsWith: 'ESP32' }, companyId: { not: null } },
              orderBy: { createdAt: 'asc' },
            })
            sensor = await prisma.sensor.create({
              data: {
                code: sensorCode,
                name: deviceId + ' - ' + metric.label,
                type: metric.type,
                unit: metric.unit,
                isActive: true,
                mqttTopic: topic,
                assetId: asset?.id || null,
              },
            })
            logger.info('Sensor auto-creado: ' + sensorCode + ' asset=' + (asset?.id || 'ninguno'))
          } else if (!sensor.isActive) {
            continue
          }

          const ts = data.ts ? new Date(data.ts) : new Date()
          const reading = await prisma.sensorReading.create({
            data: { sensorId: sensor.id, value, timestamp: ts },
          })

          await prisma.sensor.update({
            where: { id: sensor.id },
            data: { lastValue: value, lastValueAt: new Date() },
          })

          wsService.emitSensorReading(sensor.id, reading)

          if (sensor.alertConfigs) {
            for (const ac of sensor.alertConfigs) {
              if (!ac.enabled) continue
              await alertService.evaluateAlert(ac, value, sensor)
            }
          }
        }
        return
      }

      if (data && typeof data === 'object' && data.value === undefined) {
        const sensors = await prisma.sensor.findMany({
          where: { mqttTopic: topic, isActive: true },
          include: { alertConfigs: true },
        });

        for (const sensor of sensors) {
          const jsonKey = sensor.metadata?.jsonKey;
          const key = jsonKey && data[jsonKey] !== undefined
            ? jsonKey
            : Object.keys(data).find((k) => k.toLowerCase() === String(sensor.code || '').split('-').pop()?.toLowerCase());
          if (!key || data[key] === undefined) continue;

          const value = parseFloat(data[key]);
          if (isNaN(value)) continue;

          const reading = await prisma.sensorReading.create({
            data: { sensorId: sensor.id, value, timestamp: data.timestamp ? new Date(data.timestamp) : new Date() },
          });

          await prisma.sensor.update({
            where: { id: sensor.id },
            data: { lastValue: value, lastValueAt: new Date() },
          });

          wsService.emitSensorReading(sensor.id, reading);

          for (const ac of sensor.alertConfigs) {
            if (!ac.enabled) continue;
            await alertService.evaluateAlert(ac, value, sensor);
          }
        }
        return;
      }

      const sensorCode = topic.split('/').pop();
      if (!sensorCode || data.value === undefined) return;

      const sensor = await prisma.sensor.findUnique({
        where: { code: sensorCode },
        include: { alertConfigs: true },
      });
      if (!sensor || !sensor.isActive) return;

      const value = parseFloat(data.value);
      if (isNaN(value)) return;

      const reading = await prisma.sensorReading.create({
        data: { sensorId: sensor.id, value, timestamp: data.timestamp ? new Date(data.timestamp) : new Date() },
      });

      await prisma.sensor.update({
        where: { id: sensor.id },
        data: { lastValue: value, lastValueAt: new Date() },
      });

      wsService.emitSensorReading(sensor.id, reading);

      for (const ac of sensor.alertConfigs) {
        if (!ac.enabled) continue;
        await alertService.evaluateAlert(ac, value, sensor);
      }
    } catch (err) {
      logger.error(`Error en processSensorData: ${err.message}`);
    }
  }

  publish(topic, data, options = {}) {
    if (!this.client?.connected) return false;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.client.publish(topic, payload, { qos: 1, retain: false, ...options });
    try { wsService.emitRawMqtt(topic, typeof data === 'string' ? JSON.parse(data) : data) } catch {}
    try { this.processSensorData(topic, typeof data === 'string' ? JSON.parse(data) : data) } catch {}
    return true;
  }

  isConnected() {
    return this.client?.connected || false;
  }

  async disconnect() {
    this.brokers.clear();
    if (this.client) {
      await new Promise((resolve) => { this.client.end(true, resolve); });
      logger.info('MQTT desconectado');
    }
  }
}

export const mqttService = new MqttService();
