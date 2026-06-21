import prisma from '../services/prisma.js';

export async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, avatar: true,
      phone: true, isActive: true, lastLogin: true, createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
  res.json(users);
}
