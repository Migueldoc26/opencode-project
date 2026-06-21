import winston from 'winston';
import { config } from './index.js';

const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'cmms-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        }),
      ),
    }),
  ],
});

if (config.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  );
  logger.add(
    new winston.transports.File({ filename: 'logs/combined.log' }),
  );
}

export default logger;
