const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const https = require('https');

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

// Endpoint to fetch ICE servers from Xirsys
// app.get('/ice-servers', (req, res) => {
//   const o = {
//     format: "urls"
//   };

//   const bodyString = JSON.stringify(o);
//   const options = {
//     host: "global.xirsys.net",
//     path: "/_turn/VideoCalling",
//     method: "PUT",
//     headers: {
//       "Authorization": "Basic " + Buffer.from("rsaifee1019:31d6ea32-070f-11f0-9b5a-0242ac150002").toString("base64"),
//       "Content-Type": "application/json",
//       "Content-Length": bodyString.length
//     }
//   };

//   const httpreq = https.request(options, (httpres) => {
//     let str = "";
//     httpres.on("data", (data) => { str += data; });
//     httpres.on("error", (e) => { console.log("error: ", e); });
//     httpres.on("end", () => {
//       console.log("ICE List: ", str);
//       res.json(JSON.parse(str)); // Send the ICE server list to the frontend
//     });
//   });

//   httpreq.on("error", (e) => { console.log("request error: ", e); });
//   httpreq.write(bodyString);
//   httpreq.end();
// });

// Socket.IO connection handling
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