import dotenv from 'dotenv';

dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cmms',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://emqx:1883',
  MQTT_USERNAME: process.env.MQTT_USERNAME || '',
  MQTT_PASSWORD: process.env.MQTT_PASSWORD || '',
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || 'minio:9000',
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || 'minioadmin',
  MINIO_BUCKET: process.env.MINIO_BUCKET || 'cmms-assets',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://ai-service:8000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.example.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT, 10) || 587,
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || '',
  WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default config;
