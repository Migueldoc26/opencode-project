import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as alertController from '../controllers/alert.controller.js';

const router = Router();

router.use(auth);

router.get('/active', asyncHandler(alertController.getActiveAlerts));
router.get('/history', asyncHandler(alertController.getAlertHistory));
router.put('/:id/acknowledge', asyncHandler(alertController.acknowledgeAlert));
router.put('/:id/resolve', asyncHandler(alertController.resolveAlert));

export default router;
