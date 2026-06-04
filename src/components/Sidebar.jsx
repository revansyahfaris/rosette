import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

const Icon = ({ name, style }) => {
  const icons = {
    book: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />,
    description: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>,
    history: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
    alt_route: <><path d="M11 12h2a2 2 0 0 1 2 2v5" /><circle cx="11" cy="12" r="2" /><path d="M11 12V5" /><circle cx="15" cy="19" r="2" /><circle cx="11" cy="5" r="2" /></>
  };
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {icons[name]}
    </svg>
  );
};

export default function Sidebar({ onSelectFile, onWorkspaceLoaded }) {
  const [workspace, setWorkspace] = useState(null);
  const [books, setBooks] = useState([]);
  const [expandedBooks, setExpandedBooks] = useState({});
  const [bookDocs, setBookDocs] = useState({});
  const [activePanel, setActivePanel] = useState('snapshots');
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    if (workspace) {
      loadSnapshots();
    }
  }, [workspace]);

  const handleOpenWorkspace = async () => {
    try {
      const folderPath = await invoke('pick_folder');
      if (!folderPath) return;

      try {
        const ws = await invoke('load_workspace', { path: folderPath });
        setWorkspace(ws);
        onWorkspaceLoaded(ws);
        loadBooks();
        loadSnapshots();
      } catch (e) {
        const name = prompt('No vault found. Enter a name for your new chronicle:');
        if (name) {
          const ws = await invoke('initialize_workspace', { path: folderPath, name });
          setWorkspace(ws);
          onWorkspaceLoaded(ws);
          loadBooks();
          loadSnapshots();
        }
      }
    } catch (error) { console.error(error); }
  };

  const loadSnapshots = async () => {
    if (!workspace) return;
    try {
      // In a full implementation, we'd list snapshots for the active book or workspace
      // For now, we'll try to list snapshots from the root workspace path if it's a git repo
      // or just show an empty list if not.
      // const list = await invoke('list_snapshots', { path: workspace.path });
      // setSnapshots(list);
    } catch (e) { console.error(e); }
  };

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'snapshots':
        return (
          <div style={styles.panelContent}>
            {snapshots.length === 0 ? (
              <div style={styles.emptyPanelText}>No archives preserved yet.</div>
            ) : (
              snapshots.map((ss, idx) => (
                <div key={idx} style={styles.snapshotItem}>
                  <div style={styles.ssDot} />
                  <div style={styles.ssInfo}>
                    <div style={styles.ssName}>{ss.name}</div>
                    <div style={styles.ssDate}>{new Date(ss.timestamp * 1000).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'links':
        return (
          <div style={styles.panelContent}>
            <div style={styles.emptyPanelText}>No wikilinks detected in current scroll.</div>
          </div>
        );
      case 'drafts':
        return (
          <div style={styles.panelContent}>
            <div style={styles.activeDraftItem}>
              <span style={{ color: 'var(--rose-500)' }}>●</span>
              <span style={styles.ssName}>DRAFT A (Main)</span>
            </div>
            <button style={styles.addDraftBtn}>+ New Draft</button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.topSection}>
        <div style={styles.header}>
          <div style={styles.workspaceInfo}>
            <span style={styles.workspaceName}>{workspace?.name || 'NO WORKSPACE'}</span>
            <button onClick={handleOpenWorkspace} style={styles.chevron}>▾</button>
          </div>
          <div style={styles.sectionDivider}>
            <div style={styles.dividerLine} />
            <span style={styles.sectionLabel}>BOOKS</span>
            <div style={styles.dividerLine} />
          </div>
          
          {workspace && (
            <button style={styles.topNewBtn}>
              <span style={styles.btnText}>NEW CHAPTER</span>
              <span style={styles.plusIcon}>+</span>
            </button>
          )}
        </div>

        <div style={styles.scrollArea}>
          {books.map(book => (
            <div key={book.id} style={styles.bookGroup}>
              <div style={styles.bookItem} onClick={() => toggleBook(book.id, book.git_path)}>
                <Icon name="book" style={{ color: 'var(--rose-300)' }} />
                <span style={styles.bookName}>{book.name}</span>
              </div>
              
              {expandedBooks[book.id] && (
                <div style={styles.docList}>
                  {(bookDocs[book.id] || []).map(doc => (
                    <div 
                      key={doc.id} 
                      style={styles.docItem}
                      onClick={() => onSelectFile({ name: doc.title || doc.file_path, path: `${book.git_path}/${doc.file_path}` })}
                    >
                      <Icon name="description" style={{ opacity: 0.4, width: 14 }} />
                      <span style={styles.docName}>{doc.title || doc.file_path}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!workspace && (
            <div style={styles.emptyText}>Open a vault to begin...</div>
          )}
        </div>
      </div>

      <div style={styles.bottomSection}>
        <div style={styles.panelTabs}>
          <button style={activePanel === 'snapshots' ? styles.tabActive : styles.tab} onClick={() => setActivePanel('snapshots')}>
            <Icon name="history" />
            <span style={styles.tabLabel}>Snapshots</span>
          </button>
          <button style={activePanel === 'links' ? styles.tabActive : styles.tab} onClick={() => setActivePanel('links')}>
            <Icon name="link" />
            <span style={styles.tabLabel}>Links</span>
          </button>
          <button style={activePanel === 'drafts' ? styles.tabActive : styles.tab} onClick={() => setActivePanel('drafts')}>
            <Icon name="alt_route" />
            <span style={styles.tabLabel}>Drafts</span>
          </button>
        </div>
        
        <div style={styles.panelBody}>
          {renderPanelContent()}
        </div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-w)',
    backgroundColor: 'var(--sidebar-bg)',
    borderRight: '1px solid var(--rose-100)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  topSection: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '20px 15px 10px' },
  workspaceInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  workspaceName: { fontSize: '12px', fontWeight: 'bold', color: 'var(--rose-900)', letterSpacing: '0.5px' },
  chevron: { background: 'none', border: 'none', color: 'var(--rose-400)', cursor: 'pointer' },
  sectionDivider: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' },
  dividerLine: { flex: 1, height: '1px', backgroundColor: 'var(--rose-100)' },
  sectionLabel: { fontSize: '9px', fontWeight: '600', color: 'var(--rose-400)', letterSpacing: '2px' },
  scrollArea: { flex: 1, overflowY: 'auto', padding: '0 15px' },
  bookItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', transition: 'all 0.2s' },
  bookName: { fontSize: '13px', fontFamily: 'var(--font-serif-display)', fontWeight: '600', color: 'var(--rose-800)' },
  docList: { marginLeft: '12px', borderLeft: '1px solid var(--rose-100)', paddingLeft: '8px', marginTop: '4px' },
  docItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px' },
  docName: { fontSize: '12px', color: 'var(--rose-700)' },
  bottomSection: { borderTop: '1px solid var(--rose-100)', backgroundColor: 'var(--panel-bg)', display: 'flex', flexDirection: 'column' },
  panelTabs: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--rose-50)' },
  tab: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', padding: '10px 0', cursor: 'pointer', color: 'var(--rose-400)', opacity: 0.6 },
  tabActive: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white', border: 'none', padding: '10px 0', cursor: 'pointer', color: 'var(--rose-600)', borderBottom: '2px solid var(--rose-500)' },
  tabLabel: { fontSize: '8px', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' },
  panelBody: { height: '140px', overflowY: 'auto', padding: '10px 15px' },
  panelContent: { display: 'flex', flexDirection: 'column', gap: '10px' },
  emptyPanelText: { fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px', fontStyle: 'italic' },
  snapshotItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  ssDot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--rose-300)' },
  ssInfo: { display: 'flex', flexDirection: 'column' },
  ssName: { fontSize: '11px', color: 'var(--rose-800)', fontWeight: '600' },
  ssDate: { fontSize: '9px', color: 'var(--text-muted)' },
  activeDraftItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', backgroundColor: 'var(--rose-50)', borderRadius: '4px' },
  addDraftBtn: { background: 'none', border: '1px dashed var(--rose-200)', color: 'var(--rose-400)', fontSize: '10px', padding: '6px', marginTop: '10px', cursor: 'pointer', borderRadius: '4px' },
  topNewBtn: { 
    width: '100%', 
    backgroundColor: 'var(--rose-600)', 
    color: 'white', 
    border: 'none', 
    padding: '8px 12px', 
    borderRadius: '4px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    cursor: 'pointer', 
    marginTop: '10px',
    transition: 'all 0.2s ease'
  },
  btnText: { fontSize: '10px', fontWeight: '600', letterSpacing: '1px' },
  plusIcon: { fontSize: '16px', fontWeight: '300' },
  emptyText: { textAlign: 'center', color: 'var(--rose-300)', fontSize: '11px', marginTop: '40px', fontStyle: 'italic' }
};
