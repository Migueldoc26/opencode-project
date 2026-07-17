import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config/index.js';
import { validateConfig } from './config/validate.js';
import logger from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupWebSocket } from './websocket/ws.service.js';
import { startMqttClient } from './mqtt/mqtt.service.js';
import { setSocketIO } from './services/notification.service.js';

import authRoutes from './routes/auth.routes.js';
import assetRoutes from './routes/asset.routes.js';
import sensorRoutes from './routes/sensor.routes.js';
import workOrderRoutes from './routes/workorder.routes.js';
import alertRoutes from './routes/alert.routes.js';
import inspectionRoutes from './routes/inspection.routes.js';
import kpiRoutes from './routes/kpi.routes.js';
import plantRoutes from './routes/plant.routes.js';
import digitalTwinRoutes from './routes/digitalTwin.routes.js';
import userRoutes from './routes/user.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const validationErrors = validateConfig(config);
if (validationErrors.length > 0) {
  if (config.NODE_ENV === 'production') {
    logger.error('Error de configuración crítica:');
    validationErrors.forEach((e) => logger.error(`  - ${e}`));
    logger.error('La aplicación no puede iniciar. Corrige las variables de entorno.');
    process.exit(1);
  } else {
    logger.warn('Problemas de configuración (el servidor continuará):');
    validationErrors.forEach((e) => logger.warn(`  - ${e}`));
  }
}

const app = express();
const server = http.createServer(app);

const corsOrigins = config.FRONTEND_URL ? config.FRONTEND_URL.split(',').map((s) => s.trim()) : [];
if (corsOrigins.length === 0 && config.NODE_ENV === 'development') {
  corsOrigins.push('http://localhost:5173');
}
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : false, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticación. Intente nuevamente en 15 minutos.' },
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intente nuevamente en 15 minutos' },
});
app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);

app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    ...(config.NODE_ENV !== 'production' && {
      service: 'cmms-backend',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      databaseUrlConfigured: Boolean(config.DATABASE_URL),
      mqttBrokerConfigured: Boolean(config.MQTT_BROKER_URL),
      minioConfigured: Boolean(config.MINIO_ENDPOINT),
    }),
  });
});

app.get('/api/settings', (_req, res) => {
  const base = { service: 'cmms-backend', status: 'running', environment: config.NODE_ENV };
  res.json({
    ...base,
    ...(config.NODE_ENV !== 'production' && {
      uptime: process.uptime(),
      version: '1.0.0',
      features: {
        mqtt: Boolean(config.MQTT_BROKER_URL),
        websocket: true,
        ai: Boolean(config.AI_SERVICE_URL),
        minio: Boolean(config.MINIO_ENDPOINT),
        email: Boolean(config.EMAIL_USER && config.EMAIL_PASS),
        whatsapp: Boolean(config.WHATSAPP_TOKEN),
        telegram: Boolean(config.TELEGRAM_BOT_TOKEN),
      },
    }),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/digital-twins', digitalTwinRoutes);
app.use('/api/users', userRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.use(errorHandler);

const io = setupWebSocket(server);
setSocketIO(io);

startMqttClient().catch((err) => {
  logger.error('Error iniciando MQTT:', err);
});

server.listen(config.PORT, '0.0.0.0', () => {
  logger.info(`CMMS Backend iniciado en puerto ${config.PORT} (${config.NODE_ENV})`);
});

export { app, server, io };
