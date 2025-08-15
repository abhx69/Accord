import React, { useState, useEffect } from 'react';
import socket from './services/socket';

function ChatScreen({ user, onLogout }) {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    // Connect to the server when the component mounts
    socket.connect();

    // Listen for 'newMessage' events from the server
    socket.on('newMessage', (incomingMessage) => {
      setChatMessages((prevMessages) => [...prevMessages, incomingMessage]);
    });

    // Clean up on component unmount
    return () => {
      socket.off('newMessage');
      socket.disconnect();
    };
  }, []);


  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      const messageData = {
        // In a real app, you'd have a selected room ID
        roomId: 'general',
        message: message,
        senderId: user.uid,
        senderName: user.displayName
      };

      // Emit 'sendMessage' event to the server
      socket.emit('sendMessage', messageData);

      // Add our own message to the chat display immediately
      setChatMessages((prevMessages) => [...prevMessages, { text: message, senderName: 'Me' }]);
      setMessage('');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #ccc' }}>
        <h2>Welcome, {user.displayName}</h2>
        <button onClick={onLogout}>Logout</button>
      </div>

      <div id="message-list" style={{ height: '80vh', overflowY: 'scroll', padding: '10px' }}>
        {chatMessages.map((msg, index) => (
          <p key={index}><strong>{msg.senderName}:</strong> {msg.text}</p>
        ))}
      </div>

      <form onSubmit={handleSendMessage} style={{ padding: '10px', borderTop: '1px solid #ccc' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ width: '80%', padding: '10px' }}
        />
        <button type="submit" style={{ width: '18%', padding: '10px' }}>Send</button>
      </form>
    </div>
  );
}

export default ChatScreen;