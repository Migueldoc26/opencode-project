import logger from '../config/logger.js';

export function errorHandler(err, req, res, _next) {
  logger.error('Error:', { message: err.message, stack: err.stack, path: req.path, method: req.method });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Error de validación', details: err.errors });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'El registro ya existe', details: err.meta });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    return res.status(400).json({ error: 'Error de base de datos', code: err.code });
  }

  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Archivo demasiado grande' });
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
