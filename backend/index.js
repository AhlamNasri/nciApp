const db = require('./db');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const projectRoutes = require('./routes/projects');
const authRoutes = require('./routes/auth');
const projectFilesRoutes = require('./routes/projectFiles');
const projectMembersRoutes = require('./routes/projectMembers');
const messagesRoutes = require('./routes/messages');
const chatRoomRoutes = require('./routes/chatRooms');
const usersRoutes = require('./routes/users');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware - CORS FIRST before any routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', messagesRoutes);
app.use('/api', projectFilesRoutes);
app.use('/api', projectMembersRoutes);
app.use('/api', chatRoomRoutes);
app.use('/api', projectRoutes);
app.use('/api', usersRoutes);



// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// ============================================
// SOCKET.IO REAL-TIME CHAT
// ============================================

// Store active users per room
const roomUsers = new Map(); // roomId -> Set of socketIds

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Join a chat room
  socket.on('join-room', async ({ roomId, userId, userName }) => {
    socket.join(`room-${roomId}`);

    // Track user in room
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Set());
    }
    roomUsers.get(roomId).add(socket.id);

    socket.userId = userId;
    socket.userName = userName;
    socket.currentRoom = roomId;

    console.log(`👤 ${userName} (${userId}) joined room ${roomId}`);

    // Notify others
    socket.to(`room-${roomId}`).emit('user-joined', {
      userId,
      userName,
      timestamp: new Date()
    });

    // Send active users count
    io.to(`room-${roomId}`).emit('room-users-count', {
      count: roomUsers.get(roomId).size
    });
  });

  // Leave a room
  socket.on('leave-room', ({ roomId }) => {
    socket.leave(`room-${roomId}`);

    if (roomUsers.has(roomId)) {
      roomUsers.get(roomId).delete(socket.id);
      if (roomUsers.get(roomId).size === 0) {
        roomUsers.delete(roomId);
      } else {
        io.to(`room-${roomId}`).emit('room-users-count', {
          count: roomUsers.get(roomId).size
        });
      }
    }

    console.log(`👋 ${socket.userName} left room ${roomId}`);
  });

  // Send message
  socket.on('send-message', async ({ roomId, senderId, text }) => {
    try {
      // Save to database
      const [result] = await db.query(
        'INSERT INTO room_messages (room_id, sender_id, message_text) VALUES (?, ?, ?)',
        [roomId, senderId, text.trim()]
      );

      // Get the created message with user info
      const [messages] = await db.query(`
        SELECT
          rm.id,
          rm.message_text as text,
          rm.created_at as timestamp,
          rm.sender_id as senderId,
          u.name as senderName,
          u.avatar_url as senderAvatar
        FROM room_messages rm
        JOIN users u ON rm.sender_id = u.id
        WHERE rm.id = ?
      `, [result.insertId]);

      const message = {
        id: messages[0].id,
        text: messages[0].text,
        senderId: messages[0].senderId,
        senderName: messages[0].senderName,
        senderAvatar: messages[0].senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${messages[0].senderName}`,
        timestamp: messages[0].timestamp
      };

      // Broadcast to all users in room (including sender)
      io.to(`room-${roomId}`).emit('new-message', message);

      console.log(`📨 Message from ${message.senderName} in room ${roomId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing-start', ({ roomId, userId, userName }) => {
    socket.to(`room-${roomId}`).emit('user-typing', { userId, userName });
  });

  socket.on('typing-stop', ({ roomId, userId }) => {
    socket.to(`room-${roomId}`).emit('user-stop-typing', { userId });
  });

  // Mark messages as read
  socket.on('mark-read', async ({ roomId, userId, messageId }) => {
    try {
      await db.query(`
        INSERT INTO room_message_reads (room_id, user_id, last_read_message_id)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE last_read_message_id = VALUES(last_read_message_id)
      `, [roomId, userId, messageId]);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);

    if (socket.currentRoom) {
      const roomId = socket.currentRoom;

      if (roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(socket.id);

        if (roomUsers.get(roomId).size === 0) {
          roomUsers.delete(roomId);
        } else {
          io.to(`room-${roomId}`).emit('room-users-count', {
            count: roomUsers.get(roomId).size
          });
        }
      }

      socket.to(`room-${roomId}`).emit('user-left', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Start server with Socket.io
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Socket.io enabled`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 CORS enabled for: http://localhost:3000, http://localhost:3001`);
});

module.exports = { app, io };