import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import prisma from './prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function login(email, password) {
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

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email,
            role: user.role, avatar: user.avatar, phone: user.phone },
  };
}

export async function register(name, email, password, role) {
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

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, avatar: true,
             phone: true, isActive: true, lastLogin: true, createdAt: true },
  });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return user;
}

export async function updateProfile(userId, updates) {
  const data = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.phone !== undefined) data.phone = updates.phone;
  if (updates.avatar !== undefined) data.avatar = updates.avatar;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true, avatar: true, phone: true },
    });
    return user;
  } catch (err) {
    if (err.name === 'PrismaClientKnownRequestError' && err.code === 'P2025') {
      throw new AppError('Usuario no encontrado', 404);
    }
    throw err;
  }
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const valid = await bcryptjs.compare(currentPassword, user.password);
  if (!valid) {
    throw new AppError('Contraseña actual incorrecta', 401);
  }

  const hashedPassword = await bcryptjs.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
}
