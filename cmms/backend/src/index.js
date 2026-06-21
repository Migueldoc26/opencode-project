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

const app = express();
const server = http.createServer(app);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: config.FRONTEND_URL || true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intente nuevamente en 15 minutos' },
});
app.use('/api', limiter);

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
    service: 'cmms-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    databaseUrlConfigured: Boolean(config.DATABASE_URL),
    mqttBrokerConfigured: Boolean(config.MQTT_BROKER_URL),
    minioConfigured: Boolean(config.MINIO_ENDPOINT),
    aiServiceUrl: config.AI_SERVICE_URL,
    environment: config.NODE_ENV,
  });
});

app.get('/api/settings', (_req, res) => {
  res.json({
    service: 'cmms-backend',
    status: 'running',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    features: {
      mqtt: Boolean(config.MQTT_BROKER_URL),
      websocket: true,
      ai: Boolean(config.AI_SERVICE_URL),
      minio: Boolean(config.MINIO_ENDPOINT),
      email: Boolean(config.EMAIL_USER && config.EMAIL_PASS),
      whatsapp: Boolean(config.WHATSAPP_TOKEN),
      telegram: Boolean(config.TELEGRAM_BOT_TOKEN),
    },
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
