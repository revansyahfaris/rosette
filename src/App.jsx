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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editor, setEditor] = useState(null);
  const [unsavedFiles, setUnsavedFiles] = useState(new Set());
  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false);

  // 🌟 OPTIMASI 3.C: State docStatus dihapus dari sini agar App tidak re-render tiap ketukan keyboard!

  useEffect(() => {
    if (workspace) {
      loadBooks();
    }
  }, [workspace]);

  useEffect(() => {
    if (!workspace?.path) return;
    
    const checkGit = async () => {
      try {
        const changed = await invoke('check_git_status');
        setHasUncommittedChanges(changed);
      } catch (e) {
        console.error(e);
      }
    };

    checkGit(); // Initial check
    const interval = setInterval(checkGit, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
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

  // 🌟 OPTIMASI 3.C: Fungsi handleStatusChange dihapus karena penayangan status langsung diurus oleh StatusBar internal

  const handleRenameDocument = async (id, newTitle) => {
    try {
      await invoke('rename_document', { id, newTitle });
      setActiveFile(prev => ({ ...prev, name: `${newTitle}.md` }));
    } catch (e) { console.error(e); }
  };

  const handleBooksReorder = (newBooks) => {
    setBooks(newBooks);
  };

  const markUnsaved = (id) => {
    setUnsavedFiles(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const markSaved = (id) => {
    setUnsavedFiles(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleNavigateToPage = async (pageTitle) => {
    try {
      console.log(`[Rosette QA] Menjalankan Context-Aware Navigation untuk: "${pageTitle}"`);
      
      const allBooks = await invoke('list_books');
      
      const currentBookId = selectedBookId || activeFile?.book_id;
      const activeBook = allBooks.find(b => b.id === currentBookId);

      if (activeBook) {
        const activeBookDocs = await invoke('list_documents', { bookId: activeBook.id });
        const matchInActiveBook = activeBookDocs.find(doc => {
          const cleanDocTitle = (doc.title || doc.file_path.replace('.md', '')).trim().toLowerCase();
          return cleanDocTitle === pageTitle.trim().toLowerCase();
        });

        if (matchInActiveBook) {
          console.log(`[Rosette] Sukses! Menemukan "${pageTitle}" di dalam ruang buku aktif: "${activeBook.name}"`);
          setActiveFile({
            id: matchInActiveBook.id,
            book_id: activeBook.id,
            name: matchInActiveBook.title || matchInActiveBook.file_path,
            path: `${activeBook.git_path}/${matchInActiveBook.file_path}`
          });
          return;
        }
      }

      console.log(`[Rosette] Teks tidak ada di buku aktif. Memulai pencarian lintas buku...`);
      for (const book of allBooks) {
        if (book.id === currentBookId) continue;

        const docs = await invoke('list_documents', { bookId: book.id });
        const targetFile = docs.find(doc => {
          const cleanDocTitle = (doc.title || doc.file_path.replace('.md', '')).trim().toLowerCase();
          return cleanDocTitle === pageTitle.trim().toLowerCase();
        });

        if (targetFile) {
          console.log(`[Rosette] Menemukan objek cadangan di buku lain: "${book.name}". Mengalihkan...`);
          setActiveFile({
            id: targetFile.id,
            book_id: book.id,
            name: targetFile.title || targetFile.file_path,
            path: `${book.git_path}/${targetFile.file_path}`
          });
          
          setSelectedBookId(book.id);
          return;
        }
      }
      
      console.warn(`[Rosette] Halaman "${pageTitle}" sama sekali tidak ditemukan di seluruh workspace.`);
    } catch (err) {
      console.error("[Rosette] Gagal melakukan navigasi internal:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TitleBar 
        workspaceName={workspace?.name} 
        activeDraft="DRAFT A" // 🌟 Di-hardcode sementara atau ambil dari config statis
        onToggleMuse={() => setIsMuseOpen(!isMuseOpen)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar 
          isOpen={isSidebarOpen}
          onSelectFile={setActiveFile} 
          onWorkspaceLoaded={setWorkspace} 
          books={books}
          onRefreshBooks={loadBooks}
          selectedBookId={selectedBookId}
          onBookToggle={(id) => setSelectedBookId(id)}
          onBooksReorder={handleBooksReorder}
          unsavedFiles={unsavedFiles}
        />
        
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeFile ? (
            <TiptapEditor 
              currentFile={activeFile} 
              // 🌟 OPTIMASI 3.C: onStatusChange dilepas agar ketikan tidak memicu re-render App.jsx
              onEditorCreated={setEditor}
              onRenameDocument={handleRenameDocument}
              onMarkUnsaved={markUnsaved}
              onMarkSaved={markSaved}
              onNavigateToPage={handleNavigateToPage}
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

      {/* 🌟 OPTIMASI 3.C: Properti yang berubah setiap ketukan keyboard (wordCount) dilepas. */}
      {/* StatusBar sekarang mandiri mendengarkan event bus lokal */}
      <StatusBar 
        type="CHAPTER"
        draft="DRAFT A" 
        model="Qwen 2.5 (Local)" 
        isChanged={hasUncommittedChanges}
      />
    </div>
  );
}

export default App;