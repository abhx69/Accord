/* File: client/src/components/ImportChatModal.jsx
  Purpose: A new component to handle WhatsApp chat file import and parsing.
*/
import React, { useState } from 'react';
import { importMessages } from '../services/api';

const styles = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#1F2937', padding: '30px', borderRadius: '8px', width: '450px', border: '1px solid #374151', textAlign: 'center' },
    button: { padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#8B5CF6', color: 'white', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' },
    closeButton: { backgroundColor: '#4B5563', marginLeft: '10px' },
    infoText: { color: '#9CA3AF' },
    errorText: { color: '#F87171', marginTop: '10px' },
};

function ImportChatModal({ chat, onClose, onImportSuccess }) {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === "text/plain") {
            parseAndUploadFile(file);
        } else {
            setError("Please select a valid .txt file exported from WhatsApp.");
        }
    };

    const parseAndUploadFile = (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            setLoading(true);
            setError('');
            const content = e.target.result;
            const lines = content.split('\n');
            const messages = [];
            
            const messageRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}\s?[ap]m) - (.*?): (.*)/i;

            let currentMessage = null;

            for (const line of lines) {
                const match = line.match(messageRegex);
                if (match) {
                    if (currentMessage) messages.push(currentMessage);
                    currentMessage = { senderName: match[3], text: match[4].trim() };
                } else if (currentMessage) {
                    currentMessage.text += '\n' + line.trim();
                }
            }
            if (currentMessage) messages.push(currentMessage);

            if (messages.length > 0) {
                try {
                    await importMessages(chat.id, messages);
                    onImportSuccess();
                    onClose();
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            } else {
                setError("Could not find any valid WhatsApp messages in this file. The format might be unsupported.");
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={{color: '#FFFFFF', marginTop: 0}}>Import WhatsApp Chat</h2>
                <p style={styles.infoText}>Select a .txt file to add its history to this chat.</p>
                {error && <p style={styles.errorText}>{error}</p>}
                <input type="file" accept=".txt" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                <button style={styles.button} onClick={() => fileInputRef.current.click()} disabled={loading}>
                    {loading ? 'Importing...' : 'Select .txt File'}
                </button>
                <button style={{...styles.button, ...styles.closeButton}} onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
}

export default ImportChatModal;