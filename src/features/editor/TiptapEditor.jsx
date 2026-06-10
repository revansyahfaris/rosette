import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TiptapHyperlink from '@tiptap/extension-link'; // Menggunakan Link asli Tiptap untuk Hyperlink murni
import Image from '@tiptap/extension-image';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Blockquote from '@tiptap/extension-blockquote';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Mention from '@tiptap/extension-mention';
import LinkSuggestion from './LinkSuggestion';
import { invoke } from '@tauri-apps/api/core';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Quote, Minus,
  Type, Highlighter, Undo2, Redo2, Eraser,
  Superscript as SuperIcon, Subscript as SubIcon,
  Link2, X, Search, FileText
} from 'lucide-react';

const Toolbar = ({ editor, onTriggerLinkModal }) => {
  if (!editor) return null;

  const btnStyle = (active) => ({
    ...styles.toolbarBtn,
    color: active ? 'var(--rose-700)' : 'var(--rose-400)',
    backgroundColor: active ? 'var(--rose-100)' : 'transparent',
    borderColor: active ? 'var(--rose-300)' : 'transparent',
  });

  return (
    <div style={styles.toolbar}>
      <div style={styles.toolbarContent}>
        {/* Typography Group */}
        <div style={styles.toolbarSection}>
          <div style={styles.dropdownWrapper}>
            <Type size={14} style={{ marginRight: 5, color: 'var(--rose-400)' }} />
            <select 
              style={styles.dropdown}
              onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
              value={editor.getAttributes('textStyle').fontFamily || ''}
            >
              <option value="">Font</option>
              <option value="Crimson Pro">Crimson Pro</option>
              <option value="Cormorant Garamond">Garamond</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>
        </div>

        <div style={styles.toolbarDivider} />

        {/* Basic Formatting */}
        <div style={styles.toolbarSection}>
          <button onClick={() => editor.chain().focus().toggleBold().run()} style={btnStyle(editor.isActive('bold'))} title="Bold"><Bold size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} style={btnStyle(editor.isActive('italic'))} title="Italic"><Italic size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} style={btnStyle(editor.isActive('underline'))} title="Underline"><UnderlineIcon size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()} style={btnStyle(editor.isActive('strike'))} title="Strike"><Strikethrough size={14} /></button>
          
          {/* Tombol Hyperlink */}
          <button onClick={onTriggerLinkModal} style={btnStyle(editor.isActive('link'))} title="Hyperlink Teks Terblok">
            <Link2 size={14} style={{ color: 'var(--rose-600)' }} />
          </button>
        </div>
        
        <div style={styles.toolbarDivider} />

        {/* Scripts & Highlight */}
        <div style={styles.toolbarSection}>
          <button onClick={() => editor.chain().focus().toggleSuperscript().run()} style={btnStyle(editor.isActive('superscript'))} title="Superscript"><SuperIcon size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleSubscript().run()} style={btnStyle(editor.isActive('subscript'))} title="Subscript"><SubIcon size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleHighlight().run()} style={btnStyle(editor.isActive('highlight'))} title="Highlight"><Highlighter size={14} /></button>
        </div>

        <div style={styles.toolbarDivider} />

        {/* Alignment */}
        <div style={styles.toolbarSection}>
          <button onClick={() => editor.chain().focus().setTextAlign('left').run()} style={btnStyle(editor.isActive({ textAlign: 'left' }) || (!editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }) && !editor.isActive({ textAlign: 'justify' })))} title="Align Left"><AlignLeft size={14} /></button>
          <button onClick={() => editor.chain().focus().setTextAlign('center').run()} style={btnStyle(editor.isActive({ textAlign: 'center' }))} title="Align Center"><AlignCenter size={14} /></button>
          <button onClick={() => editor.chain().focus().setTextAlign('right').run()} style={btnStyle(editor.isActive({ textAlign: 'right' }))} title="Align Right"><AlignRight size={14} /></button>
          <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} style={btnStyle(editor.isActive({ textAlign: 'justify' }))} title="Justify"><AlignJustify size={14} /></button>
        </div>

        <div style={styles.toolbarDivider} />

        {/* Lists & Blocks */}
        <div style={styles.toolbarSection}>
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} style={btnStyle(editor.isActive('bulletList'))} title="Bullet List"><List size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btnStyle(editor.isActive('orderedList'))} title="Ordered List"><ListOrdered size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleTaskList().run()} style={btnStyle(editor.isActive('taskList'))} title="Task List"><CheckSquare size={14} /></button>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()} style={btnStyle(editor.isActive('blockquote'))} title="Blockquote"><Quote size={14} /></button>
          <button onClick={() => editor.chain().focus().setHorizontalRule().run()} style={btnStyle(false)} title="Horizontal Rule"><Minus size={14} /></button>
        </div>

        <div style={styles.toolbarDivider} />

        {/* History & Cleanup */}
        <div style={styles.toolbarSection}>
          <button onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} style={btnStyle(false)} title="Clear Formatting"><Eraser size={14} /></button>
          <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} style={btnStyle(false)} title="Undo"><Undo2 size={14} /></button>
          <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} style={btnStyle(false)} title="Redo"><Redo2 size={14} /></button>
        </div>
      </div>
    </div>
  );
};

