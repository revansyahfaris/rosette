import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Sidebar from './components/Sidebar';
import TiptapEditor from './features/editor/TiptapEditor';
import TitleBar from './components/TitleBar';
import StatusBar from './components/StatusBar';
import WorkspaceDashboard from './components/WorkspaceDashboard';
import MusePanel from './components/MusePanel';

import "./App.css"; 

// Ikon silang kecil untuk menutup tab
const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

function App() {
  const [workspace, setWorkspace] = useState(null);
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [isMuseOpen, setIsMuseOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editor, setEditor] = useState(null);
  const [unsavedFiles, setUnsavedFiles] = useState(new Set());
  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false);
  const [isQuickStarting, setIsQuickStarting] = useState(false);

  // 🌟 ARSITEKTUR MULTI-TAB SEPERTI VS CODE
  const [tabs, setTabs] = useState([]); 
  const [activeTabId, setActiveTabId] = useState(null); 

  // Helper untuk mendapatkan objek file yang sedang aktif di layar editor
  const activeFile = tabs.find(tab => tab.id === activeTabId) || null;

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

    checkGit();
    const interval = setInterval(checkGit, 2000);
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

  const handleRenameDocument = async (id, newTitle) => {
    try {
      console.log(`[Rosette State] Mengubah nama dokumen ID: ${id} menjadi "${newTitle}"`);
      
      // 1. Jalankan perintah ganti nama draf di backend Rust (SQLite)
      await invoke('rename_document', { id, newTitle });
      
      // 2. Sinkronisasikan Baris Multi-Tab secara instan di Frontend
      setTabs(prev => prev.map(tab => {
        if (tab.id === id) {
          // Tetap pertahankan ekstensi jika draf aslinya menggunakan format file
          const hasExtension = tab.name.endsWith('.md');
          return { 
            ...tab, 
            name: hasExtension ? `${newTitle}.md` : newTitle 
          };
        }
        return tab;
      }));

      // 3. 🌟 SINKRONISASI UTAMA: Paksa Sidebar memuat ulang struktur pohon dokumen agar nama barunya langsung muncul
      await loadBooks();
      console.log("[Rosette State] Sinkronisasi nama draf ke Sidebar berhasil.");
    } catch (e) { 
      console.error("[Rosette State] Gagal mengubah nama dokumen:", e); 
    }
  };

  const handleBooksReorder = (newBooks) => {
    setBooks(newBooks);
  };

  const markUnsaved = (id) => {
    setUnsavedFiles(prev => {
      // Pastikan membuat objek Set baru agar React mendeteksi perubahan state (Reaktif)
      const next = new Set(prev);
      if (!next.has(id)) {
        next.add(id);
        console.log(`[Rosette State] Dokumen ID: ${id} ditandai UNSAVED (Kotor)`);
      }
      return next;
    });
  };

  const markSaved = (id) => {
    setUnsavedFiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        console.log(`[Rosette State] Dokumen ID: ${id} ditandai SAVED (Bersih)`);
      }
      return next;
    });
  };

  const handleOpenFile = (fileInfo) => {
    if (!fileInfo) {
      setActiveTabId(null);
      return;
    }
    setTabs(prev => {
      if (prev.some(tab => tab.id === fileInfo.id)) return prev;
      return [...prev, fileInfo];
    });
    setActiveTabId(fileInfo.id);
  };

  const handleCloseTab = (e, idToClose) => {
    e.stopPropagation(); 
    setTabs(prev => {
      const nextTabs = prev.filter(tab => tab.id !== idToClose);
      if (activeTabId === idToClose) {
        if (nextTabs.length > 0) {
          setActiveTabId(nextTabs[nextTabs.length - 1].id);
        } else {
          setActiveTabId(null);
        }
      }
      return nextTabs;
    });
  };

  // 🌟 PERBAIKAN SELESAI (Audit Poin 07): Navigasi Cerdas Terintegrasi Penuh Sistem Multi-Tab VS Code
  const handleNavigateToPage = async (pageTitle) => {
    try {
      console.log(`[Rosette QA] Menjalankan Multi-Tab Context-Aware Navigation untuk: "${pageTitle}"`);
      
      const allBooks = await invoke('list_books');
      
      // 1. TAHAP PRIORITAS: Cari di dalam buku yang saat ini sedang aktif dibuka penulis
      const currentBookId = selectedBookId || activeFile?.book_id;
      const activeBook = allBooks.find(b => b.id === currentBookId);

      if (activeBook) {
        const activeBookDocs = await invoke('list_documents', { bookId: activeBook.id });
        const matchInActiveBook = activeBookDocs.find(doc => {
          const cleanDocTitle = (doc.title || doc.file_path.replace('.md', '')).trim().toLowerCase();
          return cleanDocTitle === pageTitle.trim().toLowerCase();
        });

        if (matchInActiveBook) {
          console.log(`[Rosette Navigation] Menemukan "${pageTitle}" di buku aktif: "${activeBook.name}". Membuka tab baru...`);
          // 🌟 Buka sebagai Tab baru atau beralih fokus jika sudah terbuka
          handleOpenFile({
            id: matchInActiveBook.id,
            book_id: activeBook.id,
            name: matchInActiveBook.title || matchInActiveBook.file_path,
            path: `${activeBook.git_path}/${matchInActiveBook.file_path}`
          });
          return; // Selesai, hentikan pencarian lintas buku
        }
      }

      // 2. TAHAP CADANGAN: Jika tidak ada di buku aktif, lakukan pencarian meluas lintas buku lain
      console.log(`[Rosette Navigation] Teks tidak ada di buku aktif. Mencari lintas buku...`);
      for (const book of allBooks) {
        if (book.id === currentBookId) continue; // Lewati karena sudah di-scan di tahap 1

        const docs = await invoke('list_documents', { bookId: book.id });
        const targetFile = docs.find(doc => {
          const cleanDocTitle = (doc.title || doc.file_path.replace('.md', '')).trim().toLowerCase();
          return cleanDocTitle === pageTitle.trim().toLowerCase();
        });

        if (targetFile) {
          console.log(`[Rosette Navigation] Menemukan objek di buku lain: "${book.name}". Menambahkan tab baru...`);
          // 🌟 Buka sebagai Tab baru di sebelah tab lama
          handleOpenFile({
            id: targetFile.id,
            book_id: book.id,
            name: targetFile.title || targetFile.file_path,
            path: `${book.git_path}/${targetFile.file_path}`
          });
          
          // Sinkronkan folder active di sidebar agar ikut membuka ekspansi folder buku target
          setSelectedBookId(book.id);
          return;
        }
      }
      
      console.warn(`[Rosette Navigation] Halaman "${pageTitle}" sama sekali tidak ditemukan di seluruh vault.`);
    } catch (err) {
      console.error("[Rosette Navigation] Gagal melakukan navigasi internal lintas tab:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TitleBar 
        workspaceName={workspace?.name} 
        activeDraft="DRAFT A" 
        onToggleMuse={() => setIsMuseOpen(!isMuseOpen)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar 
          isOpen={isSidebarOpen}
          onSelectFile={handleOpenFile} 
          onWorkspaceLoaded={setWorkspace} 
          books={books}
          onRefreshBooks={loadBooks}
          selectedBookId={selectedBookId}
          onBookToggle={(id) => setSelectedBookId(id)}
          onBooksReorder={handleBooksReorder}
          unsavedFiles={unsavedFiles}
        />
        
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--editor-bg)' }}>
          
          {/* TAB BAR (VS CODE STYLE) - Hanya merender jika ada file draf yang sedang dibuka */}
          {tabs.length > 0 && (
            <div style={tabStyles.tabBarContainer}>
              {tabs.map(tab => {
                const isActive = tab.id === activeTabId;
                const isUnsaved = unsavedFiles.has(tab.id);
                return (
                  <div 
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    style={{
                      ...tabStyles.tabItem,
                      backgroundColor: isActive ? 'var(--editor-bg, #fffafb)' : '#f3e8eb',
                      borderBottom: isActive ? '2px solid var(--rose-600)' : '2px solid transparent',
                      color: isActive ? 'var(--rose-900)' : 'var(--rose-400)',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: isActive ? '600' : 'normal' }}>
                      {tab.name.replace('.md', '')}
                    </span>
                    
                    <button 
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      style={tabStyles.tabCloseBtn}
                      title="Close Tab"
                    >
                      {isUnsaved ? <div style={tabStyles.unsavedDot} /> : <CloseIcon />}
                    </button>
                  </div>
                );
              })}
              <div 
                onClick={() => setActiveTabId(null)}
                style={tabStyles.dashboardTabBtn}
                title="Go to Dashboard"
              >
                + Dashboard
              </div>
            </div>
          )}

          {/* AREA RUANG KERJA UTAMA */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            {activeFile ? (
              <TiptapEditor 
                currentFile={activeFile} 
                onEditorCreated={setEditor}
                onRenameDocument={handleRenameDocument}
                onMarkUnsaved={markUnsaved}
                onMarkSaved={markSaved}
                onNavigateToPage={handleNavigateToPage}
              />
            ) : workspace ? (
              /* Menampilkan Workspace Dashboard bawaan jika workspace sudah terpilih */
              <WorkspaceDashboard 
                workspace={workspace} 
                books={books}
                onCreateBook={handleCreateBook}
                onOpenBook={(book) => setSelectedBookId(book.id)}
                onToggleMuse={() => setIsMuseOpen(!isMuseOpen)}
              />
            ) : (
              /* 🌟 PERBAIKAN SELESAI (Poin 03): LANDING PAGE UTAMA APLIKASI (Sebelum Vault Terpilih) */
              <div style={landingStyles.landingLayout}>
                <div style={landingStyles.landingCard}>
                  <div style={landingStyles.landingIcon}>🌹</div>
                  <h2 style={landingStyles.landingTitle}>Rosette Chronicle Editor</h2>
                  <p style={landingStyles.landingSubtitle}>Select or create a workspace to begin...</p>
                  <span style={landingStyles.hintText}>Otomatis membuat Grimoire & dokumen draf pertama di dalam folder pilihanmu.</span>
                </div>
              </div>
            )}
          </div>
        </main>

        <MusePanel 
          editor={editor} 
          isOpen={isMuseOpen} 
          onClose={() => setIsMuseOpen(false)} 
        />
      </div>

      <StatusBar isChanged={hasUncommittedChanges} />
    </div>
  );
}

// STYLES TAB MANAGEMENT (VS CODE THEME)
const tabStyles = {
  tabBarContainer: { display: 'flex', backgroundColor: '#ebdce0', borderBottom: '1px solid var(--rose-100)', overflowX: 'auto', width: '100%', height: '35px', alignItems: 'flex-end', userSelect: 'none' },
  tabItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px', height: '32px', borderRight: '1px solid rgba(138, 18, 64, 0.08)', cursor: 'pointer', transition: 'all 0.15s ease', position: 'relative', minWidth: '100px', maxWidth: '180px', justifyContent: 'space-between' },
  tabCloseBtn: { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', opacity: 0.6, '&:hover': { opacity: 1, backgroundColor: 'rgba(0,0,0,0.05)' } },
  unsavedDot: { width: '7px', height: '7px', backgroundColor: 'var(--rose-500)', borderRadius: '50%' },
  dashboardTabBtn: { padding: '0 12px', height: '32px', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--rose-600)', cursor: 'pointer', opacity: 0.8, alignSelf: 'center', marginLeft: 'auto', '&:hover': { opacity: 1 } }
};

// 🌟 STYLES KHUSUS LANDING PAGE SAMBUTAN AWAL YANG ELEGAN
const landingStyles = {
  landingLayout: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--editor-bg)', padding: '20px' },
  landingCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px', backgroundColor: 'white', border: '1px solid var(--rose-100)', borderRadius: '12px', maxWidth: '480px', width: '100%', boxShadow: '0 8px 24px rgba(138, 18, 64, 0.03)' },
  landingIcon: { fontSize: '40px', marginBottom: '16px', animation: 'pulse 2s infinite' },
  landingTitle: { fontFamily: 'var(--font-serif-display)', fontSize: '24px', color: 'var(--rose-900)', fontWeight: 'bold', margin: '0 0 8px 0' },
  landingSubtitle: { fontSize: '13px', color: 'var(--rose-400)', fontStyle: 'italic', margin: '0 0 24px 0' },
  dividerRow: { display: 'flex', alignItems: 'center', width: '100%', gap: '12px', marginBottom: '20px' },
  line: { flex: 1, height: '1px', backgroundColor: 'var(--rose-100)' },
  orText: { fontSize: '10px', fontWeight: 'bold', color: 'var(--rose-300)', letterSpacing: '1px' },
  quickBtn: { width: '100%', backgroundColor: 'var(--rose-600)', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(138, 18, 64, 0.1)', '&:hover': { backgroundColor: '#9d174d' } },
  hintText: { fontSize: '11px', color: '#777', marginTop: '10px', lineHeight: '1.4', maxWidth: '360px' }
};

export default App;