import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as kpiController from '../controllers/kpi.controller.js';

const router = Router();

router.use(auth);

router.get('/assets/:assetId', asyncHandler(kpiController.getAssetKpis));
router.get('/dashboard', asyncHandler(kpiController.getDashboardKpis));
router.post('/snapshot', asyncHandler(kpiController.createSnapshot));
router.get('/history', asyncHandler(kpiController.getKpiHistory));

export default router;
