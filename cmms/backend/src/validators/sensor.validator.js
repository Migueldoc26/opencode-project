import { z } from 'zod';

const sensorTypes = ['TEMPERATURE', 'VIBRATION', 'PRESSURE', 'FLOW', 'LEVEL',
  'ENERGY_CONSUMPTION', 'OPERATIONAL_STATUS', 'HUMIDITY', 'SPEED', 'CURRENT',
  'VOLTAGE', 'GAS', 'POSITION', 'OTHER'];


export const createSensorSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(200),
  code: z.string().max(100).optional(),
  type: z.enum(sensorTypes).optional().default('TEMPERATURE'),
  mqttTopic: z.string().max(255).optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  minThreshold: z.number().optional().nullable(),
  maxThreshold: z.number().optional().nullable(),
  warningMin: z.number().optional().nullable(),
  warningMax: z.number().optional().nullable(),
  criticalMin: z.number().optional().nullable(),
  criticalMax: z.number().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  samplingRate: z.number().int().positive().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }).optional().nullable(),
  assetId: z.string().uuid('assetId debe ser un UUID válido'),
  componentId: z.string().uuid().optional().nullable(),
});

export const updateSensorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(sensorTypes).optional(),
  mqttTopic: z.string().max(255).optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  minThreshold: z.number().optional().nullable(),
  maxThreshold: z.number().optional().nullable(),
  warningMin: z.number().optional().nullable(),
  warningMax: z.number().optional().nullable(),
  criticalMin: z.number().optional().nullable(),
  criticalMax: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
  samplingRate: z.number().int().positive().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }).optional().nullable(),
});

export const sensorQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(200).optional().default(50),
  assetId: z.string().optional(),
  type: z.enum(sensorTypes).optional(),
  isActive: z.string().optional(),
  search: z.string().optional(),
});
