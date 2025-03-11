import express from 'express'; // 引入express库
import { createServer } from 'http'; // 引入http模块中的createServer函数
import { Server } from 'socket.io'; // 引入socket.io库中的Server类

const app = express(); // 创建一个express应用
const httpServer = createServer(app); // 使用express应用创建一个http服务器
const io = new Server(httpServer, { // 创建一个socket.io服务器，并配置跨域选项
  cors: {
    origin: "*", // 允许所有来源的跨域请求
    methods: ["GET", "POST"] // 允许的HTTP方法
  }
});

interface Room { // 定义一个Room接口，用于描述房间结构
  users: string[]; // 房间中的用户列表
}

const rooms: Map<string, Room> = new Map(); // 创建一个Map，用于存储房间信息

io.on('connection', (socket) => { // 监听socket连接事件
  console.log('用户连接:', socket.id); // 打印连接的用户ID

  // 加入房间
  socket.on('join-room', (roomId: string) => { // 监听加入房间事件
    const room = rooms.get(roomId) || { users: [] }; // 获取房间信息，如果不存在则创建一个新房间
    room.users.push(socket.id); // 将当前用户ID添加到房间用户列表中
    rooms.set(roomId, room); // 更新房间信息
    
    socket.join(roomId); // 将当前socket加入到指定房间
    socket.emit('room-joined', { roomId, userId: socket.id }); // 向当前用户发送房间加入成功事件
    socket.to(roomId).emit('user-connected', socket.id); // 向房间内其他用户发送新用户连接事件
  });

  // 处理 offer
  socket.on('offer', ({ offer, roomId, targetId }) => { // 监听offer事件
    socket.to(targetId).emit('offer', { // 将offer信息发送给目标用户
      offer,
      callerId: socket.id // 发送者的ID
    });
  });

  // 处理 answer
  socket.on('answer', ({ answer, callerId }) => { // 监听answer事件
    socket.to(callerId).emit('answer', { // 将answer信息发送给呼叫者
      answer,
      answererId: socket.id // 回应者的ID
    });
  });

  // 处理 ICE candidate
  socket.on('ice-candidate', ({ candidate, targetId }) => { // 监听ICE candidate事件
    socket.to(targetId).emit('ice-candidate', { // 将ICE candidate信息发送给目标用户
      candidate,
      senderId: socket.id // 发送者的ID
    });
  });

  // 处理断开连接
  socket.on('disconnect', () => { // 监听用户断开连接事件
    for (const [roomId, room] of rooms.entries()) { // 遍历所有房间
      const index = room.users.indexOf(socket.id); // 找到当前用户在房间用户列表中的索引
      if (index !== -1) { // 如果用户存在于房间中
        room.users.splice(index, 1); // 从用户列表中移除该用户
        if (room.users.length === 0) { // 如果房间中没有其他用户
          rooms.delete(roomId); // 删除该房间
        } else {
          rooms.set(roomId, room); // 更新房间信息
        }
        socket.to(roomId).emit('user-disconnected', socket.id); // 向房间内其他用户发送用户断开连接事件
      }
    }
  });
});

const PORT = process.env.PORT || 3001; // 设置服务器端口号，优先使用环境变量中的端口，如果没有则默认为3001
httpServer.listen(PORT, () => { // 启动http服务器并监听指定端口
  console.log(`信令服务器运行在端口 ${PORT}`); // 打印服务器启动成功的日志
});