/* File: client/src/screens/AuthScreen.jsx
  Purpose: The authentication screen, restyled to match the Gaprio theme.
*/
import React, { useState } from 'react';
import { registerUser, loginUser } from '../services/api';

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#111827' },
  formContainer: { padding: '40px', backgroundColor: '#1F2937', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', width: '380px', textAlign: 'center', border: '1px solid #374151' },
  title: { marginBottom: '24px', color: '#FFFFFF' },
  input: { width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '4px', border: '1px solid #4B5563', fontSize: '16px', backgroundColor: '#374151', color: '#FFFFFF' },
  button: { width: '100%', padding: '12px', backgroundColor: '#8B5CF6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', marginBottom: '16px', fontWeight: 'bold' },
  toggleText: { cursor: 'pointer', color: '#8B5CF6', marginTop: '10px' },
  errorText: { color: '#F87171', marginBottom: '10px' }
};

function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isLogin) {
      try {
        const data = await loginUser({ email, password });
        onLogin(data.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await registerUser({ email, password, displayName, username });
        alert('Registration successful! Please log in.');
        setIsLogin(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h2 style={styles.title}>{isLogin ? 'Login to Your Account' : 'Create a New Account'}</h2>
        {error && <p style={styles.errorText}>{error}</p>}
        <form onSubmit={handleFormSubmit}>
          {!isLogin && (
            <>
              <input
                style={styles.input}
                type="text"
                placeholder="Display Name (e.g., Preet)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <input
                style={styles.input}
                type="text"
                placeholder="Username (e.g., abhx_69)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </>
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        
        <p style={styles.toggleText} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
        </p>
      </div>
    </div>
  );
}

export default AuthScreen;
