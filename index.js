const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');


const app = express();
app.use(cors());

const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});


// Store active users
const users = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Register new user
  socket.on('register', ({ userId, peerId }) => {
    console.log('User registered:', userId, 'with peerId:', peerId);
    users[userId] = {
      socketId: socket.id,
      peerId: peerId,
    };
    socket.userId = userId;

    // Notify other users about new user
    socket.broadcast.emit('user-connected', {
      userId,
      peerId,
    });

    // Send list of connected users to the new user
    const connectedUsers = Object.entries(users)
      .filter(([id]) => id !== userId)
      .map(([id, data]) => ({
        userId: id,
        peerId: data.peerId,
      }));

    socket.emit('connected-users', connectedUsers);
  });

  // Handle call notifications
  socket.on('calling', ({ to }) => {
    console.log('Calling user:', to); // Log the target user
    const targetSocketId = users[to]?.socketId;
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', {
        from: socket.userId,
      });
    }
  });

  
  // Handle call acceptance
  socket.on('call-accepted', ({ to }) => {
    console.log('Call accepted by:', to); // Log the target user
    const targetSocketId = users[to]?.socketId;
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-answered');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const userId = socket.userId;
    if (userId) {
      delete users[userId];
      io.emit('user-disconnected', userId);
      console.log('User disconnected:', userId);
    }
  });
});
const PORT = process.env.PORT || 3000; // Use Render's default port
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});