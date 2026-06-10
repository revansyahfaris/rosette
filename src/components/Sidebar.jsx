import React, { useState, useEffect, useCallback, useRef } from 'react';
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

export default function Sidebar({ isOpen, onSelectFile, onWorkspaceLoaded, books = [], onRefreshBooks, selectedBookId, onBookToggle, onBooksReorder, unsavedFiles = new Set() }) {
  const [workspace, setWorkspace] = useState(null);
  // const [books, setBooks] = useState([]); <-- Removed internal state
  const [expandedBooks, setExpandedBooks] = useState({});
  const [bookDocs, setBookDocs] = useState({});
  const [activePanel, setActivePanel] = useState('snapshots');
  const [snapshots, setSnapshots] = useState([]);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const sidebarRef = useRef();
  
  // Auto-expand book if selected from outside (e.g. Dashboard)
  useEffect(() => {
    if (selectedBookId && !expandedBooks[selectedBookId]) {
      const book = books.find(b => b.id === selectedBookId);
      if (book) {
        toggleBook(book.id, book.git_path);
      }
    }
  }, [selectedBookId]);

  // Workspace management states
  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState(false);
  const [renamingWsName, setRenamingWsName] = useState('');
  const [pendingNewWsPath, setPendingNewWsPath] = useState(null);

  // Generic Context Menu State
  const [itemContextMenu, setItemContextMenu] = useState(null);
  
  // Inline rename states
  const [renamingBookId, setRenamingBookId] = useState(null);
  const [renamingBookName, setRenamingBookName] = useState('');
  const [renamingDocId, setRenamingDocId] = useState(null);
  const [renamingDocTitle, setRenamingDocTitle] = useState('');

  const handleClickOutside = useCallback((e) => {
    // Gunakan state up-to-date lewat fungsionalitas callback updater React agar anti-bocor
    setShowWorkspaceMenu(prev => {
      if (prev) return false;
      return prev;
    });
    setItemContextMenu(prev => {
      if (prev) return null;
      return prev;
    });
  }, []); // Dependency array kosong menjamin fungsi ini hanya dibuat 1 kali selama siklus hidup aplikasi

  // Pasang listener tunggal yang patuh dan bersih
  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleRenameItem = () => {
    if (!itemContextMenu) return;
    if (itemContextMenu.type === 'book') {
      setRenamingBookId(itemContextMenu.item.id);
      setRenamingBookName(itemContextMenu.item.name);
    } else if (itemContextMenu.type === 'doc') {
      setRenamingDocId(itemContextMenu.item.id);
      setRenamingDocTitle(itemContextMenu.item.title || itemContextMenu.item.file_path);
    }
    setItemContextMenu(null);
  };

  const handleDeleteItem = async () => {
    if (!itemContextMenu) return;
    const { type, item, parentInfo } = itemContextMenu;
    setItemContextMenu(null);

    const isBook = type === 'book';
    const itemName = isBook ? item.name : (item.title || item.file_path);
    
    if (window.confirm(`Are you sure you want to delete "${itemName}"? This cannot be undone.`)) {
      try {
        if (isBook) {
          await invoke('delete_book', { id: item.id });
          onRefreshBooks();
        } else {
          await invoke('delete_document', { id: item.id, bookPath: parentInfo.git_path });
          const docs = await invoke('list_documents', { bookId: item.book_id });
          setBookDocs(prev => ({ ...prev, [item.book_id]: docs }));
        }
      } catch (e) { console.error(e); }
    }
  };

  const submitRenameBook = async (e, id) => {
    if (e.key === 'Enter' && renamingBookName.trim()) {
      try {
        await invoke('rename_book', { id, newName: renamingBookName });
        setRenamingBookId(null);
        onRefreshBooks();
      } catch (e) { console.error(e); }
    } else if (e.key === 'Escape') {
      setRenamingBookId(null);
    }
  };

  const submitRenameDoc = async (e, id, bookId) => {
    if (e.key === 'Enter' && renamingDocTitle.trim()) {
      try {
        await invoke('rename_document', { id, newTitle: renamingDocTitle });
        setRenamingDocId(null);
        const docs = await invoke('list_documents', { bookId });
        setBookDocs(prev => ({ ...prev, [bookId]: docs }));
      } catch (e) { console.error(e); }
    } else if (e.key === 'Escape') {
      setRenamingDocId(null);
    }
  };

  // Inline creation states
  const [isCreatingBook, setIsCreatingBook] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [creatingDocInBook, setCreatingDocInBook] = useState(null);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');

  useEffect(() => {
    if (workspace) {
      // loadBooks(); <-- Now handled by App.jsx
      loadSnapshots();
    }
  }, [workspace]);

  const loadSnapshots = async () => {
    if (!workspace) return;
    try {
      // For now, snapshots are at workspace root path
      const list = await invoke('list_snapshots', { path: workspace.path || '.' });
      setSnapshots(list);
    } catch (e) { console.error(e); }
  };

  // --- Drag and Drop State & Handlers ---
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const handleDragStart = (e, type, item, parentBook = null) => {
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires some data to be set
    e.dataTransfer.setData('text/plain', item.id);
    setDraggedItem({ type, item, parentBook });
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragOver = (e, type, id, parentBookId = null) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedItem) return;
    // Don't show drop zone if types don't match or crossing books
    if (draggedItem.type !== type) return;
    if (type === 'doc' && draggedItem.parentBook?.id !== parentBookId) return;

    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverId(null);
  };

  const handleDropOnBook = async (e, targetBook) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    
    if (!draggedItem || draggedItem.type !== 'book') {
      setDraggedItem(null);
      return;
    }

    if (draggedItem.item.id !== targetBook.id) {
      const newBooks = [...books];
      const dragIdx = newBooks.findIndex(b => b.id === draggedItem.item.id);
      const dropIdx = newBooks.findIndex(b => b.id === targetBook.id);
      
      const [movedBook] = newBooks.splice(dragIdx, 1);
      newBooks.splice(dropIdx, 0, movedBook);
      
      // Update UI immediately for responsiveness
      if (onBooksReorder) onBooksReorder(newBooks);
      
      const updates = newBooks.map((b, idx) => [b.id, idx]);
      try {
        await invoke('update_book_order', { updates });
      } catch (err) { 
        console.error(err); 
        onRefreshBooks(); // Revert on failure
      }
    }
    setDraggedItem(null);
  };

  const handleDropOnDoc = async (e, targetDoc, targetBook) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);

    if (!draggedItem || draggedItem.type !== 'doc' || draggedItem.parentBook.id !== targetBook.id) {
      setDraggedItem(null);
      return;
    }

    if (draggedItem.item.id !== targetDoc.id) {
      const docs = [...(bookDocs[targetBook.id] || [])];
      const dragIdx = docs.findIndex(d => d.id === draggedItem.item.id);
      const dropIdx = docs.findIndex(d => d.id === targetDoc.id);
      
      const [movedDoc] = docs.splice(dragIdx, 1);
      docs.splice(dropIdx, 0, movedDoc);
      
      setBookDocs(prev => ({ ...prev, [targetBook.id]: docs }));

      const updates = docs.map((d, idx) => [d.id, idx]);
      try {
        await invoke('update_document_order', { updates });
      } catch (err) { 
        console.error(err);
        // On failure, re-fetch to revert
        const oldDocs = await invoke('list_documents', { bookId: targetBook.id });
        setBookDocs(prev => ({ ...prev, [targetBook.id]: oldDocs }));
      }
    }
    setDraggedItem(null);
  };
  // ------------------------------------

  const handleRestoreSnapshot = async (hash) => {
    if (window.confirm("Restore this version? Unsaved changes will be lost.")) {
      try {
        await invoke('restore_snapshot', { path: workspace.path || '.', hash });
        onRefreshBooks();
        loadSnapshots();
      } catch (e) { console.error(e); }
    }
  };

  const submitCreateBook = async (e) => {
    if (e.key === 'Enter' && newBookName.trim()) {
      const slug = newBookName.toLowerCase().replace(/\s+/g, '-');
      try {
        await invoke('create_book', { name: newBookName, slug, bookType: 'main' });
        setNewBookName('');
        setIsCreatingBook(false);
        onRefreshBooks(); // Refresh parent state
      } catch (e) { console.error(e); }
    } else if (e.key === 'Escape') {
      setIsCreatingBook(false);
      setNewBookName('');
    }
  };

  const submitCreateDocument = async (e, bookId, bookPath) => {
    if (e.key === 'Enter' && newDocTitle.trim()) {
      const filename = newDocTitle.toLowerCase().replace(/\s+/g, '-');
      try {
        await invoke('create_document', { bookId, bookPath, title: newDocTitle, filename });
        setNewDocTitle('');
        setCreatingDocInBook(null);
        // Refresh docs
        const docs = await invoke('list_documents', { bookId });
        setBookDocs(prev => ({ ...prev, [bookId]: docs }));
        setExpandedBooks(prev => ({ ...prev, [bookId]: true }));
      } catch (e) { console.error(e); }
    } else if (e.key === 'Escape') {
      setCreatingDocInBook(null);
      setNewDocTitle('');
    }
  };

  const toggleBook = async (bookId, bookPath) => {
    const isExpanded = !!expandedBooks[bookId];
    setExpandedBooks(prev => ({ ...prev, [bookId]: !isExpanded }));

    if (!isExpanded) {
      try {
        const docs = await invoke('list_documents', { bookId });
        setBookDocs(prev => ({ ...prev, [bookId]: docs }));
      } catch (e) { console.error(e); }
    }
  };

  const handleOpenWorkspace = async () => {
    try {
      const folderPath = await invoke('pick_folder');
      if (!folderPath) return;

      try {
        const ws = await invoke('load_workspace', { path: folderPath });
        const wsWithPath = { ...ws, path: folderPath };
        setWorkspace(wsWithPath);
        onWorkspaceLoaded(wsWithPath);
      } catch (e) {
        // Not a workspace, prepare for setup
        setPendingNewWsPath(folderPath);
        const folderName = folderPath.split(/[\\/]/).pop();
        setRenamingWsName(folderName || 'My Chronicle');
      }
    } catch (error) { console.error(error); }
    setShowWorkspaceMenu(false);
  };

  const submitNewWorkspace = async (e) => {
    if (e.key === 'Enter' && renamingWsName.trim() && pendingNewWsPath) {
      try {
        const ws = await invoke('initialize_workspace', { path: pendingNewWsPath, name: renamingWsName });
        const wsWithPath = { ...ws, path: pendingNewWsPath };
        setWorkspace(wsWithPath);
        onWorkspaceLoaded(wsWithPath);
        setPendingNewWsPath(null);
        setRenamingWsName('');
      } catch (e) { console.error(e); }
    } else if (e.key === 'Escape') {
      setPendingNewWsPath(null);
      setRenamingWsName('');
    }
  };

  const handleRenameWorkspace = () => {
    setRenamingWsName(workspace.name);
    setIsRenamingWorkspace(true);
    setShowWorkspaceMenu(false);
  };

  const submitRenameWorkspace = async (e) => {
    if (e.key === 'Enter' && renamingWsName.trim()) {
      try {
        await invoke('update_workspace_name', { name: renamingWsName });
        const updatedWs = { ...workspace, name: renamingWsName };
        setWorkspace(updatedWs);
        onWorkspaceLoaded(updatedWs);
        setIsRenamingWorkspace(false);
      } catch (e) { console.error(e); }
    } else if (e.key === 'Escape') {
      setIsRenamingWorkspace(false);
    }
  };

  const handleCreateSnapshot = async (e) => {
    if (e.key === 'Enter' && newSnapshotName.trim()) {
      try {
        await invoke('create_snapshot', { path: workspace.path || '.', name: newSnapshotName });
        setNewSnapshotName('');
        setIsCreatingSnapshot(false);
        loadSnapshots();
      } catch (e) { console.error(e); }
    } else if (e.key === 'Escape') {
      setIsCreatingSnapshot(false);
      setNewSnapshotName('');
    }
  };

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'snapshots':
        return (
          <div style={styles.panelContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={styles.panelSubTitle}>Timeline</span>
              <button onClick={() => setIsCreatingSnapshot(true)} style={styles.addBtnSmall}>+</button>
            </div>

            {isCreatingSnapshot && (
              <div style={styles.inlineInputWrapperSmall}>
                <input
                  autoFocus
                  style={styles.inlineInputSmall}
                  placeholder="Snapshot name..."
                  value={newSnapshotName}
                  onChange={(e) => setNewSnapshotName(e.target.value)}
                  onKeyDown={handleCreateSnapshot}
                  onBlur={() => { setIsCreatingSnapshot(false); setNewSnapshotName(''); }}
                />
              </div>
            )}

            {snapshots.length === 0 ? (
              <div style={styles.emptyPanelText}>No archives preserved yet.</div>
            ) : (
              snapshots.map((ss, idx) => (
                <div key={idx} style={styles.snapshotItem} onClick={() => handleRestoreSnapshot(ss.hash)}>
                  <div style={styles.ssDot} />
                  <div style={styles.ssInfo}>
                    <div style={styles.ssName}>{ss.name}</div>
                    <div style={styles.ssDate}>{new Date(ss.timestamp * 1000).toLocaleString()}</div>
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
    <aside ref={sidebarRef} style={{...styles.sidebar, display: isOpen ? 'flex' : 'none'}}>
      <div style={styles.topSection}>
        <div style={styles.header}>
          <div style={styles.workspaceInfo}>
            {isRenamingWorkspace ? (
              <input
                autoFocus
                style={styles.renameInput}
                value={renamingWsName}
                onChange={(e) => setRenamingWsName(e.target.value)}
                onKeyDown={submitRenameWorkspace}
                onBlur={() => setIsRenamingWorkspace(false)}
              />
            ) : (
              <span 
                style={{...styles.workspaceName, cursor: 'pointer'}} 
                onClick={() => onSelectFile(null)}
                title="Go to Workspace Dashboard"
              >
                {workspace?.name || 'NO WORKSPACE'}
              </span>
            )}
            
            {workspace && (
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowWorkspaceMenu(!showWorkspaceMenu);
                  }} 
                  style={styles.chevron}
                  title="Open Workspace Options"
                  aria-label="Open Workspace Options Menu"
                >
                  ▾
                </button>
                {showWorkspaceMenu && (
                  <div style={styles.contextMenu} onClick={(e) => e.stopPropagation()}>
                    <button style={styles.menuItem} onClick={handleRenameWorkspace}>Rename Workspace</button>
                    <button style={styles.menuItem} onClick={handleOpenWorkspace}>Switch Workspace</button>
                    <button style={styles.menuItem} onClick={handleOpenWorkspace}>New Workspace</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!workspace && !pendingNewWsPath && (
            <div style={styles.onboardingActions}>
              <button style={styles.primaryActionBtn} onClick={handleOpenWorkspace}>
                Open Existing Vault
              </button>
              <button style={styles.secondaryActionBtn} onClick={handleOpenWorkspace}>
                Create New Vault
              </button>
            </div>
          )}

          {pendingNewWsPath && (
            <div style={styles.setupCard}>
              <div style={styles.setupTitle}>New Chronicle</div>
              <div style={styles.setupDesc}>Choose a name for your vault:</div>
              <input
                autoFocus
                style={styles.setupInput}
                value={renamingWsName}
                onChange={(e) => setRenamingWsName(e.target.value)}
                onKeyDown={submitNewWorkspace}
                placeholder="Enter name..."
              />
              <div style={styles.setupHint}>Press Enter to create</div>
            </div>
          )}
          <div style={styles.sectionDivider}>
            <div style={styles.dividerLine} />
            <div style={styles.sectionLabelGroup}>
              <span style={styles.sectionLabel}>BOOKS</span>
              {workspace && (
                <button 
                  onClick={() => setIsCreatingBook(true)} 
                  style={styles.addBtnSmall}
                  title="Create New Book"
                  aria-label="Create New Book Form"
                >
                  +
                </button>
              )}
            </div>
            <div style={styles.dividerLine} />
          </div>
          
          {isCreatingBook && (
            <div style={{ ...styles.createForm, flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              {/* 🌟 Poin 01: Label Permanen agar tidak kehilangan konteks saat mengetik */}
              <label htmlFor="newBookInput" style={{ fontSize: '11px', color: 'var(--rose-700)', fontWeight: '600', paddingLeft: '2px' }}>
                NEW BOOK TITLE
              </label>
              
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  id="newBookInput"
                  type="text"
                  placeholder="e.g., The Crimson Chronicles..."
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBook()}
                  autoFocus
                  style={{ flex: 1 }}
                />
                
                {/* 🌟 Poin 02: Atribut aria-label dan title untuk Screen Reader */}
                <button 
                  onClick={handleCreateBook} 
                  title="Confirm Create Book"
                  aria-label="Confirm Create Book"
                >
                  <Plus size={14} />
                </button>
                
                <button 
                  onClick={() => setIsCreatingBook(false)} 
                  title="Cancel"
                  aria-label="Cancel creating book"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.scrollArea}>
          {books.map(book => (
            <div key={book.id} style={styles.bookGroup}>
              <div 
                style={{
                  ...styles.bookItem,
                  ...(dragOverId === book.id ? styles.dragOver : {})
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, 'book', book)}
                onDragEnter={handleDragEnter}
                onDragOver={(e) => handleDragOver(e, 'book', book.id)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDropOnBook(e, book)}
                onContextMenu={(e) => handleContextMenu(e, 'book', book)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }} onClick={() => toggleBook(book.id, book.git_path)}>
                  <Icon name="book" style={{ color: 'var(--rose-300)' }} />
                  {renamingBookId === book.id ? (
                    <input
                      autoFocus
                      style={styles.renameInputSmall}
                      value={renamingBookName}
                      onChange={(e) => setRenamingBookName(e.target.value)}
                      onKeyDown={(e) => submitRenameBook(e, book.id)}
                      onBlur={() => setRenamingBookId(null)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span 
                      style={styles.bookName} 
                      onDoubleClick={(e) => { e.stopPropagation(); setRenamingBookId(book.id); setRenamingBookName(book.name); }}
                      title="Double-click to rename"
                    >
                      {book.name}
                    </span>
                  )}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setCreatingDocInBook(book.id); }} 
                  style={styles.addBtnSmall}
                  title="New Chapter"
                  aria-label="Create New Chapter"
                >+</button>
              </div>
              
              {expandedBooks[book.id] && (
                <div style={styles.docList}>
                  {(bookDocs[book.id] || []).map(doc => (
                    <div 
                      key={doc.id} 
                      style={{
                        ...styles.docItem,
                        ...(dragOverId === doc.id ? styles.dragOver : {})
                      }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'doc', doc, book)}
                      onDragEnter={handleDragEnter}
                      onDragOver={(e) => handleDragOver(e, 'doc', doc.id, book.id)}
                      onDragLeave={handleDragLeave}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDropOnDoc(e, doc, book)}
                      onClick={() => onSelectFile({ id: doc.id, name: doc.title || doc.file_path, path: `${book.git_path}/${doc.file_path}` })}
                      onContextMenu={(e) => handleContextMenu(e, 'doc', doc, book)}
                    >
                      <Icon name="description" style={{ opacity: 0.4, width: 14 }} />
                      {renamingDocId === doc.id ? (
                        <input
                          autoFocus
                          style={styles.renameInputSmall}
                          value={renamingDocTitle}
                          onChange={(e) => setRenamingDocTitle(e.target.value)}
                          onKeyDown={(e) => submitRenameDoc(e, doc.id, book.id)}
                          onBlur={() => setRenamingDocId(null)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span 
                          style={{...styles.docName, flex: 1}}
                          onDoubleClick={(e) => { 
                            e.stopPropagation(); 
                            setRenamingDocId(doc.id); 
                            setRenamingDocTitle(doc.title || doc.file_path); 
                          }}
                          title="Double-click to rename"
                        >
                          {doc.title || doc.file_path}
                        </span>
                      )}
                      {unsavedFiles.has(doc.id) && <span style={styles.unsavedDot} />}
                    </div>
                  ))}

                  {creatingDocInBook === book.id && (
                    <div style={{ ...styles.createForm, flexDirection: 'column', alignItems: 'stretch', gap: '4px', paddingLeft: '12px' }}>
                      {/* 🌟 Poin 01: Label Permanen untuk Bab */}
                      <label htmlFor={`newDocInput-${book.id}`} style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', tracking: '0.05em' }}>
                        NEW CHAPTER NAME
                      </label>
                      
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          id={`newDocInput-${book.id}`}
                          type="text"
                          placeholder="e.g., Prologue..."
                          value={newDocName}
                          onChange={(e) => setNewDocName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateDoc(book.id)}
                          autoFocus
                          style={{ flex: 1 }}
                        />
                        
                        {/* 🌟 Poin 02: Aksesibilitas Tombol */}
                        <button 
                          onClick={() => handleCreateDoc(book.id)} 
                          title="Confirm Create Chapter"
                          aria-label="Confirm Create Chapter"
                        >
                          <Plus size={14} />
                        </button>
                        
                        <button 
                          onClick={() => setCreatingDocInBook(null)} 
                          title="Cancel"
                          aria-label="Cancel creating chapter"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {(bookDocs[book.id] || []).length === 0 && creatingDocInBook !== book.id && (
                    <div style={styles.emptyDocText}>No chapters yet.</div>
                  )}
                </div>
              )}
            </div>
          ))}
          {!workspace && (
            <div style={styles.emptyContainer}>
              <div style={styles.emptyText}>Open a vault to begin...</div>
            </div>
          )}
        </div>
      </div>

      {itemContextMenu && (
        <div 
          style={{
            ...styles.contextMenu,
            position: 'fixed',
            top: itemContextMenu.y,
            left: itemContextMenu.x,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button style={styles.menuItem} onClick={handleRenameItem}>Rename</button>
          <button style={{...styles.menuItem, color: 'var(--rose-500)'}} onClick={handleDeleteItem}>Delete</button>
        </div>
      )}

      <div style={styles.bottomSection}>
        <div style={styles.panelTabs} role="tablist" aria-label="Sidebar Utility Panels">
          <button 
            role="tab"
            aria-selected={activePanel === 'snapshots'}
            style={activePanel === 'snapshots' ? styles.tabActive : styles.tab} 
            onClick={() => setActivePanel('snapshots')}
            title="View Archive Snapshots"
            aria-label="View Archive Snapshots Timeline"
          >
            <Icon name="history" />
            <span style={styles.tabLabel}>Snapshots</span>
          </button>

          <button 
            role="tab"
            aria-selected={activePanel === 'links'}
            style={activePanel === 'links' ? styles.tabActive : styles.tab} 
            onClick={() => setActivePanel('links')}
            title="View Wikilinks Graph"
            aria-label="View Document Internal Wikilinks"
          >
            <Icon name="link" />
            <span style={styles.tabLabel}>Links</span>
          </button>

          <button 
            role="tab"
            aria-selected={activePanel === 'drafts'}
            style={activePanel === 'drafts' ? styles.tabActive : styles.tab} 
            onClick={() => setActivePanel('drafts')}
            title="View Alternate Drafts"
            aria-label="View Alternate Story Drafts"
          >
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
    height: '100%',
    zIndex: 10 // Ensure it's above the editor surface
  },
  topSection: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' },
  header: { padding: '20px 15px 10px', zIndex: 20 },
  workspaceInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  workspaceName: { fontSize: '12px', fontWeight: 'bold', color: 'var(--rose-900)', letterSpacing: '0.5px' },
  chevron: { background: 'none', border: 'none', color: 'var(--rose-400)', cursor: 'pointer' },
  sectionDivider: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' },
  dividerLine: { flex: 1, height: '1px', backgroundColor: 'var(--rose-100)' },
  sectionLabelGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  sectionLabel: { fontSize: '9px', fontWeight: '600', color: 'var(--rose-400)', letterSpacing: '2px' },
  addBtnSmall: {
    background: 'var(--rose-50)',
    border: '1px solid var(--rose-200)',
    color: 'var(--rose-600)',
    borderRadius: '4px',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: 'var(--rose-100)',
      borderColor: 'var(--rose-300)',
      transform: 'scale(1.1)'
    }
  },
  inlineInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 8px',
    margin: '0 15px 10px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid var(--rose-200)'
  },
  inlineInputWrapperSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    margin: '4px 0',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: '4px',
    border: '1px solid var(--rose-100)'
  },
  inlineInput: {
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    fontFamily: 'var(--font-serif-display)',
    width: '100%',
    color: 'var(--rose-800)',
    background: 'none'
  },
  inlineInputSmall: {
    border: 'none',
    outline: 'none',
    fontSize: '12px',
    width: '100%',
    color: 'var(--rose-700)',
    background: 'none'
  },
  renameInputSmall: {
    border: 'none',
    borderBottom: '1px solid var(--rose-300)',
    outline: 'none',
    fontSize: '13px',
    width: '100%',
    color: 'var(--rose-800)',
    background: 'transparent',
    fontFamily: 'inherit'
  },
  emptyDocText: { fontSize: '10px', color: 'var(--rose-300)', padding: '5px 8px', fontStyle: 'italic' },
  scrollArea: { flex: 1, overflowY: 'auto', padding: '0 15px' },
  bookItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', transition: 'all 0.2s' },
  dragOver: { borderTop: '2px solid var(--rose-400)', backgroundColor: 'var(--rose-50)' },
  bookName: { fontSize: '13px', fontFamily: 'var(--font-serif-display)', fontWeight: '600', color: 'var(--rose-800)' },
  docList: { marginLeft: '12px', borderLeft: '1px solid var(--rose-100)', paddingLeft: '8px', marginTop: '4px' },
  docItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px' },
  docName: { fontSize: '12px', color: 'var(--rose-700)' },
  unsavedDot: { width: '8px', height: '8px', backgroundColor: 'var(--rose-400)', borderRadius: '50%', marginLeft: '5px' },
  bottomSection: { borderTop: '1px solid var(--rose-100)', backgroundColor: 'var(--panel-bg)', display: 'flex', flexDirection: 'column' },
  panelTabs: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--rose-50)' },
  tab: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', padding: '10px 0', cursor: 'pointer', color: 'var(--rose-400)', opacity: 0.6 },
  tabActive: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white', border: 'none', padding: '10px 0', cursor: 'pointer', color: 'var(--rose-600)', borderBottom: '2px solid var(--rose-500)' },
  tabLabel: { fontSize: '8px', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' },
  panelBody: { height: '140px', overflowY: 'auto', padding: '10px 15px' },
  panelContent: { display: 'flex', flexDirection: 'column', gap: '10px' },
  emptyPanelText: { fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px', fontStyle: 'italic' },
  panelSubTitle: { fontSize: '9px', fontWeight: 'bold', color: 'var(--rose-400)', letterSpacing: '1px', textTransform: 'uppercase' },
  snapshotItem: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    padding: '8px', 
    borderRadius: '4px', 
    cursor: 'pointer',
    transition: 'background 0.2s',
    '&:hover': {
      backgroundColor: 'var(--rose-50)'
    }
  },
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
  emptyContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', gap: '15px' },
  emptyText: { textAlign: 'center', color: 'var(--rose-300)', fontSize: '11px', fontStyle: 'italic' },
  seedBtn: { 
    padding: '8px 15px', 
    backgroundColor: 'transparent', 
    border: '1px solid var(--rose-200)', 
    color: 'var(--rose-500)', 
    fontSize: '10px', 
    fontWeight: '600', 
    letterSpacing: '1px', 
    borderRadius: '4px', 
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  contextMenu: {
    position: 'absolute',
    top: '25px',
    left: '0',
    backgroundColor: 'white',
    border: '1px solid var(--rose-100)',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 100,
    width: '160px',
    display: 'flex',
    flexDirection: 'column',
    padding: '5px 0'
  },
  menuItem: {
    padding: '8px 12px',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    fontSize: '11px',
    color: 'var(--rose-700)',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  renameInput: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'var(--rose-900)',
    border: 'none',
    borderBottom: '1px solid var(--rose-300)',
    background: 'none',
    outline: 'none',
    width: '70%'
  },
  setupCard: {
    backgroundColor: 'white',
    border: '1px solid var(--rose-200)',
    borderRadius: '8px',
    padding: '15px',
    margin: '10px 0 20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  setupTitle: { fontSize: '14px', fontFamily: 'var(--font-serif-display)', fontWeight: 'bold', color: 'var(--rose-800)', marginBottom: '5px' },
  setupDesc: { fontSize: '11px', color: 'var(--rose-500)', marginBottom: '12px' },
  setupInput: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid var(--rose-100)',
    fontSize: '13px',
    outline: 'none',
    color: 'var(--rose-800)',
    marginBottom: '8px'
  },
  setupHint: { fontSize: '9px', color: 'var(--rose-300)', textAlign: 'center', fontStyle: 'italic' },
  onboardingActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px'
  },
  primaryActionBtn: {
    backgroundColor: 'var(--rose-600)',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  secondaryActionBtn: {
    backgroundColor: 'transparent',
    color: 'var(--rose-600)',
    border: '1px solid var(--rose-200)',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};
