/* File: server/api/chatRoutes.js
  Purpose: The complete and final version with all chat-related features.
  Action: Replace the entire content of your chatRoutes.js file with this.
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
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(403).send({ error: 'Forbidden: Invalid token.' });
    }
};

router.use(express.json());

// CREATE CHAT ROUTE
router.post('/create', verifyToken, async (req, res) => {
    const { members, isGroup, name, participantInfo } = req.body;
    const createdBy = req.user.uid;
    if (!members || members.length < 2) {
        return res.status(400).send({ error: 'A chat must have at least two members.' });
    }
    try {
        const db = admin.firestore();
        const newChatRef = await db.collection('chats').add({
            members, isGroup: isGroup || false, name: name || '',
            participantInfo: participantInfo || {}, createdBy,
            createdAt: admin.firestore.FieldValue.serverTimestamp(), lastMessage: null,
        });
        res.status(201).send({ message: 'Chat created successfully', chatId: newChatRef.id });
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).send({ error: 'Failed to create chat.' });
    }
});

// LEAVE CHAT ROUTE
router.post('/:chatId/leave', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const { uid } = req.user;

    try {
        const db = admin.firestore();
        const chatRef = db.collection('chats').doc(chatId);
        
        await chatRef.update({
            members: admin.firestore.FieldValue.arrayRemove(uid)
        });

        res.status(200).send({ message: 'Successfully left the chat.' });
    } catch (error) {
        console.error('Error leaving chat:', error);
        res.status(500).send({ error: 'Failed to leave chat.' });
    }
});

// ADD MEMBER ROUTE
router.post('/:chatId/members/add', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const { newMember } = req.body;
    const requesterId = req.user.uid;

    try {
        const db = admin.firestore();
        const chatRef = db.collection('chats').doc(chatId);
        const chatDoc = await chatRef.get();

        if (!chatDoc.exists) return res.status(404).send({ error: 'Chat not found.' });
        
        const chatData = chatDoc.data();
        if (chatData.createdBy !== requesterId) {
            return res.status(403).send({ error: 'Forbidden: Only the group owner can add members.' });
        }

        await chatRef.update({
            members: admin.firestore.FieldValue.arrayUnion(newMember.uid),
            [`participantInfo.${newMember.uid}`]: newMember.displayName
        });

        res.status(200).send({ message: 'Member added successfully.' });
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).send({ error: 'Failed to add member.' });
    }
});

// REMOVE MEMBER ROUTE
router.post('/:chatId/members/remove', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const { memberIdToRemove } = req.body;
    const requesterId = req.user.uid;

    try {
        const db = admin.firestore();
        const chatRef = db.collection('chats').doc(chatId);
        const chatDoc = await chatRef.get();

        if (!chatDoc.exists) return res.status(404).send({ error: 'Chat not found.' });

        const chatData = chatDoc.data();
        if (chatData.createdBy !== requesterId) {
            return res.status(403).send({ error: 'Forbidden: Only the group owner can remove members.' });
        }
        if (memberIdToRemove === requesterId) {
            return res.status(400).send({ error: 'Group owner cannot be removed.' });
        }

        await chatRef.update({
            members: admin.firestore.FieldValue.arrayRemove(memberIdToRemove),
            [`participantInfo.${memberIdToRemove}`]: admin.firestore.FieldValue.delete()
        });

        res.status(200).send({ message: 'Member removed successfully.' });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).send({ error: 'Failed to remove member.' });
    }
});

// DELETE MESSAGE ROUTE
router.delete('/:chatId/messages/:messageId', verifyToken, async (req, res) => {
    const { chatId, messageId } = req.params;
    const { uid } = req.user;

    try {
        const db = admin.firestore();
        const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
        const messageDoc = await messageRef.get();

        if (!messageDoc.exists) {
            return res.status(404).send({ error: 'Message not found.' });
        }

        const messageData = messageDoc.data();

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

// IMPORT MESSAGES ROUTE
router.post('/:chatId/import', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const { messages } = req.body;
    const currentUser = req.user;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).send({ error: 'No valid messages provided for import.' });
    }

    try {
        const db = admin.firestore();
        const messagesRef = db.collection('chats').doc(chatId).collection('messages');
        const batch = db.batch();

        messages.forEach(msg => {
            const newMsgRef = messagesRef.doc();
            batch.set(newMsgRef, {
                text: msg.text,
                senderId: msg.senderName === currentUser.name ? currentUser.uid : `imported_${msg.senderName.replace(/\s+/g, '_')}`,
                senderName: msg.senderName,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                isImported: true
            });
        });

        await batch.commit();
        res.status(200).send({ message: `${messages.length} messages imported successfully.` });

    } catch (error) {
        console.error('Error importing messages:', error);
        res.status(500).send({ error: 'Failed to import messages.' });
    }
});

module.exports = router;
