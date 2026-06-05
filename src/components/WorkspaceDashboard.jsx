import React, { useState } from 'react';
import { Book, Clock, Plus, Zap, Archive, Settings, X } from 'lucide-react';

export default function WorkspaceDashboard({ workspace, books, onCreateBook, onOpenBook, onToggleMuse }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newBookName, setNewBookName] = useState('');

  const handleSubmit = (e) => {
    if (e.key === 'Enter' && newBookName.trim()) {
      onCreateBook(newBookName);
      setNewBookName('');
      setIsCreating(false);
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewBookName('');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.ornament}>❦</div>
        <h1 style={styles.workspaceName}>{workspace?.name || 'My Chronicle'}</h1>
        <p style={styles.workspaceSubtitle}>Welcome back to your sanctuary of stories.</p>
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <span style={styles.statVal}>{books.length}</span>
            <span style={styles.statLabel}>Books</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statBox}>
            <span style={styles.statVal}>0</span>
            <span style={styles.statLabel}>Snapshots</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statBox}>
            <span style={styles.statVal}>Today</span>
            <span style={styles.statLabel}>Last Active</span>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Your Library</h2>
            {!isCreating && (
              <button onClick={() => setIsCreating(true)} style={styles.actionLink}>+ New Book</button>
            )}
          </div>
          
          <div style={styles.bookGrid}>
            {isCreating && (
              <div style={styles.bookCardCreating}>
                <div style={styles.bookIcon}><Plus size={20} /></div>
                <input
                  autoFocus
                  style={styles.createInput}
                  placeholder="Enter book title..."
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  onKeyDown={handleSubmit}
                  onBlur={() => { if (!newBookName) setIsCreating(false); }}
                />
                <button onClick={() => setIsCreating(false)} style={styles.cancelBtn}><X size={14} /></button>
              </div>
            )}

            {books.length === 0 && !isCreating ? (
              <div style={styles.emptyCard} onClick={() => setIsCreating(true)}>
                <Plus size={24} style={{ marginBottom: 10, opacity: 0.5 }} />
                <span>Begin your first book</span>
              </div>
            ) : (
              books.map(book => (
                <div key={book.id} style={styles.bookCard} onClick={() => onOpenBook(book)}>
                  <div style={styles.bookIcon}><Book size={20} /></div>
                  <div style={styles.bookInfo}>
                    <div style={styles.bookName}>{book.name}</div>
                    <div style={styles.bookMeta}>{book.book_type.toUpperCase()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div style={styles.secondaryGrid}>
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Quick Actions</h2>
            <div style={styles.actionsList}>
              <button style={styles.actionBtn} onClick={onToggleMuse}>
                <Zap size={14} />
                <span>Open Muse</span>
              </button>
              <button style={styles.actionBtn} onClick={() => {/* For now just hint that it's in sidebar */ alert("Use the Snapshots panel in the sidebar to create archives!")}}>
                <Archive size={14} />
                <span>Create workspace snapshot</span>
              </button>
              <button style={styles.actionBtn}>
                <Settings size={14} />
                <span>Vault settings</span>
              </button>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Recent Activity</h2>
            <div style={styles.activityList}>
              <div style={styles.activityItem}>
                <Clock size={12} />
                <span>Workspace opened just now</span>
              </div>
              <div style={styles.emptyActivity}>No recent changes preserved.</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    height: '100%',
    overflowY: 'auto',
    backgroundColor: '#fffafb',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 40px'
  },
  hero: {
    textAlign: 'center',
    marginBottom: '60px',
    maxWidth: '600px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  ornament: {
    fontSize: '32px',
    color: 'var(--rose-400)',
    marginBottom: '20px',
    opacity: 0.6
  },
  workspaceName: {
    fontFamily: 'var(--font-serif-display)',
    fontSize: '42px',
    color: 'var(--rose-900)',
    margin: '0 0 10px 0'
  },
  workspaceSubtitle: {
    fontSize: '14px',
    color: 'var(--rose-500)',
    fontStyle: 'italic',
    marginBottom: '40px'
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
    backgroundColor: 'white',
    padding: '20px 40px',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(138, 18, 64, 0.05)',
    border: '1px solid var(--rose-50)'
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statVal: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'var(--rose-800)',
    fontFamily: 'var(--font-serif-display)'
  },
  statLabel: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'var(--rose-300)',
    marginTop: '4px'
  },
  statDivider: {
    width: '1px',
    height: '30px',
    backgroundColor: 'var(--rose-100)'
  },
  content: {
    width: '100%',
    maxWidth: '900px',
    display: 'flex',
    flexDirection: 'column',
    gap: '40px'
  },
  section: {
    width: '100%'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--rose-100)',
    paddingBottom: '10px'
  },
  sectionTitle: {
    fontFamily: 'var(--font-serif-display)',
    fontSize: '18px',
    color: 'var(--rose-800)',
    margin: 0
  },
  actionLink: {
    background: 'none',
    border: 'none',
    color: 'var(--rose-600)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  bookGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px'
  },
  bookCard: {
    backgroundColor: 'white',
    border: '1px solid var(--rose-100)',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      borderColor: 'var(--rose-300)',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(138, 18, 64, 0.05)'
    }
  },
  emptyCard: {
    border: '2px dashed var(--rose-100)',
    borderRadius: '8px',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--rose-300)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      borderColor: 'var(--rose-200)',
      backgroundColor: 'white'
    }
  },
  bookIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: 'var(--rose-50)',
    color: 'var(--rose-600)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bookInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  bookName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--rose-800)',
    fontFamily: 'var(--font-serif-display)'
  },
  bookMeta: {
    fontSize: '9px',
    color: 'var(--rose-400)',
    marginTop: '2px',
    letterSpacing: '0.5px'
  },
  secondaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px'
  },
  actionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'white',
    border: '1px solid var(--rose-50)',
    borderRadius: '6px',
    fontSize: '12px',
    color: 'var(--rose-700)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: 'var(--rose-50)',
      borderColor: 'var(--rose-100)'
    }
  },
  bookCardCreating: {
    backgroundColor: 'white',
    border: '1px solid var(--rose-400)',
    borderRadius: '8px',
    padding: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 4px 12px rgba(138, 18, 64, 0.1)'
  },
  createInput: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    fontFamily: 'var(--font-serif-display)',
    color: 'var(--rose-800)',
    flex: 1,
    background: 'none'
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--rose-300)',
    cursor: 'pointer',
    padding: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      color: 'var(--rose-500)'
    }
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  activityItem: {
    fontSize: '12px',
    color: 'var(--rose-600)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 0'
  },
  emptyActivity: {
    fontSize: '11px',
    color: 'var(--rose-300)',
    fontStyle: 'italic',
    marginTop: '5px'
  }
};
