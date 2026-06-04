import React from 'react';

export default function StatusBar({ draft, wordCount, model }) {
  return (
    <footer style={styles.footer}>
      <div style={styles.section}>
        <span style={styles.item}>● {draft || 'Draft A'}</span>
        <span style={styles.item}>Saved</span>
      </div>
      
      <div style={styles.section}>
        <span style={styles.item}>{model || 'qwen2.5:7b'}</span>
        <span style={styles.item}>{wordCount || 0} words</span>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    height: 'var(--status-h)',
    backgroundColor: 'var(--rose-700)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    color: 'rgba(255,255,255,0.75)',
    fontSize: '10.5px',
    fontFamily: 'var(--font-serif-prose)',
    flexShrink: 0
  },
  section: { display: 'flex', gap: '20px' },
  item: { letterSpacing: '0.5px' }
};
