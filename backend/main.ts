import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import winston from 'winston';

// 加载环境变量
dotenv.config();
//创建log文件:
// 创建日志文件目录
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: `${logDir}/server.log` })
  ]
});

// 定义接口
interface Room {
  users: string[];
  createdAt: Date;
}

interface SignalingEvent {
  roomId: string;
  targetId: string;
  callerId?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  senderId?: string;
  answererId?: string;
}

// 创建Express应用
const app = express();

// SSL配置
let httpsOptions;
try {
  logger.info('正在读取SSL证书和密钥...');
  
  const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, './conf/check.znjz.online.key');
  const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, './conf/check.znjz.online.pem');
  
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
    requestCert: false,
    rejectUnauthorized: false
  };
  logger.info('SSL证书和密钥读取成功');
} catch (error) {
  logger.error('SSL证书读取失败:', error);
  process.exit(1);
}

// 创建HTTP和HTTPS服务器
const httpServer = createHttpServer(app);
const httpsServer = createHttpsServer(httpsOptions, app);

// 创建Socket.IO服务器
const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 20000, // 增加ping超时时间
  pingInterval: 25000 // 调整ping间隔
});

logger.info('正在初始化Socket.IO服务器...');
io.attach(httpServer);
io.attach(httpsServer);
logger.info('Socket.IO服务器初始化完成');

// 房间管理
const rooms = new Map<string, Room>();

// 房间清理定时任务 - 清理超过2小时的空房间
setInterval(() => {
  const now = new Date();
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.length === 0 && now.getTime() - room.createdAt.getTime() > 2 * 60 * 60 * 1000) {
      rooms.delete(roomId);
      logger.info(`自动清理长时间空闲的房间: ${roomId}`);
    }
  }
}, 30 * 60 * 1000); // 每30分钟运行一次

// Socket连接处理
io.on('connection', (socket) => {
  logger.info(`用户连接: ${socket.id}`);

  // 加入房间
  socket.on('join-room', (roomId: string) => {
    try {
      logger.info(`用户 ${socket.id} 正在加入房间 ${roomId}`);
      
      // 获取或创建房间
      const room = rooms.get(roomId) || { users: [], createdAt: new Date() };
      
      // 检查用户是否已在房间中
      if (!room.users.includes(socket.id)) {
        room.users.push(socket.id);
        rooms.set(roomId, room);
      }
      
      socket.join(roomId);
      socket.emit('room-joined', { roomId, userId: socket.id });
      socket.to(roomId).emit('user-connected', socket.id);
      logger.info(`房间 ${roomId} 当前用户数: ${room.users.length}`);
    } catch (error) {
      logger.error(`加入房间失败: ${error}`);
      socket.emit('error', { message: '加入房间失败' });
    }
  });

  // 处理 offer
  socket.on('offer', ({ offer, roomId, targetId }: SignalingEvent) => {
    try {
      logger.info(`用户 ${socket.id} 向用户 ${targetId} 发送offer`);
      socket.to(targetId).emit('offer', {
        offer,
        callerId: socket.id
      });
    } catch (error) {
      logger.error(`发送offer失败: ${error}`);
      socket.emit('error', { message: '发送offer失败' });
    }
  });

  // 处理 answer
  socket.on('answer', ({ answer, callerId }: SignalingEvent) => {
    try {
      logger.info(`用户 ${socket.id} 向用户 ${callerId} 发送answer`);
      socket.to(callerId as string | string[]).emit('answer', {
        answer,
        answererId: socket.id
      });
    } catch (error) {
      logger.error(`发送answer失败: ${error}`);
      socket.emit('error', { message: '发送answer失败' });
    }
  });

  // 处理 ICE candidate
  socket.on('ice-candidate', ({ candidate, targetId }: SignalingEvent) => {
    try {
      logger.info(`用户 ${socket.id} 向用户 ${targetId} 发送ICE candidate`);
      socket.to(targetId).emit('ice-candidate', {
        candidate,
        senderId: socket.id
      });
    } catch (error) {
      logger.error(`发送ICE candidate失败: ${error}`);
      socket.emit('error', { message: '发送ICE candidate失败' });
    }
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    try {
      logger.info(`用户 ${socket.id} 断开连接`);
      
      // 遍历所有房间并移除用户
      for (const [roomId, room] of rooms.entries()) {
        const index = room.users.indexOf(socket.id);
        if (index !== -1) {
          room.users.splice(index, 1);
          logger.info(`用户 ${socket.id} 从房间 ${roomId} 移除`);
          
          if (room.users.length === 0) {
            // 不立即删除空房间，而是保留以便用户可能重新连接
            logger.info(`房间 ${roomId} 现在为空`);
          } else {
            rooms.set(roomId, room);
            logger.info(`房间 ${roomId} 剩余用户数: ${room.users.length}`);
          }
          
          socket.to(roomId).emit('user-disconnected', socket.id);
        }
      }
    } catch (error) {
      logger.error(`处理断开连接时出错: ${error}`);
    }
  });

  // 提供在线用户列表功能
  socket.on('get-room-users', (roomId: string) => {
    try {
      const room = rooms.get(roomId);
      if (room) {
        socket.emit('room-users', { roomId, users: room.users });
      } else {
        socket.emit('room-users', { roomId, users: [] });
      }
    } catch (error) {
      logger.error(`获取房间用户列表失败: ${error}`);
      socket.emit('error', { message: '获取房间用户列表失败' });
    }
  });
});

// 设置HTTP和HTTPS端口
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3002;

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', rooms: rooms.size });
});

// 启动HTTP服务器
httpServer.listen(HTTP_PORT, () => {
  logger.info(`HTTP信令服务器运行在端口 ${HTTP_PORT}`);
});

// 启动HTTPS服务器
httpsServer.listen(HTTPS_PORT, () => {
  logger.info(`HTTPS信令服务器运行在端口 ${HTTPS_PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  httpServer.close(() => {
    logger.info('HTTP服务器已关闭');
  });
  httpsServer.close(() => {
    logger.info('HTTPS服务器已关闭');
    process.exit(0);
  });
});