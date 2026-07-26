import * as authService from '../services/auth.service.js';
import { createLog } from '../services/auditLog.service.js';

export async function login(req, res) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  createLog({ action: 'LOGIN', entity: 'USER', entityId: result.user.id, description: 'Inicio de sesi\u00f3n', userId: result.user.id, ipAddress: req.ip }).catch(() => {})
  res.json({ token: result.token, user: result.user });
}

export async function register(req, res) {
  const { name, email, password, role } = req.body;
  const result = await authService.register(name, email, password, role);
  res.status(201).json({ token: result.token, user: result.user });
}

export async function me(req, res) {
  const user = await authService.getProfile(req.user.id);
  res.json(user);
}

export async function updateProfile(req, res) {
  const { name, phone, avatar } = req.body;
  const user = await authService.updateProfile(req.user.id, { name, phone, avatar });
  res.json(user);
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword);
  res.json({ message: 'Contraseña actualizada exitosamente' });
}
