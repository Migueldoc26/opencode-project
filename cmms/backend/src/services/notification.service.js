import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import logger from '../config/logger.js';
import prisma from './prisma.js';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: config.EMAIL_PORT === 465,
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

let io = null;

export function setSocketIO(socketIO) {
  io = socketIO;
}

export async function sendNotification(channel, message, userId, alertId) {
  try {
    const notification = await prisma.notification.create({
      data: {
        channel,
        message,
        userId,
        alertId,
        delivered: false,
      },
    });

    switch (channel) {
      case 'app':
        await sendAppNotification(notification, userId);
        break;
      case 'email':
        await sendEmailNotification(notification, userId);
        break;
      case 'whatsapp':
        await sendWhatsAppNotification(notification);
        break;
      case 'telegram':
        await sendTelegramNotification(notification);
        break;
      default:
        logger.warn(`Canal de notificación desconocido: ${channel}`);
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { delivered: true, sentAt: new Date() },
    });

    return notification;
  } catch (error) {
    logger.error(`Error en notificación ${channel}:`, error);
    throw error;
  }
}

async function sendAppNotification(notification, userId) {
  if (!io) return;
  if (userId) {
    io.to(`user:${userId}`).emit('notification', notification);
  } else {
    io.emit('notification', notification);
  }
}

async function sendEmailNotification(notification, userId) {
  if (!config.EMAIL_USER || !config.EMAIL_PASS) {
    logger.warn('Email no configurado, saltando notificación');
    return;
  }

  let userEmail = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    userEmail = user?.email;
  }

  if (!userEmail) {
    logger.warn('Sin destinatario de email');
    return;
  }

  const mailTransporter = getTransporter();
  await mailTransporter.sendMail({
    from: config.EMAIL_USER,
    to: userEmail,
    subject: `CMMS - Alerta: ${notification.message.substring(0, 100)}`,
    text: notification.message,
    html: `<div style="font-family:Arial,sans-serif;padding:20px"><h2>CMMS - Alerta</h2><p>${notification.message}</p></div>`,
  });
}

async function sendWhatsAppNotification(notification) {
  if (!config.WHATSAPP_TOKEN || !config.WHATSAPP_PHONE_ID) {
    logger.warn('WhatsApp no configurado');
    return;
  }

  try {
    const url = `https://graph.facebook.com/v17.0/${config.WHATSAPP_PHONE_ID}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: config.WHATSAPP_PHONE_ID,
        type: 'text',
        text: { body: `CMMS Alerta: ${notification.message}` },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error(`WhatsApp API error: ${text}`);
    }
  } catch (error) {
    logger.error('Error enviando WhatsApp:', error);
  }
}

async function sendTelegramNotification(notification) {
  if (!config.TELEGRAM_BOT_TOKEN) {
    logger.warn('Telegram no configurado');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.WHATSAPP_PHONE_ID || '@cmms_alerts',
        text: `CMMS Alerta: ${notification.message}`,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error(`Telegram API error: ${text}`);
    }
  } catch (error) {
    logger.error('Error enviando Telegram:', error);
  }
}
