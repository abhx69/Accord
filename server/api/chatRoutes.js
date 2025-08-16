/* File: server/api/chatRoutes.js
  Purpose: Add secure endpoints to add and remove group members.
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

// CREATE CHAT ROUTE (No changes)
router.post('/create', verifyToken, async (req, res) => {
    const { members, isGroup, name, participantInfo } = req.body;
    const createdBy = req.user.uid;
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
            createdBy,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastMessage: null,
        });
        res.status(201).send({ message: 'Chat created successfully', chatId: newChatRef.id });
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).send({ error: 'Failed to create chat.' });
    }
});

// --- NEW ROUTES FOR GROUP MANAGEMENT ---

// ADD MEMBER ROUTE
router.post('/:chatId/members/add', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const { newMember } = req.body; // Expects an object with uid and displayName
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


// DELETE MESSAGE ROUTE (No changes)
router.delete('/:chatId/messages/:messageId', verifyToken, async (req, res) => {
    // ... (delete message code is the same)
});

module.exports = router;
