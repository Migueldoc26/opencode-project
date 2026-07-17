import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
};

vi.mock('../services/prisma.js', () => ({ default: mockPrisma }));

const mockBcrypt = { hash: vi.fn(), compare: vi.fn() };
vi.mock('bcryptjs', () => ({ default: mockBcrypt }));

const mockJwt = { sign: vi.fn(), verify: vi.fn() };
vi.mock('jsonwebtoken', () => ({ default: mockJwt }));

vi.mock('../config/index.js', () => ({
  default: { JWT_SECRET: 'test-secret', jwt: { secret: 'test-secret' } },
  config: { JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '24h' },
}));

const { login, register, getProfile, updateProfile, changePassword } = await import('../services/auth.service.js');

const mockUser = {
  id: 'user-001',
  name: 'Miguel',
  email: 'miguel@test.cl',
  password: '$2a$12$hashedpassword',
  role: 'ADMIN',
  avatar: null,
  phone: null,
  isActive: true,
  lastLogin: null,
  createdAt: new Date('2025-01-01'),
};

describe('login', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns token and user for valid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockJwt.sign.mockReturnValue('jwt-token-123');
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, lastLogin: new Date() });

    const result = await login('miguel@test.cl', 'correct-password');

    expect(result).toHaveProperty('token', 'jwt-token-123');
    expect(result).toHaveProperty('user');
    expect(result.user).not.toHaveProperty('password');
    expect(result.user.id).toBe('user-001');
    expect(result.user.name).toBe('Miguel');
    expect(result.user.email).toBe('miguel@test.cl');
    expect(result.user.role).toBe('ADMIN');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-001' }, data: { lastLogin: expect.any(Date) } })
    );
  });

  it('throws 401 when user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(login('wrong@test.cl', 'any')).rejects.toMatchObject({
      message: 'Credenciales inválidas',
      statusCode: 401,
    });
  });

  it('throws 401 when user is inactive', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

    await expect(login('inactive@test.cl', 'any')).rejects.toMatchObject({
      message: 'Credenciales inválidas',
      statusCode: 401,
    });
  });

  it('throws 401 when password is wrong', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(login('miguel@test.cl', 'wrong-password')).rejects.toMatchObject({
      message: 'Credenciales inválidas',
      statusCode: 401,
    });
  });
});

describe('register', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates user and returns token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue('$2a$12$newhash');
    mockPrisma.user.create.mockResolvedValue({ id: 'user-002', name: 'Nuevo', email: 'nuevo@test.cl', role: 'TECNICO', password: '$2a$12$newhash' });
    mockJwt.sign.mockReturnValue('jwt-token-456');

    const result = await register('Nuevo', 'nuevo@test.cl', 'password123');

    expect(result).toHaveProperty('token', 'jwt-token-456');
    expect(result.user.name).toBe('Nuevo');
    expect(result.user.email).toBe('nuevo@test.cl');
    expect(result.user.role).toBe('TECNICO');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Nuevo', email: 'nuevo@test.cl', role: 'TECNICO',
        }),
      })
    );
  });

  it('accepts custom role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue('$2a$12$hash');
    mockPrisma.user.create.mockResolvedValue({ ...mockUser, role: 'SUPERVISOR' });
    mockJwt.sign.mockReturnValue('token');

    const result = await register('Sup', 'sup@test.cl', 'pass', 'SUPERVISOR');
    expect(result.user.role).toBe('SUPERVISOR');
  });

  it('throws 409 when email already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    await expect(register('Dup', 'miguel@test.cl', 'pass')).rejects.toMatchObject({
      message: 'El email ya está registrado',
      statusCode: 409,
    });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});

describe('getProfile', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns full user profile', async () => {
    const profileData = (({ id, name, email, role, avatar, phone, isActive, lastLogin, createdAt }) =>
      ({ id, name, email, role, avatar, phone, isActive, lastLogin, createdAt }))(mockUser);
    mockPrisma.user.findUnique.mockResolvedValue(profileData);

    const result = await getProfile('user-001');

    expect(result.id).toBe('user-001');
    expect(result.name).toBe('Miguel');
    expect(result.isActive).toBe(true);
    expect(result).not.toHaveProperty('password');
  });

  it('throws 404 when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(getProfile('nonexistent')).rejects.toMatchObject({
      message: 'Usuario no encontrado',
      statusCode: 404,
    });
  });
});

describe('updateProfile', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates provided fields', async () => {
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, name: 'Updated', phone: '+56911111111' });

    const result = await updateProfile('user-001', { name: 'Updated', phone: '+56911111111' });

    expect(result.name).toBe('Updated');
    expect(result.phone).toBe('+56911111111');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-001' }, data: { name: 'Updated', phone: '+56911111111' } })
    );
  });

  it('ignores undefined fields', async () => {
    mockPrisma.user.update.mockResolvedValue(mockUser);

    await updateProfile('user-001', { name: undefined, phone: undefined, avatar: undefined });

    const callData = mockPrisma.user.update.mock.calls[0][0].data;
    expect(callData).toEqual({});
  });

  it('throws 404 when user not found (Prisma P2025)', async () => {
    const prismaErr = new Error('Record not found');
    prismaErr.name = 'PrismaClientKnownRequestError';
    prismaErr.code = 'P2025';
    mockPrisma.user.update.mockRejectedValue(prismaErr);

    await expect(updateProfile('nonexistent', { name: 'X' })).rejects.toMatchObject({
      message: 'Usuario no encontrado',
      statusCode: 404,
    });
  });
});

describe('changePassword', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates password when current is correct', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.hash.mockResolvedValue('$2a$12$newhash');
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, password: '$2a$12$newhash' });

    await changePassword('user-001', 'correct-current', 'new-password');

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-001' }, data: { password: '$2a$12$newhash' } })
    );
  });

  it('throws 401 when current password is wrong', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(changePassword('user-001', 'wrong-current', 'new-pass')).rejects.toMatchObject({
      message: 'Contraseña actual incorrecta',
      statusCode: 401,
    });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('throws 404 when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(changePassword('nonexistent', 'any', 'any')).rejects.toMatchObject({
      message: 'Usuario no encontrado',
      statusCode: 404,
    });
  });
});
