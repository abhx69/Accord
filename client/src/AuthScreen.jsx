import React, { useState } from 'react';

function AuthScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      // In a real app, you would make an API call to your backend here
      // to register or log in the user.
      // For now, we'll just simulate a successful login.
      const fakeUser = {
        displayName: username,
        uid: `user_${Date.now()}` // Create a simple unique ID
      };
      onLoginSuccess(fakeUser);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <form onSubmit={handleSubmit}>
        <h1>Join Chat</h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          style={{ padding: '10px', fontSize: '16px', width: '250px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', marginLeft: '10px' }}>
          Join
        </button>
      </form>
    </div>
  );
}

export default AuthScreen;