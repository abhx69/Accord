/* File: client/src/components/MessagePanel.jsx
  Purpose: The final, complete version with all features integrated.
*/
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import io from 'socket.io-client';
import GroupInfoModal from './GroupInfoModal';
import { deleteMessageForEveryone } from '../services/api';
import ImportChatModal from './ImportChatModal';

const SERVER_URL = 'http://localhost:5001';

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #374151', backgroundColor: '#1F2937' },
  headerLeft: { display: 'flex', alignItems: 'center' },
  groupHeader: { cursor: 'pointer' },
  chatName: { fontWeight: 'bold', fontSize: '18px', color: '#FFFFFF' },
  importButton: { background: 'none', border: '1px solid #4B5563', color: '#9CA3AF', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', marginLeft: '15px', fontSize: '12px' },
  messageArea: { flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  messageInputForm: { display: 'flex', padding: '10px', borderTop: '1px solid #374151', backgroundColor: '#1F2937', alignItems: 'center' },
  analyzeButton: { padding: '8px 12px', borderRadius: '20px', border: '1px solid #4B5563', backgroundColor: 'transparent', color: '#9CA3AF', cursor: 'pointer', marginRight: '10px' },
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
  aiThinking: { fontStyle: 'italic', color: '#9CA3AF', alignSelf: 'flex-start', padding: '10px 20px' },
  optionsButton: { background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '5px', marginLeft: '8px', marginRight: '8px', fontSize: '16px', lineHeight: '1' },
  inlineOptions: { display: 'flex', alignItems: 'center', marginLeft: '8px', marginRight: '8px' },
  inlineButton: { background: '#4B5563', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', marginLeft: '5px' }
};

function MessagePanel({ user, chat }) {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [optionsMessageId, setOptionsMessageId] = useState(null);
  const scrollAnchorRef = useRef(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    newSocket.on('connect', () => {
        if (chat?.id) newSocket.emit('joinRoom', chat.id);
    });
    newSocket.on('newMessage', (msg) => {
        setIsAiThinking(false);
        setMessages(prev => [...prev.filter(m => !m.id.toString().startsWith('temp_')), msg]);
    });
    newSocket.on('aiThinking', () => setIsAiThinking(true));
    newSocket.on('analysisComplete', () => setIsAnalyzing(false));
    newSocket.on('errorMessage', (data) => {
        alert(data.error);
        setIsAnalyzing(false);
    });
    return () => newSocket.close();
  }, [chat]);

  useEffect(() => {
    if (!chat?.id) {
        setMessages([]);
        return;
    };
    const messagesRef = collection(db, 'chats', chat.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [chat]);

  useEffect(() => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiThinking]);

  const handleSendMessage = (event) => {
    event.preventDefault(); 
    if (newMessage.trim() === '' || !socket) return;
    socket.emit('sendMessage', {
      roomId: chat.id, message: newMessage,
      senderId: user.uid, senderName: user.displayName,
    });
    const tempId = `temp_${Date.now()}`;
    setMessages([...messages, { id: tempId, text: newMessage, senderId: user.uid, senderName: user.displayName }]);
    setNewMessage('');
  };

  const handleAnalyzeClick = () => {
      if (!socket || isAnalyzing) return;
      setIsAnalyzing(true);
      socket.emit('analyzeChat', { roomId: chat.id });
  };

  const handleUnsendForMe = (messageId) => {
    setMessages(messages.filter(m => m.id !== messageId));
  };

  const handleUnsendForEveryone = async (messageId) => {
    try {
        await deleteMessageForEveryone(chat.id, messageId);
    } catch (error) {
        alert(error.message);
    }
  };
  
  const getChatDisplayName = (chat) => {
    if (!chat) return '';
    if (chat.isGroup) return chat.name;
    const otherUserId = chat.members.find(uid => uid !== user.uid);
    return chat.participantInfo?.[otherUserId] || 'Direct Message';
  };

  const handleImportSuccess = () => {
    console.log("Import successful, messages will now appear.");
  };

  if (!chat) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{color: '#9CA3AF'}}>Select a chat to start messaging</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
            <div 
                style={{...(chat.isGroup ? styles.groupHeader : {})}}
                onClick={() => chat.isGroup && setIsGroupInfoOpen(true)}
            >
                <div style={styles.chatName}>{getChatDisplayName(chat)}</div>
            </div>
            <button style={styles.importButton} onClick={() => setIsImportModalOpen(true)}>Import</button>
        </div>
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
        {isAiThinking && <div style={styles.aiThinking}>Accord AI is thinking...</div>}
        <div ref={scrollAnchorRef} style={styles.scrollAnchor}></div>
      </div>
      <form style={styles.messageInputForm} onSubmit={handleSendMessage}>
        <button type="button" style={styles.analyzeButton} onClick={handleAnalyzeClick} disabled={isAnalyzing}>
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </button>
        <input 
          style={styles.input} 
          type="text" 
          placeholder="Type a message or @ai..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button style={styles.sendButton} type="submit">Send</button>
      </form>

      {isGroupInfoOpen && (
        <GroupInfoModal chat={chat} currentUser={user} onClose={() => setIsGroupInfoOpen(false)} />
      )}

      {isImportModalOpen && (
        <ImportChatModal 
            chat={chat}
            onClose={() => setIsImportModalOpen(false)}
            onImportSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}

export default MessagePanel;
