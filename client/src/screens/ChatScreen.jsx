/* File: client/src/screens/ChatScreen.jsx
  Purpose: This component now manages the real-time chat list to ensure data is always fresh.
*/
import React, { useState, useEffect } from 'react';
import ChatList from '../components/ChatList';
import MessagePanel from '../components/MessagePanel';
import NewChatModal from '../components/NewChatModal';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const styles = {
  screenContainer: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#111827' },
  chatContainer: { display: 'flex', flexGrow: 1, overflow: 'hidden' },
  sidebar: { width: '30%', maxWidth: '350px', minWidth: '250px', backgroundColor: '#1F2937' },
  mainContent: { flexGrow: 1, backgroundColor: '#111827' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: '#1F2937', borderBottom: '1px solid #374151', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center' },
  logo: { height: '30px', marginRight: '15px' },
  welcomeText: { margin: 0, color: '#D1D5DB' },
  logoutButton: { padding: '8px 15px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

function ChatScreen({ user, onLogout }) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // THIS IS THE FIX: The real-time listener is now in the parent component.
  useEffect(() => {
    if (!user?.uid) return;
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('members', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userChats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChats(userChats);

        // If there's an active chat, find its updated version and refresh the state
        if (activeChat?.id) {
            const updatedActiveChat = userChats.find(chat => chat.id === activeChat.id);
            if (updatedActiveChat) {
                setActiveChat(updatedActiveChat);
            } else {
                setActiveChat(null); // Active chat was deleted or user was removed
            }
        }
    });

    return () => unsubscribe();
  }, [user, activeChat?.id]); // Reruns if the user or active chat changes

  return (
    <div style={styles.screenContainer}>
        <div style={styles.header}>
            <div style={styles.headerLeft}>
                <img src="/logo.png" alt="App Logo" style={styles.logo} />
                <p style={styles.welcomeText}>Welcome, <strong>{user.displayName}</strong>!</p>
            </div>
            <button style={styles.logoutButton} onClick={onLogout}>Logout</button>
        </div>
        <div style={styles.chatContainer}>
            <div style={styles.sidebar}>
                <ChatList 
                    chats={chats} // Pass the live chat list down as a prop
                    user={user} 
                    onSelectChat={setActiveChat} 
                    activeChatId={activeChat?.id}
                    onNewChat={() => setIsModalOpen(true)}
                />
            </div>
            <div style={styles.mainContent}>
                <MessagePanel user={user} chat={activeChat} />
            </div>
        </div>
        {isModalOpen && (
            <NewChatModal 
                currentUser={user}
                onClose={() => setIsModalOpen(false)}
                onChatCreated={(newChat) => {
                    console.log("New chat created:", newChat);
                }}
            />
        )}
    </div>
  );
}

export default ChatScreen;