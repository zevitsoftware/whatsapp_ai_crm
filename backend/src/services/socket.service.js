const { Server } = require('socket.io');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for development
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });

    // Handle joining rooms for specific device updates
    socket.on('join_device', (sessionId) => {
      socket.join(`device:${sessionId}`);
      console.log(`🔌 Client ${socket.id} joined device room: ${sessionId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const emitDeviceStatus = (sessionId, status, data = {}) => {
  if (io) {
    console.log(`📡 Emitting device status for ${sessionId}: ${status}`);
    io.to(`device:${sessionId}`).emit('device_status', { sessionId, status, ...data });
    // Also emit to global for lists
    io.emit('device_update', { sessionId, status, ...data });
  }
};

module.exports = {
  initSocket,
  getIO,
  emitDeviceStatus
};
