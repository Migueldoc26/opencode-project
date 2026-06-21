import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as assetController from '../controllers/asset.controller.js';

const router = Router();

router.use(auth);

router.get('/', asyncHandler(assetController.listAssets));
router.get('/:id', asyncHandler(assetController.getAsset));
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Nombre requerido'),
    body('code').notEmpty().withMessage('Código requerido'),
    validate,
  ],
  asyncHandler(assetController.createAsset),
);
router.put('/:id', asyncHandler(assetController.updateAsset));
router.delete('/:id', asyncHandler(assetController.deleteAsset));
router.get('/:id/sensors', asyncHandler(assetController.getAssetSensors));
router.post('/:id/sensors', asyncHandler(assetController.assignSensor));
router.get('/:id/readings', asyncHandler(assetController.getAssetReadings));
router.get('/:id/maintenance', asyncHandler(assetController.getAssetMaintenance));

export default router;
