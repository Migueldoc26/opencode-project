import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as sensorController from '../controllers/sensor.controller.js';

const router = Router();

router.use(auth);

router.get('/', asyncHandler(sensorController.listSensors));
router.get('/:id', asyncHandler(sensorController.getSensor));
router.get('/:id/readings', asyncHandler(sensorController.getSensorReadings));
router.put('/:id', asyncHandler(sensorController.updateSensor));
router.delete('/:id', asyncHandler(sensorController.deleteSensor));
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

export default router;
