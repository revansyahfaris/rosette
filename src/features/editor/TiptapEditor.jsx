import React, { useState, useEffect } from 'react';
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
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Blockquote from '@tiptap/extension-blockquote';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { Color } from '@tiptap/extension-color';
import { invoke } from '@tauri-apps/api/core';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Quote, Minus,
  Type, Highlighter, Undo2, Redo2, Eraser,
  Superscript as SuperIcon, Subscript as SubIcon,
  Settings
} from 'lucide-react';

const Toolbar = ({ editor }) => {
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
          <button 
            onClick={() => editor.chain().focus().setTextAlign('left').run()} 
            style={btnStyle(editor.isActive({ textAlign: 'left' }) || (!editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }) && !editor.isActive({ textAlign: 'justify' })))} 
            title="Align Left"
          >
            <AlignLeft size={14} />
          </button>
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

export default function TiptapEditor({ currentFile }) {
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('novel');
  const [, setTick] = useState(0);

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
      Link.configure({ openOnClick: false }),
      Image,
      FontFamily,
      TextStyle,
      Blockquote,
      HorizontalRule,
      Color,
    ],
    content: `<p style="text-align: center; color: #888; margin-top: 50px;"><em>Select a manuscript from the archives to begin...</em></p>`,
    editorProps: { attributes: { class: 'focus:outline-none', style: 'outline: none;' } },
    onTransaction: () => {
      setTick(tick => tick + 1);
    },
  });

  useEffect(() => {
    const loadFile = async () => {
      if (currentFile?.path && editor) {
        try {
          const content = await invoke('load_document', { path: currentFile.path });
          editor.commands.setContent(content || '<p></p>');
        } catch (error) { console.error(error); }
      }
    };
    loadFile();
  }, [currentFile, editor]);

  return (
    <div style={styles.layout}>
      <div style={styles.editorPanel}>
        <Toolbar editor={editor} />
        
        <div style={styles.scrollArea}>
          <div style={styles.proseContainer}>
            {currentFile?.name && (
              <header style={styles.docHeader}>
                <h1 style={styles.docTitle}>{currentFile.name.replace('.md', '')}</h1>
                <div style={styles.docMetadata}>
                  <span style={styles.metaItem}>TYPE: CHAPTER</span>
                  <span style={styles.metaItem}>DRAFT A</span>
                  <span style={styles.metaItem}>1,240 WORDS</span>
                </div>
                <div style={styles.headerDivider} />
              </header>
            )}
            <div style={styles.editorSurface}>
              <EditorContent editor={editor} />
            </div>
            <div style={styles.footerOrnament}>§</div>
          </div>
        </div>
      </div>

      <aside style={styles.chatPanel}>
        <div style={styles.chatHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--rose-600)' }}>✦</span>
            <span style={styles.chatTitle}>Muse</span>
          </div>
          <button style={styles.chatSettings}><Settings size={14} /></button>
        </div>

        <div style={styles.modeTabs}>
          {['novel', 'worldbuild', 'research'].map(mode => (
            <button 
              key={mode}
              style={activeMode === mode ? styles.modeTabActive : styles.modeTab}
              onClick={() => setActiveMode(mode)}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={styles.chatScroll}>
          <div style={styles.consistencyCard}>
            <div style={styles.cardIndicator} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
              <span style={{ fontSize: 14, color: 'var(--rose-500)' }}>✨</span>
              <span style={styles.cardTitle}>CONSISTENCY CHECK</span>
            </div>
            <p style={styles.cardText}>
              "The atmosphere in this chamber feels consistent with your description of the Ashen Court."
            </p>
          </div>
          
          <div style={styles.aiMessage}>
            {aiResponse || 'Awaiting your command...'}
          </div>
        </div>

        <div style={styles.chatInputArea}>
          <div style={styles.quickActions}>
            <button style={styles.quickActionBtn}>Check pacing</button>
            <button style={styles.quickActionBtn}>Suggest next</button>
          </div>
          <div style={styles.inputWrapper}>
            <textarea style={styles.chatInput} placeholder="Ask the Muse..." rows={1} />
            <button 
              onClick={async () => {
                if (!editor) return;
                setIsLoading(true);
                try {
                  const res = await invoke('analyze_text', { text: editor.getText() });
                  setAiResponse(res);
                } catch(e) { setAiResponse(e); }
                finally { setIsLoading(false); }
              }}
              style={styles.sendBtn}
            >
              {isLoading ? '...' : '↑'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', flex: 1, overflow: 'hidden', height: '100%' },
  editorPanel: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--editor-bg)', overflow: 'hidden' },
  toolbar: { height: 'var(--toolbar-h)', borderBottom: '1px solid var(--rose-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--panel-bg)', flexShrink: 0 },
  toolbarContent: { display: 'flex', alignItems: 'center', gap: '10px' },
  toolbarSection: { display: 'flex', gap: '2px', alignItems: 'center' },
  toolbarBtn: { background: 'none', border: '1px solid transparent', padding: '6px', cursor: 'pointer', borderRadius: '4px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  toolbarDivider: { width: '1px', height: '18px', backgroundColor: 'var(--rose-100)', margin: '0 5px' },
  dropdownWrapper: { display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255, 107, 129, 0.05)', padding: '0 8px', borderRadius: '4px', border: '1px solid var(--rose-100)' },
  dropdown: { 
    background: 'none', 
    border: 'none', 
    padding: '4px 0', 
    fontSize: '11px', 
    fontFamily: 'var(--font-serif-prose)', 
    color: 'var(--rose-700)',
    outline: 'none',
    cursor: 'pointer'
  },
  scrollArea: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  proseContainer: { width: '100%', maxWidth: '640px', padding: '60px 0', minHeight: '100%' },
  docHeader: { marginBottom: '40px' },
  docTitle: { fontFamily: 'var(--font-serif-display)', fontSize: '28px', fontWeight: '600', color: 'var(--rose-800)', marginBottom: '10px' },
  docMetadata: { display: 'flex', gap: '20px', fontSize: '11px', color: 'var(--rose-400)', letterSpacing: '1px' },
  headerDivider: { height: '1px', backgroundColor: 'var(--rose-100)', marginTop: '15px' },
  editorSurface: { fontFamily: 'var(--font-serif-prose)', fontSize: '15px', lineHeight: '1.8', color: '#3e0820' },
  footerOrnament: { textAlign: 'center', marginTop: '60px', opacity: 0.2, color: 'var(--rose-800)', fontSize: '24px' },
  chatPanel: { width: 'var(--chat-w)', backgroundColor: 'var(--chat-bg)', borderLeft: '1px solid var(--rose-100)', display: 'flex', flexDirection: 'column' },
  chatHeader: { padding: '15px 20px', borderBottom: '1px solid var(--rose-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chatTitle: { fontFamily: 'var(--font-serif-display)', fontSize: '15px', fontWeight: '600', color: 'var(--rose-800)' },
  chatSettings: { background: 'none', border: 'none', color: 'var(--rose-300)', cursor: 'pointer' },
  modeTabs: { display: 'flex', borderBottom: '1px solid var(--rose-100)' },
  modeTab: { flex: 1, padding: '10px 0', border: 'none', background: 'none', fontSize: '9px', fontWeight: '600', color: 'var(--rose-400)', cursor: 'pointer', letterSpacing: '1px' },
  modeTabActive: { flex: 1, padding: '10px 0', border: 'none', background: '#fff0f5', fontSize: '9px', fontWeight: '600', color: 'var(--rose-700)', borderBottom: '2px solid var(--rose-500)', cursor: 'pointer', letterSpacing: '1px' },
  chatScroll: { flex: 1, overflowY: 'auto', padding: '20px' },
  consistencyCard: { backgroundColor: 'white', border: '1px solid var(--rose-100)', borderRadius: '4px', padding: '12px', position: 'relative', marginBottom: '20px', boxShadow: '0 2px 5px rgba(138, 18, 64, 0.05)' },
  cardIndicator: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', backgroundColor: 'var(--rose-500)' },
  cardTitle: { fontSize: '9px', fontWeight: '600', color: 'var(--rose-800)', letterSpacing: '1px' },
  cardText: { fontSize: '12px', color: '#584145', fontStyle: 'italic', lineHeight: '1.5' },
  aiMessage: { fontSize: '12px', color: '#3e0820', lineHeight: '1.6' },
  chatInputArea: { padding: '15px', borderTop: '1px solid var(--rose-100)', backgroundColor: 'white' },
  quickActions: { display: 'flex', gap: '5px', marginBottom: '10px' },
  quickActionBtn: { fontSize: '9px', padding: '3px 8px', border: '1px solid var(--rose-200)', borderRadius: '10px', background: 'none', color: 'var(--rose-600)', cursor: 'pointer' },
  inputWrapper: { position: 'relative' },
  chatInput: { width: '100%', backgroundColor: 'var(--cream)', border: '1px solid var(--rose-100)', borderRadius: '4px', padding: '8px 30px 8px 10px', fontSize: '12px', fontFamily: 'var(--font-serif-prose)', resize: 'none' },
  sendBtn: { position: 'absolute', right: '5px', bottom: '5px', background: 'var(--rose-600)', color: 'white', border: 'none', borderRadius: '4px', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer' }
};
