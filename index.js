const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PeerServer } = require('peer');

const app = express();
app.use(cors({
  origin: 'http://localhost:5173', // Replace with your frontend URL
  methods: ['GET', 'POST'],
  credentials: true,
}));

const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Replace with your frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Create PeerJS server on the same port
const peerServer = PeerServer({ port: 5000, path: '/myapp' }); // Use the same port as the backend
console.log('PeerServer running on port 5000');

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