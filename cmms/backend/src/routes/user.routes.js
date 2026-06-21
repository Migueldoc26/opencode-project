import { Router } from 'express';
import { auth, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as userController from '../controllers/user.controller.js';

const router = Router();

router.use(auth);
router.use(authorize('ADMIN'));

router.get('/', asyncHandler(userController.listUsers));

export default router;
