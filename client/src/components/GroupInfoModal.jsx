/* File: client/src/components/GroupInfoModal.jsx
*/
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { addMemberToGroup, removeMemberFromGroup } from '../services/api';

const styles = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#1F2937', padding: '30px', borderRadius: '8px', width: '400px', border: '1px solid #374151', maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
    memberList: { listStyle: 'none', padding: 0, margin: '20px 0', overflowY: 'auto' },
    memberItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: '4px', marginBottom: '5px', color: '#D1D5DB' },
    ownerText: { fontSize: '12px', color: '#8B5CF6', marginLeft: '8px' },
    removeButton: { background: 'none', border: '1px solid #EF4444', color: '#F87171', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px' },
    addMembersSection: { borderTop: '1px solid #374151', marginTop: '20px', paddingTop: '20px' },
    addMemberItem: { display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderRadius: '4px' },
    addMemberItemSelected: { backgroundColor: '#374151' },
    checkbox: { marginRight: '10px' },
    button: { padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#4B5563', color: 'white', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' },
    addButton: { backgroundColor: '#28a745', marginLeft: '10px' },
};

function GroupInfoModal({ chat, currentUser, onClose }) {
    const [contacts, setContacts] = useState([]);
    const [selectedToAdd, setSelectedToAdd] = useState([]);
    const isOwner = chat.createdBy === currentUser.uid;

    useEffect(() => {
        if (!isOwner) return;
        const fetchContacts = async () => {
            try {
                const chatsRef = collection(db, 'chats');
                const q = query(chatsRef, where('members', 'array-contains', currentUser.uid));
                const querySnapshot = await getDocs(q);

                const userIds = new Set();
                querySnapshot.forEach(doc => {
                    doc.data().members.forEach(memberId => {
                        if (memberId !== currentUser.uid) userIds.add(memberId);
                    });
                });

                const potentialMembers = Array.from(userIds).filter(id => !chat.members.includes(id));
                
                if (potentialMembers.length > 0) {
                    const usersRef = collection(db, 'users');
                    const usersQuery = query(usersRef, where('uid', 'in', potentialMembers));
                    const usersSnapshot = await getDocs(usersQuery);
                    setContacts(usersSnapshot.docs.map(doc => doc.data()));
                }
            } catch (err) {
                console.error("Could not load contacts:", err);
            }
        };
        fetchContacts();
    }, [chat, currentUser, isOwner]);

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;
        try {
            await removeMemberFromGroup(chat.id, memberId);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleAddMembers = async () => {
        if (selectedToAdd.length === 0) return;
        try {
            for (const userToAdd of selectedToAdd) {
                await addMemberToGroup(chat.id, { uid: userToAdd.uid, displayName: userToAdd.displayName });
            }
            setSelectedToAdd([]);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleSelectUserToAdd = (user) => {
        setSelectedToAdd(prev =>
            prev.some(u => u.uid === user.uid)
                ? prev.filter(u => u.uid !== user.uid)
                : [...prev, user]
        );
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={{color: '#FFFFFF', marginTop: 0}}>{chat.name}</h2>
                <p style={{color: '#9CA3AF'}}>{chat.members.length} Members</p>
                <ul style={styles.memberList}>
                    {chat.members.map(uid => (
                        <li key={uid} style={styles.memberItem}>
                            <span>
                                {/* THIS IS THE FIX: Using optional chaining (?.) */}
                                {chat.participantInfo?.[uid] || 'Unknown User'}
                                {uid === chat.createdBy && <span style={styles.ownerText}>(owner)</span>}
                            </span>
                            {isOwner && uid !== currentUser.uid && (
                                <button style={styles.removeButton} onClick={() => handleRemoveMember(uid)}>Remove</button>
                            )}
                        </li>
                    ))}
                </ul>

                {isOwner && contacts.length > 0 && (
                    <div style={styles.addMembersSection}>
                        <h3 style={{color: '#FFFFFF', marginTop: 0}}>Add Members</h3>
                        <ul style={{listStyle: 'none', padding: 0, maxHeight: '150px', overflowY: 'auto'}}>
                            {contacts.map(contact => (
                                <li key={contact.uid} style={{...styles.addMemberItem, ...(selectedToAdd.some(su => su.uid === contact.uid) ? styles.addMemberItemSelected : {})}} onClick={() => handleSelectUserToAdd(contact)}>
                                    <input type="checkbox" style={styles.checkbox} readOnly checked={selectedToAdd.some(su => su.uid === contact.uid)} />
                                    {contact.displayName}
                                </li>
                            ))}
                        </ul>
                        <button style={{...styles.button, ...styles.addButton}} onClick={handleAddMembers}>Add Selected ({selectedToAdd.length})</button>
                    </div>
                )}

                <button style={styles.button} onClick={onClose}>Close</button>
            </div>
        </div>
    );
}

export default GroupInfoModal;
