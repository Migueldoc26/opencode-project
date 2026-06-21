import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import logger from '../config/logger.js';
import { setSocketIO } from '../services/notification.service.js';

let io = null;

export function setupWebSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.FRONTEND_URL || true,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Token de autenticación requerido'));
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Token inválido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket conectado: ${socket.id} (usuario: ${socket.userId})`);

    socket.join(`user:${socket.userId}`);

    socket.on('subscribe:asset', (assetId) => {
      if (typeof assetId === 'string') {
        socket.join(`asset:${assetId}`);
        logger.debug(`Socket ${socket.id} suscrito a asset:${assetId}`);
      }
    });

    socket.on('unsubscribe:asset', (assetId) => {
      if (typeof assetId === 'string') {
        socket.leave(`asset:${assetId}`);
      }
    });

    socket.on('subscribe:sensor', (sensorId) => {
      if (typeof sensorId === 'string') {
        socket.join(`sensor:${sensorId}`);
        logger.debug(`Socket ${socket.id} suscrito a sensor:${sensorId}`);
      }
    });

    socket.on('unsubscribe:sensor', (sensorId) => {
      if (typeof sensorId === 'string') {
        socket.leave(`sensor:${sensorId}`);
      }
    });

    socket.on('subscribe:plant', (plantId) => {
      if (typeof plantId === 'string') {
        socket.join(`plant:${plantId}`);
      }
    });

    socket.on('unsubscribe:plant', (plantId) => {
      if (typeof plantId === 'string') {
        socket.leave(`plant:${plantId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket desconectado: ${socket.id} (razón: ${reason})`);
    });
  });

  setSocketIO(io);

  logger.info('WebSocket (Socket.IO) configurado');
  return io;
}

export function getIO() {
  return io;
}

export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToAsset(assetId, event, data) {
  if (!io) return;
  io.to(`asset:${assetId}`).emit(event, data);
}

export function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}
