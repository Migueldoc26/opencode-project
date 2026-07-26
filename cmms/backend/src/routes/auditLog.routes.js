import { Router } from 'express';
import { auth, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as auditLogController from '../controllers/auditLog.controller.js';

const router = Router();
router.use(auth);
router.use(authorize('ADMIN'));

router.get('/', asyncHandler(auditLogController.listLogs));
router.get('/:id', asyncHandler(auditLogController.getLog));

export default router;
