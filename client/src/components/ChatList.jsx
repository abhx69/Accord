/* File: client/src/components/ChatList.jsx
  Purpose: The chat list sidebar, with a new search bar.
*/
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const styles = {
  container: { borderRight: '1px solid #374151', height: '100%', display: 'flex', flexDirection: 'column' },
  newChatButtonContainer: { padding: '15px', borderBottom: '1px solid #374151' },
  newChatButton: { width: '100%', padding: '10px', backgroundColor: '#8B5CF6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  searchContainer: { padding: '10px 15px', borderBottom: '1px solid #374151' },
  searchInput: { width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #4B5563', backgroundColor: '#374151', color: '#FFFFFF' },
  chatList: { flexGrow: 1, overflowY: 'auto' },
  chatItem: { padding: '15px 20px', borderBottom: '1px solid #374151', cursor: 'pointer' },
  activeChatItem: { backgroundColor: '#374151' },
  chatName: { fontWeight: 'bold', marginBottom: '5px', color: '#FFFFFF' },
  lastMessage: { fontSize: '14px', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
};

function ChatList({ user, onSelectChat, activeChatId, onNewChat }) {
    const [chats, setChats] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); // New state for the search term

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

    const getChatDisplayName = (chat) => {
        if (chat.isGroup) {
            return chat.name;
        }
        const otherUserId = chat.members.find(uid => uid !== user.uid);
        return chat.participantInfo?.[otherUserId] || 'Direct Message';
    };

    // Filter chats based on the search term
    const filteredChats = chats.filter(chat => 
        getChatDisplayName(chat).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={styles.container}>
            <div style={styles.newChatButtonContainer}>
                <button style={styles.newChatButton} onClick={onNewChat}>+ New Chat</button>
            </div>
            <div style={styles.searchContainer}>
                <input 
                    type="text"
                    placeholder="Search chats..."
                    style={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div style={styles.chatList}>
                {filteredChats.map(chat => (
                    <div 
                        key={chat.id} 
                        style={{...styles.chatItem, ...(chat.id === activeChatId ? styles.activeChatItem : {})}}
                        onClick={() => onSelectChat(chat)}
                    >
                        <div style={styles.chatName}>{getChatDisplayName(chat)}</div>
                        <div style={styles.lastMessage}>{chat.lastMessage?.text || '...'}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ChatList;