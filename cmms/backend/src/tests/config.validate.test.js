import { describe, it, expect } from 'vitest';
import { validateConfig } from '../config/validate.js';

const validConfig = {
  JWT_SECRET: 'a-real-secret-that-is-long-enough-for-hs256',
  FRONTEND_URL: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/cmms',
  MINIO_ACCESS_KEY: 'minio-user',
  MINIO_SECRET_KEY: 'minio-secret',
  NODE_ENV: 'production',
};

describe('validateConfig', () => {
  it('returns no errors for a valid production config', () => {
    const errors = validateConfig(validConfig);
    expect(errors).toEqual([]);
  });

  it('returns error when JWT_SECRET is missing', () => {
    const errors = validateConfig({ ...validConfig, JWT_SECRET: '' });
    expect(errors).toContainEqual(expect.stringContaining('JWT_SECRET'));
  });

  it('returns error when JWT_SECRET is a known insecure default', () => {
    const defaults = [
      'dev-secret-change-in-production',
      'cmms_super_secret_jwt_key_change_in_production_2024',
      'cmms_jwt_secret',
    ];
    for (const def of defaults) {
      const errors = validateConfig({ ...validConfig, JWT_SECRET: def });
      expect(errors).toContainEqual(expect.stringContaining('JWT_SECRET'));
    }
  });

  it('returns error when FRONTEND_URL is missing', () => {
    const errors = validateConfig({ ...validConfig, FRONTEND_URL: '' });
    expect(errors).toContainEqual(expect.stringContaining('FRONTEND_URL'));
  });

  it('returns error when DATABASE_URL is missing in production', () => {
    const errors = validateConfig({ ...validConfig, NODE_ENV: 'production', DATABASE_URL: '' });
    expect(errors).toContainEqual(expect.stringContaining('DATABASE_URL'));
  });

  it('does NOT require DATABASE_URL in development', () => {
    const errors = validateConfig({ ...validConfig, NODE_ENV: 'development', DATABASE_URL: '' });
    expect(errors.find(e => e.includes('DATABASE_URL'))).toBeUndefined();
  });

  it('returns error when MINIO credentials are missing in production', () => {
    const errors = validateConfig({ ...validConfig, MINIO_ACCESS_KEY: '', MINIO_SECRET_KEY: '' });
    expect(errors).toContainEqual(expect.stringContaining('MINIO'));
  });

  it('does NOT require MINIO credentials in development', () => {
    const errors = validateConfig({ ...validConfig, NODE_ENV: 'development', MINIO_ACCESS_KEY: '', MINIO_SECRET_KEY: '' });
    expect(errors.find(e => e.includes('MINIO'))).toBeUndefined();
  });

  it('allows development config with a short default JWT_SECRET', () => {
    const devConfig = {
      JWT_SECRET: 'dev-secret-change-in-production',
      FRONTEND_URL: 'http://localhost:5173',
      DATABASE_URL: '',
      NODE_ENV: 'development',
    };
    const errors = validateConfig(devConfig);
    expect(errors).toContainEqual(expect.stringContaining('JWT_SECRET'));
  });
});
