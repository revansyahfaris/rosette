import React, { useState } from 'react';
import { Settings, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export default function MusePanel({ editor, isOpen, onClose }) {
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('novel');

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const text = editor ? editor.getText() : "Workspace mode: general worldbuilding and assistance.";
      const res = await invoke('analyze_text', { text });
      setAiResponse(res);
    } catch(e) { setAiResponse(e.toString()); }
    finally { setIsLoading(false); }
  };

  return (
    <aside style={styles.chatPanel}>
      <div style={styles.chatHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: 'var(--rose-600)' }} />
          <span style={styles.chatTitle}>Muse</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={styles.chatSettings}><Settings size={14} /></button>
          <button onClick={onClose} style={styles.chatSettings}>✕</button>
        </div>
      </div>

      <div style={styles.modeTabs}>
        {['novel', 'worldbuild', 'research'].map(mode => (
          <button 
            key={mode}
            style={activeMode === mode ? styles.modeTabActive : styles.modeTab}
            onClick={() => setActiveMode(mode)}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={styles.chatScroll}>
        <div style={styles.consistencyCard}>
          <div style={styles.cardIndicator} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
            <span style={{ fontSize: 14, color: 'var(--rose-50)' }}>✨</span>
            <span style={styles.cardTitle}>CONSISTENCY CHECK</span>
          </div>
          <p style={styles.cardText}>
            "The atmosphere in this chamber feels consistent with your description of the Ashen Court."
          </p>
        </div>
        
        <div style={styles.aiMessage}>
          {aiResponse || 'Awaiting your command...'}
        </div>
      </div>

      <div style={styles.chatInputArea}>
        <div style={styles.quickActions}>
          <button style={styles.quickActionBtn}>Check pacing</button>
          <button style={styles.quickActionBtn}>Suggest next</button>
        </div>
        <div style={styles.inputWrapper}>
          <textarea style={styles.chatInput} placeholder="Ask the Muse..." rows={1} />
          <button 
            onClick={handleAnalyze}
            style={styles.sendBtn}
            disabled={isLoading}
          >
            {isLoading ? '...' : '↑'}
          </button>
        </div>
      </div>
    </aside>
  );
}

const styles = {
  chatPanel: { 
    width: 'var(--chat-w)', 
    backgroundColor: 'var(--chat-bg)', 
    borderLeft: '1px solid var(--rose-100)', 
    display: 'flex', 
    flexDirection: 'column',
    height: '100%'
  },
  chatHeader: { padding: '15px 20px', borderBottom: '1px solid var(--rose-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chatTitle: { fontFamily: 'var(--font-serif-display)', fontSize: '15px', fontWeight: '600', color: 'var(--rose-800)' },
  chatSettings: { background: 'none', border: 'none', color: 'var(--rose-300)', cursor: 'pointer', fontSize: '14px' },
  modeTabs: { display: 'flex', borderBottom: '1px solid var(--rose-100)' },
  modeTab: { flex: 1, padding: '10px 0', border: 'none', background: 'none', fontSize: '9px', fontWeight: '600', color: 'var(--rose-400)', cursor: 'pointer', letterSpacing: '1px' },
  modeTabActive: { flex: 1, padding: '10px 0', border: 'none', background: '#fff0f5', fontSize: '9px', fontWeight: '600', color: 'var(--rose-700)', borderBottom: '2px solid var(--rose-500)', cursor: 'pointer', letterSpacing: '1px' },
  chatScroll: { flex: 1, overflowY: 'auto', padding: '20px' },
  consistencyCard: { backgroundColor: 'white', border: '1px solid var(--rose-100)', borderRadius: '4px', padding: '12px', position: 'relative', marginBottom: '20px', boxShadow: '0 2px 5px rgba(138, 18, 64, 0.05)' },
  cardIndicator: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', backgroundColor: 'var(--rose-500)' },
  cardTitle: { fontSize: '9px', fontWeight: '600', color: 'var(--rose-800)', letterSpacing: '1px' },
  cardText: { fontSize: '12px', color: '#584145', fontStyle: 'italic', lineHeight: '1.5' },
  aiMessage: { fontSize: '12px', color: '#3e0820', lineHeight: '1.6' },
  chatInputArea: { padding: '15px', borderTop: '1px solid var(--rose-100)', backgroundColor: 'white' },
  quickActions: { display: 'flex', gap: '5px', marginBottom: '10px' },
  quickActionBtn: { fontSize: '9px', padding: '3px 8px', border: '1px solid var(--rose-200)', borderRadius: '10px', background: 'none', color: 'var(--rose-600)', cursor: 'pointer' },
  inputWrapper: { position: 'relative' },
  chatInput: { width: '100%', backgroundColor: 'var(--cream)', border: '1px solid var(--rose-100)', borderRadius: '4px', padding: '8px 30px 8px 10px', fontSize: '12px', fontFamily: 'var(--font-serif-prose)', resize: 'none' },
  sendBtn: { position: 'absolute', right: '5px', bottom: '5px', background: 'var(--rose-600)', color: 'white', border: 'none', borderRadius: '4px', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer' }
};
