import React, { useState } from 'react';

const styles = {
  container: { borderRight: '1px solid #374151', height: '100%', display: 'flex', flexDirection: 'column' },
  newChatButtonContainer: { padding: '15px', borderBottom: '1px solid #374151' },
  newChatButton: { width: '100%', padding: '10px', backgroundColor: '#8B5CF6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  searchContainer: { padding: '10px 15px', borderBottom: '1px solid #374151' },
  searchInput: { width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #4B5563', backgroundColor: '#374151', color: '#FFFFFF' },
  chatList: { flexGrow: 1, overflowY: 'auto' },
  chatItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #374151', cursor: 'pointer' },
  activeChatItem: { backgroundColor: '#374151' },
  chatName: { fontWeight: 'bold', marginBottom: '5px', color: '#FFFFFF' },
  lastMessage: { fontSize: '14px', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  leaveButton: { background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '18px', padding: '0 5px' }
};

// The onLeaveChat prop is now received from ChatScreen
function ChatList({ chats, user, onSelectChat, activeChatId, onNewChat, onLeaveChat }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [hoveredChatId, setHoveredChatId] = useState(null);

    const handleLeaveClick = (e, chatId) => {
        e.stopPropagation();
        onLeaveChat(chatId); // Just call the function from the parent
    };

    const getChatDisplayName = (chat) => {
        if (chat.isGroup) {
            return chat.name;
        }
        const otherUserId = chat.members.find(uid => uid !== user.uid);
        return chat.participantInfo?.[otherUserId] || 'Direct Message';
    };

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
                        onMouseEnter={() => setHoveredChatId(chat.id)}
                        onMouseLeave={() => setHoveredChatId(null)}
                    >
                        <div>
                            <div style={styles.chatName}>{getChatDisplayName(chat)}</div>
                            <div style={styles.lastMessage}>{chat.lastMessage?.text || '...'}</div>
                        </div>
                        {hoveredChatId === chat.id && (
                            <button style={styles.leaveButton} onClick={(e) => handleLeaveClick(e, chat.id)}>
                                &times;
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ChatList;