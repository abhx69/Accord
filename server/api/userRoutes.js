/* File: server/api/userRoutes.js
  Purpose: Add a new route to fetch all users.
*/
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// --- NEW ROUTE TO GET ALL USERS ---
// Route for: GET /api/users
router.get('/', async (req, res) => {
    try {
        const listUsersResult = await admin.auth().listUsers(1000); // Max 1000 users
        const users = listUsersResult.users.map(userRecord => {
            return {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                // We need to fetch the username from Firestore
            };
        });
        
        // To get usernames, we need to query Firestore
        const db = admin.firestore();
        const usersFromDb = await db.collection('users').get();
        const usernames = {};
        usersFromDb.forEach(doc => {
            usernames[doc.id] = doc.data().username;
        });

        const fullUserList = users.map(user => ({
            ...user,
            username: usernames[user.uid] || ''
        }));

        res.status(200).send(fullUserList);
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).send({ error: 'Failed to list users.' });
    }
});


// --- SEARCH ROUTE (No changes needed) ---
router.get('/search', async (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).send({ error: 'A username query parameter is required.' });
    }
    try {
        const db = admin.firestore();
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('username', '==', username).limit(1).get();
        if (querySnapshot.empty) {
            return res.status(404).send({ message: 'User not found.' });
        }
        const user = querySnapshot.docs[0].data();
        res.status(200).send(user);
    } catch (error) {
        console.error('Error searching for user:', error);
        res.status(500).send({ error: 'Failed to search for user.' });
    }
});

module.exports = router;
