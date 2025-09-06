/* File: server/index.js
  Purpose: Increase the JSON payload limit to allow for larger file imports.
*/
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const admin = require('firebase-admin');

// --- INITIALIZATION ---
const app = express();
app.use(cors());

// THIS IS THE FIX: Increase the limit for JSON request bodies
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const serviceAccount = require('./config/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// --- ROUTES ---
const authRoutes = require('./api/authRoutes');
const chatRoutes = require('./api/chatRoutes');
const userRoutes = require('./api/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);

// --- SOCKET.IO ---
const initializeSocket = require('./sockets/socketHandler');
initializeSocket(io);

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log("✅ Server is live and listening on port ${PORT}");
});