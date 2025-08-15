/* File: client/src/App.jsx
  Purpose: The main component. It will decide whether to show the 
           login screen or the main chat screen based on if a user is logged in.
*/
import React, { useState } from 'react';
import AuthScreen from './screens/AuthScreen';
import ChatScreen from './screens/ChatScreen';

function App() {
  // We'll use this state to manage if the user is logged in or not.
  // For now, we'll set it to 'false' to show the login screen.
  const [user, setUser] = useState(null); 

  // This is a placeholder function to simulate logging in.
  // We will replace this later with a real call to our backend.
  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  // This is a placeholder function for logging out.
  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="App">
      {user ? (
        // If the user is logged in, show the chat screen
        <ChatScreen user={user} onLogout={handleLogout} />
      ) : (
        // If the user is not logged in, show the authentication screen
        <AuthScreen onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;

