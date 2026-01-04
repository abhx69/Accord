/*
  File: server/api/chatRoutes.js
  Purpose: The complete and final version with all chat-related features, migrated to SQL.
*/
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyToken = require('../middleware/verifyToken');

router.use(express.json());

// --- GET ALL CHATS FOR THE CURRENT USER ---
// This new route is crucial. It replaces the real-time Firebase listener.
router.get('/', verifyToken, async (req, res) => {
    const userId = req.user.uid;
    try {
        // This query finds all chats the user is a member of.
        const [chats] = await pool.query(`
            SELECT c.id, c.name, c.isGroup, c.createdBy
            FROM chats c
            JOIN chat_members cm ON c.id = cm.chatId
            WHERE cm.userId = ?
        `, [userId]);

        // Now, for each chat, we'll get the members.
        for (const chat of chats) {
            const [members] = await pool.query('SELECT userId FROM chat_members WHERE chatId = ?', [chat.id]);
            chat.members = members.map(m => m.userId);

            // Also, get participant info (id and displayName)
            const [participants] = await pool.query(`
                SELECT u.id, u.displayName 
                FROM users u 
                JOIN chat_members cm ON u.id = cm.userId 
                WHERE cm.chatId = ?
            `, [chat.id]);
            chat.participantInfo = participants.reduce((acc, p) => {
                acc[p.id] = p.displayName;
                return acc;
            }, {});
        }
        
        res.status(200).json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).send({ error: 'Failed to fetch chats.' });
    }
});

// --- NEW: GET ALL MESSAGES FOR A SPECIFIC CHAT ---
router.get('/:chatId/messages', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.uid;
    try {
        // First, verify the user is a member of the chat they are requesting messages from.
        const [memberCheck] = await pool.query(
            'SELECT * FROM chat_members WHERE chatId = ? AND userId = ?',
            [chatId, userId]
        );
        if (memberCheck.length === 0) {
            return res.status(403).send({ error: "Forbidden: You are not a member of this chat." });
        }

        // Fetch messages and join with user info to get senderName
        const [messages] = await pool.query(`
            SELECT m.id, m.chatId, m.senderId, m.text, m.timestamp, u.displayName as senderName
            FROM messages m
            JOIN users u ON m.senderId = u.id
            WHERE m.chatId = ?
            ORDER BY m.timestamp ASC
        `, [chatId]);

        res.status(200).json(messages);
    } catch (error) {
        console.error(`Error fetching messages for chat ${chatId}:`, error);
        res.status(500).send({ error: 'Failed to fetch messages.' });
    }
});


// --- CREATE CHAT ROUTE ---
router.post('/create', verifyToken, async (req, res) => {
    const { members, isGroup, name } = req.body;
    const createdBy = req.user.uid;

    if (!isGroup && members.length !== 1) {
        return res.status(400).send({ error: 'A direct message must have exactly one other member.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [chatResult] = await connection.query(
            'INSERT INTO chats (name, isGroup, createdBy) VALUES (?, ?, ?)',
            [name || null, isGroup || false, createdBy]
        );
        const chatId = chatResult.insertId;

        // Add creator and all members to the chat_members table
        const allMemberIds = [...new Set([...members.map(m => m.uid), createdBy])];
        const memberInsertPromises = allMemberIds.map(userId => {
            return connection.query('INSERT INTO chat_members (chatId, userId) VALUES (?, ?)', [chatId, userId]);
        });
        await Promise.all(memberInsertPromises);

        await connection.commit();
        res.status(201).send({ message: 'Chat created successfully', chatId });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating chat:', error);
        res.status(500).send({ error: 'Failed to create chat.' });
    } finally {
        connection.release();
    }
});

// --- LEAVE CHAT ROUTE ---
router.post('/:chatId/leave', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.uid;
    try {
        await pool.query('DELETE FROM chat_members WHERE chatId = ? AND userId = ?', [chatId, userId]);
        res.status(200).send({ message: 'Successfully left the chat.' });
    } catch (error) {
        console.error('Error leaving chat:', error);
        res.status(500).send({ error: 'Failed to leave chat.' });
    }
});

// --- ADD MEMBER TO GROUP ROUTE ---
router.post('/:chatId/members/add', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const { newMember } = req.body; // Expects { uid: '...' }
    const requesterId = req.user.uid;
    try {
        const [chats] = await pool.query('SELECT createdBy FROM chats WHERE id = ?', [chatId]);
        if (chats.length === 0 || chats[0].createdBy !== requesterId) {
            return res.status(403).send({ error: 'Forbidden: Only the group owner can add members.' });
        }
        await pool.query('INSERT IGNORE INTO chat_members (chatId, userId) VALUES (?, ?)', [chatId, newMember.uid]);
        res.status(200).send({ message: 'Member added successfully.' });
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).send({ error: 'Failed to add member.' });
    }
});

// --- REMOVE MEMBER FROM GROUP ROUTE ---
router.post('/:chatId/members/remove', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const { memberIdToRemove } = req.body;
    const requesterId = req.user.uid;
    try {
        const [chats] = await pool.query('SELECT createdBy FROM chats WHERE id = ?', [chatId]);
        if (chats.length === 0 || chats[0].createdBy !== requesterId) {
            return res.status(403).send({ error: 'Forbidden: Only the group owner can remove members.' });
        }
        if (memberIdToRemove === requesterId) {
            return res.status(400).send({ error: 'Group owner cannot be removed.' });
        }
        await pool.query('DELETE FROM chat_members WHERE chatId = ? AND userId = ?', [chatId, memberIdToRemove]);
        res.status(200).send({ message: 'Member removed successfully.' });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).send({ error: 'Failed to remove member.' });
    }
});

// --- DELETE MESSAGE ROUTE ---
router.delete('/:chatId/messages/:messageId', verifyToken, async (req, res) => {
    const { messageId } = req.params;
    const requesterId = req.user.uid;
    try {
        // Ensure the user deleting the message is the one who sent it.
        const [result] = await pool.query(
            'DELETE FROM messages WHERE id = ? AND senderId = ?',
            [messageId, requesterId]
        );
        if (result.affectedRows === 0) {
            return res.status(403).send({ error: 'Forbidden or message not found.' });
        }
        res.status(200).send({ message: 'Message deleted successfully.' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).send({ error: 'Failed to delete message.' });
    }
});

// --- IMPORT MESSAGES ROUTE ---
router.post('/:chatId/import', verifyToken, async (req, res) => {
    const { chatId } = req.params;
    const { messages } = req.body;
    const requesterId = req.user.uid;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).send({ error: 'No valid messages provided for import.' });
    }
    
    // In a real app, you'd have a more robust way to map imported sender names to user IDs.
    // For now, we'll attribute all imported messages to the user who is importing them.
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const importPromises = messages.map(msg => {
            const text = `[Imported from ${msg.senderName}]: ${msg.text}`;
            return connection.query('INSERT INTO messages (chatId, senderId, text) VALUES (?, ?, ?)', [chatId, requesterId, text]);
        });
        await Promise.all(importPromises);
        await connection.commit();
        res.status(200).send({ message: `${messages.length} messages imported successfully.` });
    } catch (error) {
        await connection.rollback();
        console.error('Error importing messages:', error);
        res.status(500).send({ error: 'Failed to import messages.' });
    } finally {
        connection.release();
    }
});

module.exports = router;

