import React, { useState, useEffect } from 'react';
import ChatList from '../components/ChatList';
import MessagePanel from '../components/MessagePanel';
import NewChatModal from '../components/NewChatModal';
import { leaveChat, getChats } from '../services/api';
import socket from '../services/socket';

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
    
    // Fetch initial chat list via API
    const fetchUserChats = async () => {
      try {
        const userChats = await getChats();
        setChats(userChats);
      } catch (error) {
        console.error("Failed to fetch chats:", error);
      }
    };
    fetchUserChats();

    // Listen for real-time updates (e.g., if you are added to a new chat)
    // Note: You would need to implement this 'newChat' event on your server
    const handleNewChat = (newChat) => {
        // Check if user is a member of the new chat
        if (newChat.members.includes(user.uid)) {
            setChats(prevChats => [...prevChats, newChat]);
        }
    };
    socket.on('newChat', handleNewChat);

    return () => {
        socket.off('newChat', handleNewChat);
    };

  }, [user]);

  const activeChat = chats.find(chat => chat.id === activeChatId) || null;

  useEffect(() => {
      if (activeChatId && !activeChat) {
          setActiveChatId(null);
      }
  }, [activeChatId, activeChat, chats]);

  const handleLeaveChat = async (chatId) => {
    if (window.confirm("Are you sure you want to leave this chat?")) {
        try {
            await leaveChat(chatId);
            if (activeChatId === chatId) {
                setActiveChatId(null);
            }
            setChats(prevChats => prevChats.filter(c => c.id !== chatId));
        } catch (error) {
            alert(error.message);
        }
    }
  };
  
  const handleChatCreated = (newChatInfo) => {
    // After creating a chat, refetch the list to see it immediately.
    getChats().then(setChats);
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
                    onLeaveChat={handleLeaveChat}
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
                onChatCreated={handleChatCreated}
            />
        )}
    </div>
  );
}

export default ChatScreen;

