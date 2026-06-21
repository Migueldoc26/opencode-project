import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
    validate,
  ],
  asyncHandler(authController.login),
);

router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Nombre requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
    validate,
  ],
  asyncHandler(authController.register),
);

router.get('/me', auth, asyncHandler(authController.me));

router.put(
  '/profile',
  auth,
  asyncHandler(authController.updateProfile),
);

router.put(
  '/change-password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
    validate,
  ],
  asyncHandler(authController.changePassword),
);

export default router;
