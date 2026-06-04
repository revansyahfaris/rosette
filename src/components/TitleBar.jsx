import React from 'react';

export default function TitleBar({ workspaceName, activeDraft }) {
  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <span className="ornament">§ Rosette §</span>
        <div style={styles.draftBadge}>{activeDraft || 'DRAFT A'}</div>
      </div>
      
      <div style={styles.center}>
        <span style={styles.workspaceName}>{workspaceName || 'The Ashen Court'}</span>
      </div>

      <div style={styles.right}>
        <button style={styles.iconBtn}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" /></svg>
        </button>
        <button style={styles.iconBtn}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
        </button>
        <button style={{...styles.iconBtn, ...styles.closeBtn}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: 'var(--titlebar-h)',
    backgroundColor: 'var(--parchment)',
    borderBottom: '1px solid var(--rose-100)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 15px',
    flexShrink: 0,
    WebkitAppRegion: 'drag'
  },
  left: { display: 'flex', alignItems: 'center', gap: '15px' },
  draftBadge: {
    backgroundColor: 'var(--rose-100)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontFamily: 'var(--font-serif-prose)',
    color: 'var(--rose-700)',
    letterSpacing: '1px',
    fontWeight: 'bold'
  },
  center: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: 'var(--font-serif-display)',
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--rose-800)'
  },
  right: { display: 'flex', gap: '10px' },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--rose-400)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5px',
    borderRadius: '4px',
    WebkitAppRegion: 'no-drag',
    transition: 'background 0.2s'
  },
  closeBtn: {
    hover: {
      backgroundColor: 'rgba(214, 49, 98, 0.1)'
    }
  }
};
