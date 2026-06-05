import React from 'react';

export default function StatusBar({ type, draft, wordCount, model, isChanged = false }) {
  return (
    <footer style={styles.footer}>
      <div style={styles.section}>
        <span style={styles.item}>TYPE: {type || 'CHAPTER'}</span>
        <span style={styles.item}>● {draft || 'DRAFT A'}</span>
        <span style={styles.item}>{isChanged ? 'CHANGED' : 'UNCHANGED'}</span>
      </div>
      
      <div style={styles.section}>
        <span style={styles.item}>{model}</span>
        <span style={styles.item}>{wordCount.toLocaleString()} words</span>
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
