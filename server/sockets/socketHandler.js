/* File: server/sockets/socketHandler.js
  Purpose: Add the new 'analyzeChat' event and update the '@ai' command.
*/
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const AI_SERVICE_URL = 'http://localhost:5002/ask';

function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log('✅ Real-time connection established:', socket.id);

    socket.on('joinRoom', (roomId) => { /* ... unchanged ... */ });

    // --- NEW EVENT HANDLER FOR SILENT ANALYSIS ---
    socket.on('analyzeChat', async (data) => {
        const { roomId } = data;
        console.log(`Analysis requested for room ${roomId}`);
        
        try {
            const db = admin.firestore();
            const messagesRef = db.collection('chats').doc(roomId).collection('messages');
            const chatRef = db.collection('chats').doc(roomId);

            const historySnapshot = await messagesRef.orderBy('timestamp', 'asc').get();
            const chatHistory = historySnapshot.docs.map(doc => `${doc.data().senderName}: ${doc.data().text}`).join('\n');

            const aiResponse = await fetch(AI_SERVICE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: chatHistory, question: '', analysis_mode: true }),
            });

            if (!aiResponse.ok) throw new Error('AI service returned an error during analysis.');

            const aiData = await aiResponse.json();
            const analysisText = aiData.answer || "Analysis could not be completed.";

            // Save the analysis to a separate sub-collection
            await chatRef.collection('analysis').doc('latest').set({
                analysis: analysisText,
                analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`Analysis for room ${roomId} completed and saved.`);
            socket.emit('analysisComplete', { roomId }); // Notify the user who requested it

        } catch (error) {
            console.error("Error during analysis:", error);
            socket.emit('errorMessage', { error: 'Could not perform analysis.' });
        }
    });

    socket.on('sendMessage', async (data) => {
      const { roomId, message, senderId, senderName } = data;
      const db = admin.firestore();
      const messagesRef = db.collection('chats').doc(roomId).collection('messages');
      const chatRef = db.collection('chats').doc(roomId);
      
      const newMessage = { text: message, senderId, senderName, timestamp: admin.firestore.FieldValue.serverTimestamp() };
      const savedMessageRef = await messagesRef.add(newMessage);
      await chatRef.update({ lastMessage: { text: message, timestamp: admin.firestore.FieldValue.serverTimestamp() } });
      socket.to(roomId).emit('newMessage', { ...newMessage, id: savedMessageRef.id });

      // --- UPDATED @ai LOGIC ---
      if (message.toLowerCase().startsWith('@ai')) {
            io.in(roomId).emit('aiThinking');
            const question = message.substring(3).trim();
            
            // First, try to get the latest analysis
            const analysisDoc = await chatRef.collection('analysis').doc('latest').get();
            let context = "A user has asked a question.";
            if (analysisDoc.exists) {
                context = analysisDoc.data().analysis;
            }

            const aiResponse = await fetch(AI_SERVICE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: context, question: question, analysis_mode: false }),
            });
            
            if (!aiResponse.ok) throw new Error('AI service returned an error.');

            const aiData = await aiResponse.json();
            const aiAnswer = aiData.answer || "Sorry, I encountered an error.";
            const aiMessage = { text: aiAnswer, senderId: 'AI', senderName: 'Accord AI', timestamp: admin.firestore.FieldValue.serverTimestamp() };
            
            const savedAiMessageRef = await messagesRef.add(aiMessage);
            await chatRef.update({ lastMessage: { text: aiAnswer, timestamp: admin.firestore.FieldValue.serverTimestamp() } });
            io.in(roomId).emit('newMessage', { ...aiMessage, id: savedAiMessageRef.id });
      }
    });

    socket.on('disconnect', () => { /* ... unchanged ... */ });
  });
}

module.exports = initializeSocket;
