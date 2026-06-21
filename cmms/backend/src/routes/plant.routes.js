import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as plantController from '../controllers/plant.controller.js';

const router = Router();

router.use(auth);

router.get('/', asyncHandler(plantController.listPlants));
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Nombre requerido'),
    body('code').notEmpty().withMessage('Código requerido'),
    validate,
  ],
  asyncHandler(plantController.createPlant),
);
router.get('/:id', asyncHandler(plantController.getPlant));
router.put('/:id', asyncHandler(plantController.updatePlant));
router.delete('/:id', asyncHandler(plantController.deletePlant));
router.get('/:id/areas', asyncHandler(plantController.getPlantAreas));

export default router;
