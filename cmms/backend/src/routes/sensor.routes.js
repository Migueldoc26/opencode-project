import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as sensorController from '../controllers/sensor.controller.js';
import { createSensorSchema, updateSensorSchema } from '../validators/sensor.validator.js';

const router = Router();

router.use(auth);

router.get('/', asyncHandler(sensorController.listSensors));

router.get('/available-types', asyncHandler((_req, res) => {
  res.json({
    success: true,
    data: [
      { value: 'TEMPERATURE', label: 'Temperatura', unit: '°C', icon: 'Thermometer' },
      { value: 'VIBRATION', label: 'Vibración', unit: 'mm/s', icon: 'Activity' },
      { value: 'PRESSURE', label: 'Presión', unit: 'bar', icon: 'Gauge' },
      { value: 'FLOW', label: 'Flujo', unit: 'L/min', icon: 'Droplets' },
      { value: 'LEVEL', label: 'Nivel', unit: '%', icon: 'Droplets' },
      { value: 'ENERGY_CONSUMPTION', label: 'Consumo Energético', unit: 'kWh', icon: 'Zap' },
      { value: 'OPERATIONAL_STATUS', label: 'Estado Operacional', unit: '', icon: 'Power' },
      { value: 'HUMIDITY', label: 'Humedad', unit: '%', icon: 'Droplets' },
      { value: 'SPEED', label: 'Velocidad', unit: 'RPM', icon: 'Activity' },
      { value: 'CURRENT', label: 'Corriente', unit: 'A', icon: 'Zap' },
      { value: 'VOLTAGE', label: 'Voltaje', unit: 'V', icon: 'Zap' },
    ],
  });
}));

router.get('/:id', asyncHandler(sensorController.getSensor));

router.get('/:id/readings', asyncHandler(sensorController.getSensorReadings));

router.post('/',
  (req, _res, next) => {
    const result = createSensorSchema.safeParse(req.body);
    if (!result.success) {
      return _res.status(400).json({
        success: false,
        error: { message: 'Datos inválidos', details: result.error.errors },
      });
    }
    req.body = result.data;
    next();
  },
  asyncHandler(sensorController.createSensor),
);

router.put('/:id',
  (req, _res, next) => {
    const result = updateSensorSchema.safeParse(req.body);
    if (!result.success) {
      return _res.status(400).json({
        success: false,
        error: { message: 'Datos inválidos', details: result.error.errors },
      });
    }
    req.body = result.data;
    next();
  },
  asyncHandler(sensorController.updateSensor),
);

router.put(
  '/:id/position',
  [
    body('x').isNumeric().withMessage('x debe ser numérico'),
    body('y').isNumeric().withMessage('y debe ser numérico'),
    body('z').isNumeric().withMessage('z debe ser numérico'),
    validate,
  ],
  asyncHandler(sensorController.saveSensorPosition),
);

router.delete('/:id/position', asyncHandler(sensorController.deleteSensorPosition));

router.delete('/:id', asyncHandler(sensorController.deleteSensor));

export default router;
