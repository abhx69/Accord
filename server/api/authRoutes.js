const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// --- REGISTRATION ---
router.post('/register', async (req, res) => {
    const { email, password, displayName, username } = req.body;
    if (!email || !password || !displayName || !username) {
        return res.status(400).send({ error: 'All fields are required.' });
    }
    try {
        const [existing] = await pool.query('SELECT email, username FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing.length > 0) {
            return res.status(400).send({ error: 'Email or username already exists.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (email, password, displayName, username) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, displayName, username]
        );
        res.status(201).send({ message: 'User created successfully', userId: result.insertId });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).send({ error: 'Failed to register user.' });
    }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).send({ error: 'Invalid credentials.' });
        }
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send({ error: 'Invalid credentials.' });
        }
        const token = jwt.sign(
            { uid: user.id, displayName: user.displayName },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.status(200).send({
            token,
            user: { uid: user.id, displayName: user.displayName, email: user.email, username: user.username }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).send({ error: 'Failed to log in.' });
    }
});

module.exports = router;