import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Sidebar from './components/Sidebar';
import TiptapEditor from './features/editor/TiptapEditor';
import TitleBar from './components/TitleBar';
import StatusBar from './components/StatusBar';
import WorkspaceDashboard from './components/WorkspaceDashboard';

import MusePanel from './components/MusePanel';

import "./App.css"; 

function App() {
  const [activeFile, setActiveFile] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [isMuseOpen, setIsMuseOpen] = useState(false);
  const [editor, setEditor] = useState(null);
  const [docStatus, setStatus] = useState({
    wordCount: 0,
    type: 'CHAPTER',
    draft: 'DRAFT A'
  });

  useEffect(() => {
    if (workspace) {
      loadBooks();
    }
  }, [workspace]);

  const loadBooks = async () => {
    try {
      const list = await invoke('list_books');
      setBooks(list);
    } catch (e) { console.error(e); }
  };

  const handleCreateBook = async (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    try {
      await invoke('create_book', { name, slug, bookType: 'main' });
      await loadBooks();
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = (newStatus) => {
    setStatus(prev => ({ ...prev, ...newStatus }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TitleBar workspaceName={workspace?.name} activeDraft={docStatus.draft} />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar 
          onSelectFile={setActiveFile} 
          onWorkspaceLoaded={setWorkspace} 
          books={books}
          onRefreshBooks={loadBooks}
          selectedBookId={selectedBookId}
          onBookToggle={(id) => setSelectedBookId(id)}
        />
        
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeFile ? (
            <TiptapEditor 
              currentFile={activeFile} 
              onStatusChange={handleStatusChange}
              onEditorCreated={setEditor}
            />
          ) : workspace ? (
            <WorkspaceDashboard 
              workspace={workspace} 
              books={books}
              onCreateBook={handleCreateBook}
              onOpenBook={(book) => setSelectedBookId(book.id)}
              onToggleMuse={() => setIsMuseOpen(!isMuseOpen)}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--editor-bg)', color: 'var(--rose-300)', fontStyle: 'italic' }}>
              Select or create a workspace to begin...
            </div>
          )}
        </main>

        <MusePanel 
          editor={editor} 
          isOpen={isMuseOpen} 
          onClose={() => setIsMuseOpen(false)} 
        />
      </div>

      <StatusBar 
        type={docStatus.type}
        draft={docStatus.draft} 
        wordCount={docStatus.wordCount} 
        model="Qwen 2.5 (Local)" 
      />
    </div>
  );
}

export default App;
