const admin = require('firebase-admin');

function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a user joins a specific chat room
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // When a user sends a message
    socket.on('sendMessage', async (data) => {
      const { roomId, message, senderId, senderName } = data;

      const newMessage = {
        text: message,
        senderId: senderId,
        senderName: senderName,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      try {
        // 1. Save the message to Firestore
        const db = admin.firestore();
        await db.collection('chats').doc(roomId).collection('messages').add(newMessage);

        // 2. Broadcast the message to everyone else in the room
        socket.to(roomId).emit('newMessage', newMessage);

      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
}

module.exports = initializeSocket;