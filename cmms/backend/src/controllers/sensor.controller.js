import * as sensorService from '../services/sensor.service.js';
import { mqttService } from '../mqtt/mqtt.service.js';

export async function listSensors(req, res) {
  const result = await sensorService.listSensors(req.query, req.user.companyId);
  res.json({ success: true, ...result });
}

export async function getSensor(req, res) {
  const sensor = await sensorService.getSensorById(req.params.id, req.user.companyId);
  if (!sensor) {
    return res.status(404).json({ success: false, error: { message: 'Sensor no encontrado' } });
  }
  const isOnline = sensor.lastValueAt && (Date.now() - new Date(sensor.lastValueAt).getTime()) < 300000;
  res.json({ success: true, data: { ...sensor, status: isOnline ? 'ONLINE' : 'OFFLINE' } });
}

export async function getSensorReadings(req, res) {
  const readings = await sensorService.getSensorReadings(req.params.id, req.query, req.user.companyId);
  res.json({ success: true, data: readings });
}

export async function createSensor(req, res) {
  const created = await sensorService.createSensor(req.body, req.user.companyId);

  if (created.mqttTopic) {
    mqttService.ensureSensorSubscribed(created).catch(() => {});
  }

  res.status(201).json({ success: true, data: { ...created, status: 'OFFLINE' } });
}

export async function updateSensor(req, res) {
  const updated = await sensorService.updateSensor(req.params.id, req.body, req.user.companyId);

  const topicChanged = req.body.mqttTopic !== undefined &&
    updated.mqttTopic !== req.body.mqttTopic;

  if (topicChanged) {
    if (req.body.mqttTopic) mqttService.unsubscribeSensor({ mqttTopic: req.body.mqttTopic }).catch(() => {});
    if (updated.mqttTopic && updated.isActive) mqttService.ensureSensorSubscribed(updated).catch(() => {});
  }

  res.json({ success: true, data: updated });
}

export async function deleteSensor(req, res) {
  await sensorService.deleteSensor(req.params.id, req.user.companyId);
  res.json({ success: true, message: 'Sensor desactivado exitosamente' });
}

export async function saveSensorPosition(req, res) {
  const { x, y, z } = req.body;
  const updated = await sensorService.saveSensorPosition(req.params.id, { x, y, z }, req.user.companyId);
  res.json({ success: true, data: { id: updated.id, position: updated.position } });
}

export async function deleteSensorPosition(req, res) {
  const updated = await sensorService.deleteSensorPosition(req.params.id, req.user.companyId);
  res.json({ success: true, data: { id: updated.id, position: null } });
}

export async function setManualValue(req, res) {
  const { code, value } = req.body;
  if (!code || value === undefined || value === null) {
    return res.status(400).json({ success: false, error: { message: 'Se requiere code y value' } });
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    return res.status(400).json({ success: false, error: { message: 'value debe ser numérico' } });
  }
  const result = await sensorService.setManualValue(code, parsed, req.user.companyId);
  res.json({ success: true, data: { sensor: { id: result.sensor.id, code: result.sensor.code, name: result.sensor.name, lastValue: result.sensor.lastValue }, reading: result.reading } });
}

export async function testMqttPublish(req, res) {
  const { sensorId, value, topic, payload: customPayload } = req.body
  if (!topic && !sensorId) {
    return res.status(400).json({ success: false, error: { message: 'Se requiere sensorId o topic' } })
  }

  const rawPayload = customPayload || {
    value: value || Math.round(Math.random() * 100),
    timestamp: new Date().toISOString(),
    sensorId: sensorId || 'test',
  }
  const payloadStr = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload)

  let mqttTopic = topic
  if (sensorId) {
    const sensor = await sensorService.getSensorById(sensorId, req.user.companyId)
    if (!sensor) {
      return res.status(404).json({ success: false, error: { message: 'Sensor no encontrado' } })
    }
    mqttTopic = sensor.mqttTopic || ('cmms/sensors/' + sensor.code)
  }

  try {
    await mqttService.publish(mqttTopic, payloadStr)
    res.json({ success: true, message: 'Mensaje MQTT publicado', topic: mqttTopic, payload: payloadStr })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Error publicando MQTT: ' + (err.message || '') } })
  }
}
