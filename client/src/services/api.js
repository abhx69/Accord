/* File: client/src/services/api.js
  Purpose: Add a new function to delete a message.
  Action: Add the deleteMessageForEveryone function.
*/
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from './firebase';

const API_URL = 'http://localhost:5001/api';

// --- registerUser, loginUser, searchUser, createChat functions are unchanged ---
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (credentials) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    const idToken = await userCredential.user.getIdToken();
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: idToken }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed on server');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const searchUser = async (username) => {
    try {
        const response = await fetch(`${API_URL}/users/search?username=${username}`);
        if (response.status === 404) return null;
        if (!response.ok) {
            throw new Error('Failed to search for user');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
};

export const createChat = async (chatData) => {
    try {
        const response = await fetch(`${API_URL}/chats/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chatData),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create chat');
        }
        return data;
    } catch (error) {
        throw error;
    }
};

// --- NEW DELETE MESSAGE FUNCTION ---
export const deleteMessageForEveryone = async (chatId, messageId) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('You must be logged in.');
        
        const token = await user.getIdToken();

        const response = await fetch(`${API_URL}/chats/${chatId}/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete message');
        }

        return { success: true };
    } catch (error) {
        throw error;
    }
};
