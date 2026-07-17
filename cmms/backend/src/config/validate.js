const INSECURE_DEFAULTS = [
  'dev-secret-change-in-production',
  'cmms_super_secret_jwt_key_change_in_production_2024',
  'cmms_jwt_secret',
];

function isDefaultOrMissing(value) {
  return !value || INSECURE_DEFAULTS.includes(value);
}

export function validateConfig(config) {
  const errors = [];

  if (isDefaultOrMissing(config.JWT_SECRET)) {
    errors.push('JWT_SECRET no está configurado o tiene un valor por defecto');
  }

  if (!config.FRONTEND_URL) {
    errors.push('FRONTEND_URL es obligatorio para configurar CORS');
  }

  if (config.NODE_ENV === 'production') {
    if (!config.DATABASE_URL) {
      errors.push('DATABASE_URL es obligatorio en producción');
    }
    if (!config.MINIO_ACCESS_KEY || !config.MINIO_SECRET_KEY) {
      errors.push('MINIO_ACCESS_KEY y MINIO_SECRET_KEY son obligatorios en producción');
    }
  }

  return errors;
}
