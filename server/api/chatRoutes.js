/* File: server/api/chatRoutes.js
  Purpose: To save the creator's ID when a new chat is made.
*/
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Middleware to securely verify the user's ID token
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ error: 'Unauthorized: No token provided.' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Add user info (like uid) to the request
        next();
    } catch (error) {
        return res.status(403).send({ error: 'Forbidden: Invalid token.' });
    }
};

router.use(express.json());

// UPDATED Route for: POST /api/chats/create
router.post('/create', verifyToken, async (req, res) => { // Added verifyToken middleware
    const { members, isGroup, name, participantInfo } = req.body;
    const createdBy = req.user.uid; // Get the UID of the user creating the chat

    if (!members || members.length < 2) {
        return res.status(400).send({ error: 'A chat must have at least two members.' });
    }

    try {
        const db = admin.firestore();
        const newChatRef = await db.collection('chats').add({
            members,
            isGroup: isGroup || false,
            name: name || '',
            participantInfo: participantInfo || {},
            createdBy, // <-- THE FIX: Save the creator's ID
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastMessage: null,
        });

        res.status(201).send({ message: 'Chat created successfully', chatId: newChatRef.id });
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).send({ error: 'Failed to create chat.' });
    }
});

// Your delete message route will also use the verifyToken middleware
router.delete('/:chatId/messages/:messageId', verifyToken, async (req, res) => {
    const { chatId, messageId } = req.params;
    const { uid } = req.user; // UID from the verified token

    try {
        const db = admin.firestore();
        const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
        const messageDoc = await messageRef.get();

        if (!messageDoc.exists) {
            return res.status(404).send({ error: 'Message not found.' });
        }

        const messageData = messageDoc.data();

        // Security check: Only the original sender can delete the message
        if (messageData.senderId !== uid) {
            return res.status(403).send({ error: 'Forbidden: You can only delete your own messages.' });
        }

        await messageRef.delete();
        res.status(200).send({ message: 'Message deleted successfully.' });

    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).send({ error: 'Failed to delete message.' });
    }
});


module.exports = router;
