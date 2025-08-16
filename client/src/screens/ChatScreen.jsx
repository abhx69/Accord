import React, { useState, useEffect } from 'react';
import ChatList from '../components/ChatList';
import MessagePanel from '../components/MessagePanel';
import NewChatModal from '../components/NewChatModal';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { leaveChat } from '../services/api';

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
  const [activeChatId, setActiveChatId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('members', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userChats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChats(userChats);
    });

    return () => unsubscribe();
  }, [user]);

  const activeChat = chats.find(chat => chat.id === activeChatId) || null;

  useEffect(() => {
      if (activeChatId && !activeChat) {
          setActiveChatId(null);
      }
  }, [activeChatId, activeChat, chats]);

  // THIS IS THE FIX: The logic for leaving a chat is now in the parent component.
  const handleLeaveChat = async (chatId) => {
    if (window.confirm("Are you sure you want to leave this chat?")) {
        // Optimistic update for instant UI feedback
        if (activeChatId === chatId) {
            setActiveChatId(null);
        }
        setChats(prevChats => prevChats.filter(c => c.id !== chatId));

        try {
            await leaveChat(chatId); // API call in the background
        } catch (error) {
            alert(error.message);
            // Optional: Add logic to revert the state change if API fails
        }
    }
  };

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
                    chats={chats}
                    user={user} 
                    onSelectChat={(chat) => setActiveChatId(chat.id)} 
                    activeChatId={activeChatId}
                    onNewChat={() => setIsModalOpen(true)}
                    onLeaveChat={handleLeaveChat} // Pass the new handler down
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