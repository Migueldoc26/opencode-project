import bcryptjs from 'bcryptjs';
import prisma from '../services/prisma.js';

export async function listUsers(req, res) {
  const showInactive = req.query.inactive === 'true';
  const users = await prisma.user.findMany({
    where: showInactive ? {} : { isActive: true },
    select: {
      id: true, name: true, email: true, role: true, avatar: true,
      phone: true, isActive: true, lastLogin: true, createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
  res.json(users);
}

export async function createUser(req, res) {
  const { name, email, password, role, phone } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'El email ya está registrado' });
  }
  const hashed = await bcryptjs.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || 'TECNICO', phone },
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
  });
  res.status(201).json(user);
}

export async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, role, phone, isActive } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;
  if (phone !== undefined) data.phone = phone;
  if (isActive !== undefined) data.isActive = isActive;
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    throw err;
  }
}

export async function updateUserPassword(req, res) {
  const { id } = req.params;
  const { password } = req.body;
  const hashed = await bcryptjs.hash(password, 12);
  try {
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    throw err;
  }
}

export async function removeUser(req, res) {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    if (err.code === 'P2003' || err.code === 'P2014') {
      await prisma.user.update({ where: { id }, data: { isActive: false } });
      return res.json({ message: 'Usuario desactivado (tiene registros asociados)' });
    }
    throw err;
  }
}
