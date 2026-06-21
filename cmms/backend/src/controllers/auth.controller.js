import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import prisma from '../services/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new AppError('Credenciales inválidas', 401);
  }

  const valid = await bcryptjs.compare(password, user.password);
  if (!valid) {
    throw new AppError('Credenciales inválidas', 401);
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN },
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
    },
  });
}

export async function register(req, res) {
  const { name, email, password, role } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('El email ya está registrado', 409);
  }

  const hashedPassword = await bcryptjs.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: role || 'TECNICO' },
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN },
  );

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, name: true, email: true, role: true, avatar: true,
      phone: true, isActive: true, lastLogin: true, createdAt: true,
    },
  });
  if (!user) throw new AppError('Usuario no encontrado', 404);
  res.json(user);
}

export async function updateProfile(req, res) {
  const { name, phone, avatar } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (avatar !== undefined) data.avatar = avatar;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: { id: true, name: true, email: true, role: true, avatar: true, phone: true },
  });
  res.json(user);
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new AppError('Usuario no encontrado', 404);

  const valid = await bcryptjs.compare(currentPassword, user.password);
  if (!valid) {
    throw new AppError('Contraseña actual incorrecta', 401);
  }

  const hashedPassword = await bcryptjs.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

  res.json({ message: 'Contraseña actualizada exitosamente' });
}