export default function TiptapEditor({ currentFile, onStatusChange, onEditorCreated, onRenameDocument, onMarkUnsaved, onMarkSaved, onNavigateToPage }) {
  const [, setTick] = useState(0);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [frontmatter, setFrontmatter] = useState('');

  // State Pop-up Search Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableDocs, setAvailableDocs] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  
  const [selectedTarget, setSelectedTarget] = useState(null); // Menyimpan page terpilih sebelum confirm

  const saveTimeoutRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ 
        history: { depth: 100 },
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Strike,
      Superscript,
      Subscript,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      FontFamily,
      TextStyle,
      Blockquote,
      HorizontalRule,
      Color,
      Placeholder.configure({
        placeholder: 'Start writing your chronicle...',
        emptyEditorClass: 'is-editor-empty',
      }),
      CharacterCount,
      // Hyperlink Bersih Tanpa Merubah Teks
      // Hyperlink Bersih Tanpa Merubah Teks - Disiplin Mengikuti CSS Variabel Tema Utama
      TiptapHyperlink.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: {
          class: 'rosette-internal-link',
          style: 'color: var(--rose-600); font-weight: 600; text-decoration: underline; cursor: pointer;'
        }
      }),
      // Wikilink [[Judul]] Support - Disiplin Mengikuti CSS Variabel Tema Utama
      Mention.configure({
        HTMLAttributes: {
          class: 'rosette-internal-link',
          style: 'color: var(--rose-600); font-weight: 600; text-decoration: underline; cursor: pointer;'
        },
        suggestion: LinkSuggestion,
      }),
    ],
    content: '',
    editorProps: { 
      attributes: { 
        class: 'focus:outline-none', 
        style: 'outline: none;' 
      },
      // 🌟 INTERSEPSI EVENT DOM UNTUK MENCEGAH EKSTERNAL BROWSER
      handleDOMEvents: {
        click: (view, event) => {
          const link = event.target.closest('a') || event.target.closest('.rosette-internal-link');
          
          if (link) {
            // MATIKAN TOTAL AKSI BAWAAN
            event.preventDefault();
            event.stopPropagation();
            
            let targetPage = link.getAttribute('href');
            
            // Jika menggunakan protokol internal rosette://, hapus prefixnya
            if (targetPage && targetPage.startsWith('rosette://')) {
              targetPage = targetPage.replace('rosette://', '');
            } else if (!targetPage) {
              const rawText = link.innerText || "";
              const match = rawText.match(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/);
              targetPage = match ? match[1] : rawText.replace(/[\[\]]/g, '');
            }
            
            if (targetPage && onNavigateToPage) {
              console.log(`[Rosette] Navigasi internal ke: ${targetPage}`);
              onNavigateToPage(targetPage);
            }
            
            return true; // Beritahu Prosemirror bahwa kita sudah menangani ini
          }
          return false;
        }
      }
    },
    onUpdate: ({ editor, transaction }) => {
      const words = editor.storage.characterCount.words();
      
      // 🌟 OPTIMASI MUTLAK (Audit 3.C): Tembakkan langsung ke Event Bus tanpa menyentuh App.jsx
      const event = new CustomEvent('rosette-word-count-update', { detail: { wordCount: words } });
      window.dispatchEvent(event);
      
      if (editor.isFocused && currentFile?.id && onMarkUnsaved) {
        if (transaction.docChanged) {
          onMarkUnsaved(currentFile.id);
        }
      }
    },
    onTransaction: () => {
      setTick(tick => tick + 1);
    },
  });

  // Pemuatan Dokumen
  useEffect(() => {
    const loadFile = async () => {
      if (currentFile?.path && editor) {
        try {
          const content = await invoke('load_document', { path: currentFile.path });
          const match = content.match(/^---[\s\S]*?---/);
          setFrontmatter(match ? match[0] : '');

          const body = content.replace(/^---[\s\S]*?---/, '').trim();
          editor.commands.setContent(body || '<p></p>', false);
          
          if (onStatusChange) {
            onStatusChange({ wordCount: editor.storage.characterCount.words() });
          }
        } catch (error) { 
          console.error(error); 
        }
      }
    };
    loadFile();
  }, [currentFile?.path, editor]);

  // Autosave HTML Konten Bersih
 useEffect(() => {
    if (!editor || !currentFile?.path) return;
    
    const handleUpdate = () => {
      // Jika user masih mengetik, hapus ancangan timer penyimpanan sebelumnya
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Setel ulang timer baru (menunggu 1200ms setelah aktivitas mengetik berhenti)
      saveTimeoutRef.current = setTimeout(() => {
        const htmlContent = editor.getHTML(); 
        const fullContent = frontmatter ? `${frontmatter}\n\n${htmlContent}` : htmlContent;

        console.log(`[Rosette QA] Memulai auto-save aman untuk: ${currentFile.path}`);
        invoke('save_document', { path: currentFile.path, content: fullContent })
          .then(() => {
            // 🌟 Beritahu StatusBar bahwa dokumen berhasil disimpan dengan aman
            window.dispatchEvent(new CustomEvent('rosette-save-success'));
          })
          .catch(err => {
            console.error("Auto-save failed:", err);
            // 🌟 Tembakkan event eror visual agar StatusBar menangkap kegagalan ini
            window.dispatchEvent(new CustomEvent('rosette-save-error', { 
              detail: { error: "Gagal menulis ke diska. Periksa ruang penyimpanan atau hak akses folder." } 
            }));
          });
      }, 1200);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      // Bersihkan sisa timer saat dokumen ditutup atau berganti halaman
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editor, currentFile?.path, frontmatter]);

  useEffect(() => {
    if (editor && onEditorCreated) {
      onEditorCreated(editor);
    }
  }, [editor, onEditorCreated]);

  // Memicu Modal Pop-up Search (Ditambahkan kata kunci async dengan benar 🌟)
  const handleTriggerLinkModal = async () => {
    if (!editor) return;
    setSearchQuery('');
    setSelectedTarget(null);
    setIsModalOpen(true);

    try {
      console.log("[Rosette Optimization] Mengambil seluruh dokumen workspace via single IPC invoke...");
      
      // Cukup panggil satu command tunggal yang sudah dioptimasi di sisi Rust
      const allDocsList = await invoke('get_all_documents');
      
      const formattedDocs = allDocsList.map(d => {
        const cleanTitle = d.title || d.file_path.split('\\').pop().split('/').pop().replace('.md', '');
        return { id: d.id, label: cleanTitle };
      });

      setAvailableDocs(formattedDocs);
      setFilteredDocs(formattedDocs);
    } catch (err) {
      console.error("Gagal memuat daftar halaman via optimized query:", err);
    }
  };

  // Live query search filter
  useEffect(() => {
    const filtered = availableDocs.filter(doc => 
      doc.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredDocs(filtered);
  }, [searchQuery, availableDocs]);

  // Eksekusi Tautan Saat Tombol CONFIRM Diklik
  const handleConfirmHyperlink = () => {
    if (editor && selectedTarget) {
      editor
        .chain()
        .focus()
        .setLink({ href: `rosette://${selectedTarget}` }) // Gunakan protokol internal agar Tauri tidak buka tab browser eksternal
        .run();
    }
    setIsModalOpen(false);
    setSelectedTarget(null);
  };

  const submitRename = async (e) => {
    if (e.key === 'Enter' && renameTitle.trim()) {
      try {
        if (onRenameDocument && currentFile.id) {
          await onRenameDocument(currentFile.id, renameTitle);
        }
        setIsRenaming(false);
      } catch (err) { console.error(err); }
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  };

  const handleKeyDown = async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (currentFile?.path && editor) {
        const body = editor.getHTML();
        const fullContent = frontmatter ? `${frontmatter}\n\n${body}` : body;
        try {
          await invoke('save_document', { path: currentFile.path, content: fullContent });
          if (onMarkSaved && currentFile.id) {
            onMarkSaved(currentFile.id);
          }
        } catch (err) { console.error(err); }
      }
    }
  };

  useEffect(() => {
    if (currentFile?.name) {
      setRenameTitle(currentFile.name.replace('.md', ''));
    }
  }, [currentFile]);

  return (
    <div style={styles.editorPanel} onKeyDown={handleKeyDown}>
      <Toolbar editor={editor} onTriggerLinkModal={handleTriggerLinkModal} />
      
      <div style={styles.scrollArea}>
        <div style={styles.proseContainer}>
          {currentFile?.name && (
            <header style={styles.docHeader}>
              {isRenaming ? (
                <input
                  autoFocus
                  style={styles.renameInput}
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  onKeyDown={submitRename}
                  onBlur={() => setIsRenaming(false)}
                />
              ) : (
                <h1 
                  style={{...styles.docTitle, cursor: 'text'}} 
                  onClick={() => setIsRenaming(true)}
                  title="Click to rename"
                >
                  {renameTitle || currentFile.name.replace('.md', '')}
                </h1>
              )}
              <div style={styles.headerDivider} />
            </header>
          )}
          <div style={styles.editorSurface}>
            <EditorContent editor={editor} />
          </div>
          <div style={styles.footerOrnament}>§</div>
        </div>
      </div>

      {/* Pop-up Search Modal Rosette */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>CONNECT TO CHRONICLE PAGE</h3>
                <p style={styles.modalSubtitle}>Pilih halaman untuk ditautkan pada teks ter-highlight:</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={styles.closeModalBtn}
                title="Close Modal"
                aria-label="Close Link Connection Modal"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Input Live Search Box */}
            <div style={styles.searchBoxWrapper}>
              <Search size={14} style={{ color: 'var(--rose-400)', marginRight: '6px' }} />
              <input 
                type="text" 
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.modalInput}
                placeholder="Ketik nama dokumen/halaman cerita..."
              />
            </div>

            {/* List Hasil Pencarian */}
            <div style={styles.listContainer}>
              {filteredDocs.length === 0 ? (
                <div style={styles.emptyState}>Tidak ada halaman fiksi yang cocok...</div>
              ) : (
                filteredDocs.map((doc) => {
                  const isSelected = selectedTarget === doc.label;
                  return (
                    <div 
                      key={doc.id} 
                      style={{
                        ...styles.listItem,
                        backgroundColor: isSelected ? 'var(--rose-100)' : 'transparent',
                        border: isSelected ? '1px solid var(--rose-300)' : '1px solid transparent',
                      }}
                      onClick={() => setSelectedTarget(doc.label)}
                    >
                      <FileText size={14} style={{ color: isSelected ? 'var(--rose-700)' : 'var(--rose-400)', marginRight: '8px' }} />
                      <span style={{
                        ...styles.itemLabel,
                        fontWeight: isSelected ? '600' : 'normal'
                      }}>{doc.label}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer dengan tombol BATAL & CONFIRM */}
            <div style={styles.modalFooter}>
              <button onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>BATAL</button>
              <button 
                onClick={handleConfirmHyperlink} 
                disabled={!selectedTarget}
                style={{
                  backgroundColor: selectedTarget ? 'var(--rose-700)' : 'var(--rose-300)',
                  cursor: selectedTarget ? 'pointer' : 'not-allowed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '8px 16px',
                  letterSpacing: '0.5px'
                }}
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  editorPanel: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--editor-bg)', overflow: 'hidden', position: 'relative' },
  toolbar: { minHeight: 'var(--toolbar-h)', borderBottom: '1px solid var(--rose-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--panel-bg)', flexShrink: 0, padding: '5px' },
  toolbarContent: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' },
  toolbarSection: { display: 'flex', gap: '2px', alignItems: 'center' },
  toolbarBtn: { background: 'none', border: '1px solid transparent', padding: '6px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  toolbarDivider: { width: '1px', height: '18px', backgroundColor: 'var(--rose-100)', margin: '0 5px' },
  dropdownWrapper: { display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255, 107, 129, 0.05)', padding: '0 8px', borderRadius: '4px', border: '1px solid var(--rose-100)' },
  dropdown: { background: 'none', border: 'none', padding: '4px 0', fontSize: '11px', fontFamily: 'var(--font-serif-prose)', color: 'var(--rose-700)', outline: 'none', cursor: 'pointer' },
  scrollArea: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' },
  proseContainer: { width: '100%', maxWidth: '800px', padding: '60px 40px', minHeight: '100%' },
  docHeader: { marginBottom: '40px' },
  docTitle: { fontFamily: 'var(--font-serif-display)', fontSize: '28px', fontWeight: '600', color: 'var(--rose-800)', marginBottom: '10px' },
  renameInput: { fontFamily: 'var(--font-serif-display)', fontSize: '28px', fontWeight: '600', color: 'var(--rose-900)', marginBottom: '10px', border: 'none', borderBottom: '2px solid var(--rose-300)', background: 'transparent', outline: 'none', width: '100%' },
  headerDivider: { height: '1px', backgroundColor: 'var(--rose-100)', marginTop: '15px' },
  editorSurface: { fontFamily: 'var(--font-serif-prose)', fontSize: '15px', lineHeight: '1.8', color: '#3e0820' },
  footerOrnament: { textAlign: 'center', marginTop: '60px', opacity: 0.2, color: 'var(--rose-800)', fontSize: '24px' },
  
  // Modal Pop-up Styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(62, 8, 32, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 },
  modalCard: { backgroundColor: 'var(--panel-bg, #ffffff)', border: '1px solid var(--rose-200)', borderRadius: '8px', width: '100%', maxWidth: '420px', padding: '20px', boxShadow: '0 10px 30px rgba(138, 18, 64, 0.2)', display: 'flex', flexDirection: 'column', gap: '12px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--rose-100)', paddingBottom: '8px' },
  modalTitle: { margin: 0, fontFamily: 'var(--font-serif-display)', fontSize: '13px', fontWeight: '700', color: 'var(--rose-800)', letterSpacing: '0.5px' },
  modalSubtitle: { margin: '2px 0 0 0', fontSize: '11px', color: '#666' },
  closeModalBtn: { background: 'none', border: 'none', color: 'var(--rose-400)', cursor: 'pointer', padding: 0 },
  searchBoxWrapper: { display: 'flex', alignItems: 'center', backgroundColor: 'var(--cream, #fffafb)', border: '1px solid var(--rose-200)', borderRadius: '6px', padding: '0 10px' },
  modalInput: { width: '100%', border: 'none', background: 'transparent', padding: '8px 6px', fontSize: '12px', color: 'var(--rose-900)', outline: 'none' },
  listContainer: { maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', border: '1px solid var(--rose-100)', borderRadius: '6px', padding: '4px' },
  listItem: { display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.15s' },
  itemLabel: { fontSize: '12px', color: 'var(--rose-900)', fontFamily: 'var(--font-serif-prose)' },
  emptyState: { padding: '15px', textAlign: 'center', fontSize: '11px', color: 'var(--rose-400)', fontStyle: 'italic' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', marginTop: '4px', gap: '10px' },
  cancelBtn: { background: 'none', border: 'none', color: 'var(--rose-400)', cursor: 'pointer', fontSize: '11px', fontWeight: '600', padding: '6px 12px' }
};