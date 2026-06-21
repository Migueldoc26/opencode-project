import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as workOrderController from '../controllers/workorder.controller.js';

const router = Router();

router.use(auth);

router.get('/', asyncHandler(workOrderController.listWorkOrders));
router.get('/stats', asyncHandler(workOrderController.getWorkOrderStats));
router.get('/:id', asyncHandler(workOrderController.getWorkOrder));
router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Título requerido'),
    validate,
  ],
  asyncHandler(workOrderController.createWorkOrder),
);
router.put('/:id', asyncHandler(workOrderController.updateWorkOrder));
router.put(
  '/:id/status',
  [
    body('status').isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).withMessage('Estado inválido'),
    validate,
  ],
  asyncHandler(workOrderController.changeWorkOrderStatus),
);
router.delete('/:id', asyncHandler(workOrderController.deleteWorkOrder));

export default router;
