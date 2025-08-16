/* File: client/src/components/GroupInfoModal.jsx
  Purpose: A brand new component for the group member list pop-up.
*/
import React from 'react';

const styles = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#1F2937', padding: '30px', borderRadius: '8px', width: '400px', border: '1px solid #374151', maxHeight: '80vh' },
    memberList: { listStyle: 'none', padding: 0, margin: '20px 0', overflowY: 'auto' },
    memberItem: { padding: '10px', borderRadius: '4px', marginBottom: '5px', color: '#D1D5DB' },
    ownerText: { fontSize: '12px', color: '#8B5CF6', marginLeft: '8px' },
    button: { padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#4B5563', color: 'white', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' },
};

function GroupInfoModal({ chat, onClose }) {
    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={{color: '#FFFFFF', marginTop: 0}}>{chat.name}</h2>
                <p style={{color: '#9CA3AF'}}>{chat.members.length} Members</p>
                <ul style={styles.memberList}>
                    {chat.members.map(uid => (
                        <li key={uid} style={styles.memberItem}>
                            {chat.participantInfo[uid] || 'Unknown User'}
                            {uid === chat.createdBy && <span style={styles.ownerText}>(owner)</span>}
                        </li>
                    ))}
                </ul>
                <button style={styles.button} onClick={onClose}>Close</button>
            </div>
        </div>
    );
}

export default GroupInfoModal;

