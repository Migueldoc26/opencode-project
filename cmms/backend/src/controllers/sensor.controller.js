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
