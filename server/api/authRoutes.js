/* File: server/api/authRoutes.js
  Purpose: Add console.log checkpoints to find where the code is hanging.
*/
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

router.use(express.json());

// --- REGISTRATION ROUTE (No changes) ---
router.post('/register', async (req, res) => {
  const { email, password, displayName, username } = req.body;
  // ... (rest of the registration code is the same)
  if (!email || !password || !displayName || !username) {
    return res.status(400).send({ error: 'All fields are required.' });
  }
  try {
    const db = admin.firestore();
    const usernameQuery = await db.collection('users').where('username', '==', username).get();
    if (!usernameQuery.empty) {
      return res.status(400).send({ error: 'Username is already taken.' });
    }
    const userRecord = await admin.auth().createUser({ email, password, displayName });
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      displayName,
      username,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).send({ message: 'User created successfully', uid: userRecord.uid });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
        return res.status(400).send({ error: 'The email address is already in use.' });
    }
    console.error('Error creating user:', error);
    res.status(500).send({ error: 'An internal server error occurred.' });
  }
});


// --- SECURE LOGIN ROUTE (With Debugging Logs) ---
router.post('/login', async (req, res) => {
    console.log("✅ 1. Login route hit on the server."); // Checkpoint 1

    const { token } = req.body;

    if (!token) {
        console.log("❌ Login failed: No token was provided in the request.");
        return res.status(401).send({ error: 'Unauthorized: No token provided.' });
    }

    try {
        console.log("⏳ 2. Attempting to verify token with Firebase Admin SDK..."); // Checkpoint 2
        
        // This is the line that is likely getting stuck.
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        console.log("✅ 3. Token verification successful. UID:", decodedToken.uid); // Checkpoint 3
        
        const uid = decodedToken.uid;
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            console.log(`❌ Error: User with UID ${uid} not found in Firestore.`);
            return res.status(404).send({ error: 'User profile not found in database.' });
        }
        
        const user = userDoc.data();
        
        console.log("✅ 4. User profile found. Sending success response to client.");
        res.status(200).send({
            message: 'Login successful',
            user: {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName
            }
        });

    } catch (error) {
        console.error('❌ SERVER ERROR: The verifyIdToken step failed.', error);
        res.status(401).send({ error: 'Unauthorized: Invalid token.' });
    }
});

module.exports = router;
