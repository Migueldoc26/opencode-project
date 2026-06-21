import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadSingle } from '../middleware/upload.js';
import * as inspectionController from '../controllers/inspection.controller.js';

const router = Router();

router.use(auth);

router.get('/', asyncHandler(inspectionController.listInspections));
router.get('/:id', asyncHandler(inspectionController.getInspection));
router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Título requerido'),
    validate,
  ],
  asyncHandler(inspectionController.createInspection),
);
router.put('/:id', asyncHandler(inspectionController.updateInspection));
router.put('/:id/complete', asyncHandler(inspectionController.completeInspection));

router.post(
  '/checklists',
  [
    body('name').notEmpty().withMessage('Nombre requerido'),
    body('items').isArray({ min: 1 }).withMessage('Al menos un item requerido'),
    validate,
  ],
  asyncHandler(inspectionController.createChecklist),
);
router.get('/checklists', asyncHandler(inspectionController.listChecklists));

router.post(
  '/:id/anomalies',
  [
    body('type').notEmpty().withMessage('Tipo de anomalía requerido'),
    validate,
  ],
  asyncHandler(inspectionController.addAnomaly),
);

router.post('/:id/media', uploadSingle('file'), asyncHandler(inspectionController.addMedia));

export default router;
