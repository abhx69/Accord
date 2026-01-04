/*
  File: client/src/services/api.js
  Purpose: The complete API service file for interacting with the new SQL backend.
  This version replaces all Firebase authentication with JWT-based authentication.
*/

// We'll store the JWT in memory. For a production app, localStorage would be more persistent.
let authToken = null;

const API_URL = "http://localhost:5001/api";

// Helper function to get the authorization headers
const getAuthHeaders = () => {
  if (!authToken) {
    console.error("Auth token is not available.");
    return { "Content-Type": "application/json" };
  }
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${authToken}`
  };
};

// --- AUTHENTICATION ---

export const registerUser = async (userData) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Registration failed");
  }
  return data;
};

export const loginUser = async (credentials) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }
  // Store the token upon successful login
  authToken = data.token;
  return data;
};

export const logoutUser = () => {
  authToken = null;
};


// --- USERS ---

// NEW FUNCTION to get only contacts the user has chatted with
export const getContacts = async () => {
  const response = await fetch(`${API_URL}/users/contacts`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch contacts");
  }
  return data;
};

// This function was fetching ALL users, which is a privacy issue.
// We are keeping it here but will no longer use it for the contacts list.
export const getUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const searchUser = async (username) => {
  try {
    const response = await fetch(`${API_URL}/users/search?username=${username}`, { headers: getAuthHeaders() });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error("Failed to search for user");
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};


// --- CHATS ---
export const getChats = async () => {
  const response = await fetch(`${API_URL}/chats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch chats");
  }
  return data;
};

export const createChat = async (chatData) => {
  const response = await fetch(`${API_URL}/chats/create`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(chatData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to create chat");
  }
  return data;
};

export const leaveChat = async (chatId) => {
  const response = await fetch(`${API_URL}/chats/${chatId}/leave`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to leave chat");
  }
  return data;
};

export const addMemberToGroup = async (chatId, newMember) => {
  const response = await fetch(`${API_URL}/chats/${chatId}/members/add`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ newMember }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to add member");
  }
  return data;
};

export const removeMemberFromGroup = async (chatId, memberIdToRemove) => {
  const response = await fetch(`${API_URL}/chats/${chatId}/members/remove`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ memberIdToRemove }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to remove member");
  }
  return data;
};


// --- MESSAGES ---

// NEW FUNCTION TO FETCH MESSAGE HISTORY FOR A CHAT
export const getMessagesForChat = async (chatId) => {
  const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch messages");
  }
  return data;
};

export const deleteMessageForEveryone = async (chatId, messageId) => {
  const response = await fetch(`${API_URL}/chats/${chatId}/messages/${messageId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to delete message");
  }
  return { success: true };
};

export const importMessages = async (chatId, messages) => {
  const response = await fetch(`${API_URL}/chats/${chatId}/import`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ messages }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to import messages");
  }
  return data;
};

