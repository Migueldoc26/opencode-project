import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadSingle } from '../middleware/upload.js';
import * as digitalTwinController from '../controllers/digitalTwin.controller.js';

const router = Router();

router.use(auth);

router.get('/', asyncHandler(digitalTwinController.listDigitalTwins));
router.get('/:id', asyncHandler(digitalTwinController.getDigitalTwin));
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Nombre requerido'),
    validate,
  ],
  asyncHandler(digitalTwinController.createDigitalTwin),
);
router.put('/:id', asyncHandler(digitalTwinController.updateDigitalTwin));
router.delete('/:id', asyncHandler(digitalTwinController.deleteDigitalTwin));
router.get('/:id/status', asyncHandler(digitalTwinController.getDigitalTwinStatus));
router.post('/:id/upload-model', uploadSingle('model'), asyncHandler(digitalTwinController.uploadModel));

export default router;
