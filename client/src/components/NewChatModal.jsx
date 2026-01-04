/*
  File: client/src/components/NewChatModal.jsx
  Purpose: Rebuilt to fetch contacts from the SQL API instead of Firestore.
*/
import React, { useState, useEffect } from 'react';
import { searchUser, createChat, getUsers } from '../services/api'; // <-- Import getUsers

const styles = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#1F2937', padding: '30px', borderRadius: '8px', width: '450px', border: '1px solid #374151', display: 'flex', flexDirection: 'column', maxHeight: '80vh' },
    tabs: { display: 'flex', borderBottom: '1px solid #374151', marginBottom: '20px' },
    tab: { padding: '10px 20px', cursor: 'pointer', color: '#9CA3AF' },
    activeTab: { color: '#FFFFFF', borderBottom: '2px solid #8B5CF6' },
    userList: { listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flexGrow: 1 },
    userItem: { display: 'flex', alignItems: 'center', padding: '10px', borderRadius: '4px', cursor: 'pointer', marginBottom: '5px' },
    userItemSelected: { backgroundColor: '#374151' },
    checkbox: { marginRight: '15px', width: '18px', height: '18px' },
    groupInput: { width: '100%', padding: '10px', marginTop: '15px', borderRadius: '4px', border: '1px solid #4B5563', backgroundColor: '#374151', color: '#FFFFFF' },
    button: { padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#8B5CF6', color: 'white', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' },
    closeButton: { backgroundColor: '#4B5563', marginLeft: '10px' },
    errorText: { color: '#F87171', marginTop: '10px' },
    searchInput: { width: '70%', padding: '10px', marginRight: '10px', borderRadius: '4px', border: '1px solid #4B5563', backgroundColor: '#374151', color: '#FFFFFF' },
    searchButton: { padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#8B5CF6', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
    resultContainer: { marginTop: '20px', padding: '15px', border: '1px solid #374151', borderRadius: '4px', backgroundColor: '#111827' },
};

function NewChatModal({ currentUser, onClose, onChatCreated }) {
    const [activeTab, setActiveTab] = useState('contacts');
    const [contacts, setContacts] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResult, setSearchResult] = useState(null);

    // --- REFACTORED LOGIC ---
    // This now fetches all users from your API to act as a contacts list.
    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const allUsers = await getUsers();
                // Filter out the current user from the contacts list
                setContacts(allUsers.filter(user => user.uid !== currentUser.uid));
            } catch (err) {
                setError('Could not load contacts.');
                console.error(err);
            }
        };
        if (activeTab === 'contacts') {
            fetchContacts();
        }
    }, [currentUser, activeTab]);

    const handleUserSelect = (user) => {
        setSelectedUsers(prev =>
            prev.some(u => u.uid === user.uid)
                ? prev.filter(u => u.uid !== user.uid)
                : [...prev, user]
        );
    };

    const handleCreateChat = async () => {
        if (selectedUsers.length === 0) {
            setError('Please select at least one user.');
            return;
        }
        const isGroup = selectedUsers.length > 1;
        if (isGroup && !groupName.trim()) {
            setError('Please enter a group name.');
            return;
        }

        setLoading(true);
        try {
            // The 'members' payload for the API is an array of user objects
            const chatData = { 
                members: selectedUsers, 
                isGroup, 
                name: isGroup ? groupName : ''
            };
            const newChat = await createChat(chatData);
            onChatCreated(newChat);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={{color: '#FFFFFF', marginTop: 0}}>Start a Conversation</h2>
                <div style={styles.tabs}>
                    <div style={{...styles.tab, ...(activeTab === 'contacts' ? styles.activeTab : {})}} onClick={() => setActiveTab('contacts')}>Contacts</div>
                    <div style={{...styles.tab, ...(activeTab === 'search' ? styles.activeTab : {})}} onClick={() => setActiveTab('search')}>Search</div>
                </div>

                {error && <p style={styles.errorText}>{error}</p>}

                {activeTab === 'contacts' && (
                    <ul style={styles.userList}>
                        {contacts.map(user => (
                            <li key={user.uid} style={{...styles.userItem, ...(selectedUsers.some(su => su.uid === user.uid) ? styles.userItemSelected : {})}} onClick={() => handleUserSelect(user)}>
                                <input type="checkbox" style={styles.checkbox} readOnly checked={selectedUsers.some(su => su.uid === user.uid)} />
                                <div>
                                    <div>{user.displayName}</div>
                                    <div style={{fontSize: '12px', color: '#9CA3AF'}}>@{user.username}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {activeTab === 'search' && (
                    <div>
                        <form onSubmit={handleSearch} style={{ display: 'flex', marginBottom: '15px' }}>
                            <input style={styles.searchInput} type="text" placeholder="Search by username..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            <button style={styles.searchButton} type="submit" disabled={loading}>{loading ? '...' : 'Search'}</button>
                        </form>
                        {searchResult && (
                            <div style={styles.resultContainer}>
                                <li style={{...styles.userItem, ...(selectedUsers.some(su => su.uid === searchResult.uid) ? styles.userItemSelected : {})}} onClick={() => handleUserSelect(searchResult)}>
                                    <input type="checkbox" style={styles.checkbox} readOnly checked={selectedUsers.some(su => su.uid === searchResult.uid)} />
                                    <div>
                                        <div>{searchResult.displayName}</div>
                                        <div style={{fontSize: '12px', color: '#9CA3AF'}}>@{searchResult.username}</div>
                                    </div>
                                </li>
                            </div>
                        )}
                    </div>
                )}

                {selectedUsers.length > 1 && (
                    <input style={styles.groupInput} type="text" placeholder="Enter group name..." value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                )}

                <div>
                    <button style={styles.button} onClick={handleCreateChat} disabled={loading}>
                        {loading ? 'Creating...' : `Create Chat (${selectedUsers.length})`}
                    </button>
                    <button style={{...styles.button, ...styles.closeButton}} onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

export default NewChatModal;
