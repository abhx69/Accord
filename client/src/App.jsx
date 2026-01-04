import React, { useState } from 'react';
import AuthScreen from './screens/AuthScreen';
import ChatScreen from './screens/ChatScreen';
import { logoutUser } from './services/api';
import socket from './services/socket';


function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (loginData) => {
    setUser(loginData.user);
    // Connect to the socket server after successful login
    socket.connect();
  };

  const handleLogout = () => {
    logoutUser(); // Clear the token from api.js
    setUser(null);
    // Disconnect from the socket server on logout
    socket.disconnect();
  };

  return (
    <div className="App">
      {user ? (
        <ChatScreen user={user} onLogout={handleLogout} />
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
