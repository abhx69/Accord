/*
  File: server/api/userRoutes.js
  Purpose: Corrected the SQL query in the /contacts route to reliably fetch contacts.
*/
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyToken = require('../middleware/verifyToken');

// --- NEW SECURE ROUTE TO GET CONTACTS ---
router.get('/contacts', verifyToken, async (req, res) => {
    const currentUserId = req.user.uid;
    try {
        // --- THIS IS THE FINAL, SIMPLIFIED QUERY ---
        // 1. Find all chat IDs the current user is a member of.
        // 2. Find all users who are members of those same chats.
        // 3. Exclude the current user from the final list.
        const query = `
            SELECT DISTINCT
                u.id AS uid,
                u.displayName,
                u.username,
                u.email
            FROM users u
            JOIN chat_members cm ON u.id = cm.userId
            WHERE cm.chatId IN (
                SELECT chatId FROM chat_members WHERE userId = ?
            ) AND u.id != ?;
        `;
        const [contacts] = await pool.query(query, [currentUserId, currentUserId]);
        
        // Let's log what the database returns to be sure
        console.log(`[API] Found ${contacts.length} contacts for user ${currentUserId}`);

        res.status(200).json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).send({ error: 'Failed to fetch contacts.' });
    }
});

// --- SEARCH FOR A USER BY USERNAME ---
router.get('/search', verifyToken, async (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).send({ error: 'A username query parameter is required.' });
    }
    try {
        const [users] = await pool.query('SELECT id as uid, displayName, username, email FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(404).send({ message: 'User not found.' });
        }
        res.status(200).send(users[0]);
    } catch (error) {
        console.error('Error searching for user:', error);
        res.status(500).send({ error: 'Failed to search for user.' });
    }
});

module.exports = router;

