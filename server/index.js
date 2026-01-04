require('dotenv').config(); // Load environment variables
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const authRoutes = require('./api/authRoutes');
const chatRoutes = require('./api/chatRoutes');
const userRoutes = require('./api/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);

const initializeSocket = require('./sockets/socketHandler');
initializeSocket(io);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`✅ Server is live and listening on port ${PORT}`);
});