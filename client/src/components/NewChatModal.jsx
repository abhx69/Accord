/* File: client/src/components/NewChatModal.jsx
  Purpose: The "New Chat" modal, restyled for the Gaprio theme.
*/
import React, { useState } from 'react';
import { searchUser, createChat } from '../services/api';

const styles = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#1F2937', padding: '30px', borderRadius: '8px', width: '400px', textAlign: 'center', border: '1px solid #374151' },
    input: { width: '70%', padding: '10px', marginRight: '10px', borderRadius: '4px', border: '1px solid #4B5563', backgroundColor: '#374151', color: '#FFFFFF' },
    button: { padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#8B5CF6', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
    errorText: { color: '#F87171', marginTop: '10px' },
    resultContainer: { marginTop: '20px', padding: '15px', border: '1px solid #374151', borderRadius: '4px', backgroundColor: '#111827' },
    closeButton: { marginTop: '20px', backgroundColor: '#4B5563' }
};

function NewChatModal({ currentUser, onClose, onChatCreated }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setSearchResult(null);
        try {
            const user = await searchUser(searchTerm);
            if (user) {
                setSearchResult(user);
            } else {
                setError('No user found with that username.');
            }
        } catch (err) {
            setError('An error occurred during search.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChat = async () => {
        if (!searchResult) return;
        try {
            const chatData = {
                members: [currentUser.uid, searchResult.uid],
                isGroup: false,
                participantInfo: {
                    [currentUser.uid]: currentUser.displayName,
                    [searchResult.uid]: searchResult.displayName,
                }
            };
            const newChat = await createChat(chatData);
            onChatCreated(newChat);
            onClose();
        } catch (err) {
            setError('Failed to create chat.');
        }
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={{color: '#FFFFFF'}}>Start a New Chat</h2>
                <p style={{color: '#9CA3AF'}}>Enter a username to start a conversation.</p>
                <form onSubmit={handleSearch} style={{ display: 'flex', marginBottom: '15px' }}>
                    <input
                        style={styles.input}
                        type="text"
                        placeholder="Search by username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button style={styles.button} type="submit" disabled={loading}>{loading ? '...' : 'Search'}</button>
                </form>
                {error && <p style={styles.errorText}>{error}</p>}
                {searchResult && (
                    <div style={styles.resultContainer}>
                        <p>Found user: <strong>{searchResult.displayName}</strong> (@{searchResult.username})</p>
                        <button style={styles.button} onClick={handleCreateChat}>Start Chat</button>
                    </div>
                )}
                <button style={{...styles.button, ...styles.closeButton}} onClick={onClose}>Close</button>
            </div>
        </div>
    );
}

export default NewChatModal;
