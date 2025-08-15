/* File: server/api/userRoutes.js
  Purpose: Add a new route to search for users by their username.
*/
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Route for: GET /api/users/search?username=some_user
// Searches for a user by their unique username.
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
