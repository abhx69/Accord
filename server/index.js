const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const admin = require('firebase-admin');

// --- INITIALIZATION ---
// (This part is unchanged)
const app = express();
app.use(cors());
app.use(express.json()); 
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
// Import route files
const authRoutes = require('./api/authRoutes');
const chatRoutes = require('./api/chatRoutes');
const userRoutes = require('./api/userRoutes'); // <-- CHANGE #1: Import user routes

// Use routes with a prefix
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes); // <-- CHANGE #2: Use user routes

// --- SOCKET.IO ---
// (This part is unchanged)
const initializeSocket = require('./sockets/socketHandler');
initializeSocket(io);

// --- SERVER STARTUP ---
// (This part is unchanged)
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`✅ Server is live and listening on port ${PORT}`);
});