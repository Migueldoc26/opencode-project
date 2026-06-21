import { validationResult } from 'express-validator';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    return res.status(400).json({ error: 'Error de validación', details: formatted });
  }
  next();
}
