import { Router } from 'express';
import { auth, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as userController from '../controllers/user.controller.js';

const router = Router();

router.use(auth);
router.use(authorize('ADMIN'));

router.get('/', asyncHandler(userController.listUsers));
router.post('/', asyncHandler(userController.createUser));
router.put('/:id', asyncHandler(userController.updateUser));
router.put('/:id/password', asyncHandler(userController.updateUserPassword));
router.delete('/:id', asyncHandler(userController.removeUser));

export default router;
