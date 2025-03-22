const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { PeerServer } = require('peer');
const cors = require('cors');
const app = express();



app.use(cors({
  origin: '*', // Replace with your frontend URL
  methods: ['GET', 'POST'],
  credentials: true,
}));

const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*', // Replace with your frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Create PeerJS server on port 5000
const peerServer = PeerServer({ port: 5000, path: '/myapp' });
console.log('PeerJS server running on port 5000');

// Proxy requests to /myapp to the PeerJS server
app.use('/myapp', createProxyMiddleware({ 
  target: 'http://localhost:5000', 
  changeOrigin: true,
}));

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