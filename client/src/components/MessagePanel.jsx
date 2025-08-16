/* File: client/src/components/MessagePanel.jsx
  Purpose: Make the header clickable for group chats to open the new modal.
*/
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { deleteMessageForEveryone } from '../services/api';
import GroupInfoModal from './GroupInfoModal'; // Import the new modal

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' },
  header: { padding: '15px 20px', borderBottom: '1px solid #374151', backgroundColor: '#1F2937' },
  groupHeader: { cursor: 'pointer' }, // Make group headers clickable
  chatName: { fontWeight: 'bold', fontSize: '18px', color: '#FFFFFF' },
  messageArea: { flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  messageInputForm: { display: 'flex', padding: '10px', borderTop: '1px solid #374151', backgroundColor: '#1F2937' },
  input: { flexGrow: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #4B5563', marginRight: '10px', backgroundColor: '#374151', color: '#FFFFFF' },
  sendButton: { padding: '10px 20px', borderRadius: '20px', border: 'none', backgroundColor: '#8B5CF6', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
  messageWrapper: { display: 'flex', marginBottom: '10px', maxWidth: '80%', position: 'relative' },
  myMessageWrapper: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  otherMessageWrapper: { alignSelf: 'flex-start' },
  messageBubble: { padding: '10px 15px', borderRadius: '20px', wordWrap: 'break-word' },
  myMessage: { backgroundColor: '#8B5CF6', color: 'white' },
  otherMessage: { backgroundColor: '#374151', color: '#D1D5DB' },
  senderName: { fontSize: '12px', color: '#9CA3AF', marginBottom: '4px', fontWeight: 'bold' },
  scrollAnchor: { height: '1px' },
  optionsButton: { background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '5px', marginLeft: '8px', marginRight: '8px', fontSize: '16px', lineHeight: '1' },
  inlineOptions: { display: 'flex', alignItems: 'center', marginLeft: '8px', marginRight: '8px' },
  inlineButton: { background: '#4B5563', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', marginLeft: '5px' }
};

function MessagePanel({ user, chat }) {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [optionsMessageId, setOptionsMessageId] = useState(null);
  const scrollAnchorRef = useRef(null);

  useEffect(() => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!chat?.id) return;
    setOptionsMessageId(null);
    const messagesRef = collection(db, 'chats', chat.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [chat]);

  const handleSendMessage = async (event) => {
    event.preventDefault(); 
    if (newMessage.trim() === '') return;
    const messagesRef = collection(db, 'chats', chat.id, 'messages');
    await addDoc(messagesRef, {
      text: newMessage,
      senderId: user.uid,
      senderName: user.displayName,
      timestamp: serverTimestamp(),
    });
    setNewMessage('');
  };

  const handleUnsendForMe = (messageId) => {
    setMessages(messages.filter(m => m.id !== messageId));
  };

  const handleUnsendForEveryone = async (messageId) => {
    try {
        await deleteMessageForEveryone(chat.id, messageId);
    } catch (error) {
        console.error("Failed to unsend for everyone:", error);
        alert(error.message);
    }
  };
  
  const getChatDisplayName = (chat) => {
    if (!chat) return '';
    if (chat.isGroup) return chat.name;
    const otherUserId = chat.members.find(uid => uid !== user.uid);
    return chat.participantInfo?.[otherUserId] || 'Direct Message';
  };

  if (!chat) {
    return (
      <div style={{...styles.container, justifyContent: 'center', alignItems: 'center'}}>
        <h2 style={{color: '#9CA3AF'}}>Select a chat to start messaging</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div 
        style={{...styles.header, ...(chat.isGroup ? styles.groupHeader : {})}}
        onClick={() => chat.isGroup && setIsGroupInfoOpen(true)}
      >
        <div style={styles.chatName}>{getChatDisplayName(chat)}</div>
      </div>
      
      <div style={styles.messageArea}>
        {messages.map(msg => (
          <div 
            key={msg.id} 
            style={{
              ...styles.messageWrapper,
              ...(msg.senderId === user.uid ? styles.myMessageWrapper : styles.otherMessageWrapper)
            }}
            onMouseEnter={() => setHoveredMessageId(msg.id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            <div 
              style={{
                ...styles.messageBubble,
                ...(msg.senderId === user.uid ? styles.myMessage : styles.otherMessage)
              }}
            >
              {msg.senderId !== user.uid && <div style={styles.senderName}>{msg.senderName}</div>}
              {msg.text}
            </div>

            {msg.senderId === user.uid && hoveredMessageId === msg.id && (
              optionsMessageId === msg.id ? (
                <div style={styles.inlineOptions}>
                  <button style={styles.inlineButton} onClick={() => handleUnsendForMe(msg.id)}>Delete for me</button>
                  <button style={styles.inlineButton} onClick={() => handleUnsendForEveryone(msg.id)}>Delete for all</button>
                </div>
              ) : (
                <button style={styles.optionsButton} onClick={() => setOptionsMessageId(msg.id)}>
                  &#x22EE;
                </button>
              )
            )}
          </div>
        ))}
        <div ref={scrollAnchorRef} style={styles.scrollAnchor}></div>
      </div>

      <form style={styles.messageInputForm} onSubmit={handleSendMessage}>
        <input 
          style={styles.input} 
          type="text" 
          placeholder="Type a message..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button style={styles.sendButton} type="submit">Send</button>
      </form>

      {isGroupInfoOpen && (
        <GroupInfoModal chat={chat} currentUser={user} onClose={() => setIsGroupInfoOpen(false)} />
      )}
    </div>
  );
}

export default MessagePanel;
