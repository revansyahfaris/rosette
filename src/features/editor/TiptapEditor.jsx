import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { invoke } from '@tauri-apps/api/core';

export default function TiptapEditor() {
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: `<h2>Bab 1: Malam yang Sunyi</h2><p>Loi berjalan menyusuri gang sempit itu. Tangan kanannya memegang erat sebuah belati perak, sementara tangan kirinya yang terluka parah akibat pertarungan kemarin menggelantung lemas tak berdaya. Namun, tiba-tiba dari kegelapan muncul bayangan hitam. Tanpa berpikir panjang, Loi langsung mengayunkan pedang besar dengan kedua tangannya...</p>`,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[400px]',
      },
    },
  });

  const handleAnalyzeStory = async () => {
    if (!editor) return;

    const storyText = editor.getText();
    setIsLoading(true);
    setAiResponse('Rosette AI (Qwen2.5) sedang membaca ceritamu...');

    try {
      const response = await invoke('analyze_text', { text: storyText });
      setAiResponse(response);
    } catch (error) {
      console.error(error);
      setAiResponse(`Gagal menganalisis: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editor) return;
    try {
      const content = editor.getHTML();
      await invoke('save_document', { path: './my_story.md', content });
      alert('Tersimpan ke my_story.md');
    } catch (error) {
      alert(`Gagal menyimpan: ${error}`);
    }
  };

  const handleSnapshot = async () => {
    const name = prompt('Masukkan nama Snapshot (misal: "Bab 1 Selesai"):');
    if (!name) return;

    try {
      await invoke('create_snapshot', { path: '.', name });
      alert(`Snapshot "${name}" berhasil dibuat!`);
    } catch (error) {
      alert(`Gagal membuat snapshot: ${error}`);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.editorPanel}>
        <div style={styles.toolbar}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={styles.appName}>ROSETTE</span>
            <button onClick={handleSave} style={styles.secondaryButton}>Simpan</button>
            <button onClick={handleSnapshot} style={styles.secondaryButton}>Ambil Snapshot</button>
          </div>
          <button onClick={handleAnalyzeStory} disabled={isLoading} style={styles.aiButton}>
            {isLoading ? 'Menganalisis...' : '✨ Cek Konsistensi'}
          </button>
        </div>
        <div style={styles.editorContainer}>
          <EditorContent editor={editor} />
        </div>
      </div>
      <div style={styles.aiPanel}>
        <h3 style={styles.aiTitle}>Rosette Assistant (Qwen2.5)</h3>
        <div style={styles.aiContent}>
          {aiResponse || 'Tulis cerita di kiri, lalu klik tombol di atas.'}
        </div>
      </div>
    </div>
  );
  }

  const styles = {
  container: { display: 'flex', width: '100vw', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#1e1e1e', color: '#fff' },
  editorPanel: { flex: 2, display: 'flex', flexDirection: 'column', borderRight: '1px solid #333' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: '#252526', borderBottom: '1px solid #333' },
  appName: { fontWeight: 'bold', letterSpacing: '2px', color: '#ff6b81', marginRight: '20px' },
  aiButton: { backgroundColor: '#ff6b81', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#333', color: 'white', border: '1px solid #444', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  editorContainer: { padding: '20px 30px', overflowY: 'auto', flex: 1, backgroundColor: '#1e1e1e', color: '#d4d4d4', lineHeight: '1.6' },
  aiPanel: { flex: 1, padding: '20px', backgroundColor: '#252526', display: 'flex', flexDirection: 'column' },
  aiTitle: { marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px', color: '#ff6b81' },
  aiContent: { fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: '#cccccc', overflowY: 'auto' }
  };