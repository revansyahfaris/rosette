import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function Sidebar({ onSelectFile }) {
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [folderName, setFolderName] = useState('Belum Ada Workspace');

  // Fungsi untuk memanggil Command Rust
  const handleOpenFolder = async () => {
    try {
      // Memicu fungsi di main.rs
      const files = await invoke('open_workspace_dialog');
      setWorkspaceFiles(files);
      setFolderName('Workspace Aktif');
    } catch (error) {
      console.log(error); // Jika user cancel dialog
    }
  };

  return (
    <div style={styles.sidebar}>
      <div style={styles.headerContainer}>
        <h3 style={styles.title}>{folderName}</h3>
        <button onClick={handleOpenFolder} style={styles.openButton}>
          📁 Buka Folder
        </button>
      </div>

      <div style={styles.fileList}>
        {workspaceFiles.length === 0 ? (
          <p style={styles.emptyText}>Klik tombol di atas untuk memuat folder cerita Anda.</p>
        ) : (
          workspaceFiles.map((file, index) => (
            <div 
              key={index} 
              style={file.is_dir ? styles.bookItem : styles.chapterItem}
              onClick={() => !file.is_dir && onSelectFile(file.name)}
            >
              {file.is_dir ? '📁 ' : '📄 '}
              {file.name}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  sidebar: { width: '260px', backgroundColor: '#18181c', borderRight: '1px solid #333', padding: '15px', display: 'flex', flexDirection: 'column' },
  headerContainer: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  title: { margin: 0, fontSize: '13px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' },
  openButton: { backgroundColor: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  fileList: { overflowY: 'auto', flex: 1 },
  emptyText: { fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '20px' },
  bookItem: { padding: '8px 4px', fontSize: '14px', color: '#ff6b81', fontWeight: 'bold' },
  chapterItem: { padding: '6px 12px', fontSize: '13px', color: '#b0b0b5', cursor: 'pointer', borderRadius: '4px' }
};