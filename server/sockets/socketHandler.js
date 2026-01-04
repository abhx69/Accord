const pool = require('../config/db');
const fetch = require('node-fetch');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5002/ask';

function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log('✅ Real-time connection established:', socket.id);

    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('leaveRoom', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on('analyzeChat', async (data) => {
      const { roomId } = data;
      if (!roomId) return;
      
      console.log(`[Socket] Analysis requested for room ${roomId}`);
      
      try {
        const [historyRows] = await pool.query(`
          SELECT u.displayName as senderName, m.text, m.timestamp
          FROM messages m
          JOIN users u ON m.senderId = u.id
          WHERE m.chatId = ? ORDER BY m.timestamp ASC LIMIT 100
        `, [roomId]);

        const chatHistory = historyRows.map(row => 
          `${row.timestamp} - ${row.senderName}: ${row.text}`
        ).join('\n');

        const aiResponse = await fetch(AI_SERVICE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            history: chatHistory, 
            question: '', 
            analysis_mode: true 
          }),
        });

        if (!aiResponse.ok) {
          throw new Error(`AI service returned status ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const analysisText = aiData.answer || "Analysis could not be completed.";
        
        console.log(`[Socket] Analysis for room ${roomId} completed.`);
        socket.emit('analysisComplete', { 
          roomId, 
          analysis: analysisText 
        });

      } catch (error) {
        console.error("[Socket] Error during analysis:", error);
        socket.emit('errorMessage', { 
          error: 'Could not perform chat analysis.' 
        });
      }
    });

    socket.on('sendMessage', async (data) => {
      const { roomId, message, senderId, senderName } = data;
      
      if (!roomId || !message || !senderId || !senderName) {
        socket.emit('errorMessage', { 
          error: 'Missing required message data.' 
        });
        return;
      }

      try {
        const [result] = await pool.query(
          'INSERT INTO messages (chatId, senderId, text) VALUES (?, ?, ?)',
          [roomId, senderId, message]
        );

        const newMessage = {
          id: result.insertId,
          chatId: parseInt(roomId, 10),
          senderId,
          senderName,
          text: message,
          timestamp: new Date().toISOString()
        };
        
        io.in(roomId).emit('newMessage', newMessage);

      } catch (error) {
        console.error("Error saving user message:", error);
        socket.emit('errorMessage', { 
          error: 'Could not send your message.' 
        });
        return;
      }

      if (message.toLowerCase().startsWith('@ai')) {
        try {
          io.in(roomId).emit('aiThinking', { roomId });
          const question = message.substring(3).trim();
          
          const [historyRows] = await pool.query(
            `SELECT u.displayName as senderName, m.text, m.timestamp 
             FROM messages m 
             JOIN users u ON m.senderId = u.id
             WHERE m.chatId = ? 
             ORDER BY m.timestamp DESC LIMIT 50`,
            [roomId]
          );

          const chatHistory = historyRows.reverse().map(row => 
            `${row.senderName}: ${row.text}`
          ).join('\n');
          
          const aiResponse = await fetch(AI_SERVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              history: chatHistory, 
              question: question, 
              analysis_mode: false 
            }),
          });
          
          if (!aiResponse.ok) {
            const errorBody = await aiResponse.text();
            throw new Error(`AI service failed: ${errorBody}`);
          }

          const aiData = await aiResponse.json();
          const aiAnswer = aiData.answer || "Sorry, I encountered an error.";
          const attachmentUrl = aiData.attachment || null;
          
          const [aiUserRows] = await pool.query(
            'SELECT id FROM users WHERE username = "AI"'
          );
          const aiUserId = aiUserRows.length > 0 ? aiUserRows[0].id : 1;

          const [aiResult] = await pool.query(
            'INSERT INTO messages (chatId, senderId, text, file_url, file_type) VALUES (?, ?, ?, ?, ?)',
            [roomId, aiUserId, aiAnswer, attachmentUrl, attachmentUrl ? 'document' : null]
          );

          const aiMessage = { 
            id: aiResult.insertId, 
            text: aiAnswer, 
            senderId: aiUserId, 
            senderName: 'Accord AI', 
            timestamp: new Date().toISOString(),
            chatId: parseInt(roomId, 10),
            fileUrl: attachmentUrl
          };
          
          io.in(roomId).emit('newMessage', aiMessage);
          
        } catch(error) {
          console.error("Error in @ai command:", error);
          socket.emit('errorMessage', { 
            error: 'Accord AI is currently unavailable.' 
          });
        }
      }
    });

    socket.on('typingStart', (data) => {
      const { roomId, senderName } = data;
      socket.to(roomId).emit('userTyping', { 
        senderName, 
        isTyping: true 
      });
    });

    socket.on('typingStop', (data) => {
      const { roomId, senderName } = data;
      socket.to(roomId).emit('userTyping', { 
        senderName, 
        isTyping: false 
      });
    });

    socket.on('messageRead', async (data) => {
      const { roomId, messageId, userId } = data;
      try {
        await pool.query(
          'INSERT INTO message_reads (message_id, user_id) VALUES (?, ?)',
          [messageId, userId]
        );
        
        socket.to(roomId).emit('messageReadUpdate', {
          messageId,
          userId
        });
      } catch (error) {
        console.error("Error updating message read status:", error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Connection disconnected:', socket.id, 'Reason:', reason);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
}

module.exports = initializeSocket;