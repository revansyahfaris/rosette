import React, { useState, useEffect } from 'react';

// Terima properti statis saja, serahkan urusan wordCount secara dinamis ke state internal
export default function StatusBar({ type = 'CHAPTER', draft = 'DRAFT A', model = 'Qwen 2.5 (Local)', isChanged }) {
  // 🌟 State lokal khusus untuk menangkap jumlah kata tanpa membebani App.jsx
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    const handleWordUpdate = (e) => {
      if (e.detail && typeof e.detail.wordCount === 'number') {
        setWordCount(e.detail.wordCount);
      }
    };

    window.addEventListener('rosette-word-count-update', handleWordUpdate);
    return () => window.removeEventListener('rosette-word-count-update', handleWordUpdate);
  }, []);

  return (
    <div style={styles.statusBar}>
      <div style={styles.statusSection}>
        <span>{type}</span>
        <span style={styles.divider}>|</span>
        <span>{draft}</span>
      </div>
      
      <div style={styles.statusSection}>
        {isChanged && <span style={styles.changedBadge}>Uncommitted Changes</span>}
        <span style={styles.modelName}>{model}</span>
        <span style={styles.divider}>|</span>
        <span style={styles.wordCount}>{wordCount.toLocaleString()} words</span>
      </div>
    </div>
  );
}

const styles = {
  statusBar: { height: 'var(--statusbar-h, 24px)', borderTop: '1px solid var(--rose-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 15px', backgroundColor: 'var(--panel-bg)', fontSize: '11px', color: 'var(--rose-400)', userSelect: 'none' },
  statusSection: { display: 'flex', alignItems: 'center', gap: '8px' },
  divider: { opacity: 0.3 },
  modelName: { fontStyle: 'italic', color: 'var(--rose-500)' },
  wordCount: { fontWeight: '600', color: 'var(--rose-700)' },
  changedBadge: { backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: '600' }
};