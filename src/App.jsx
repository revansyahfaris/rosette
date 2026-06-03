import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TiptapEditor from './features/editor/TiptapEditor';

import "./App.css"; 

function App() {
  const [activeFile, setActiveFile] = useState('Bab 1: Malam yang Sunyi.md');

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 1. KIRI: Navigasi Buku & Bab */}
      <Sidebar onSelectFile={setActiveFile} />
      
      {/* 2. TENGAH & KANAN: Editor dan AI Panel */}
      <div style={{ flex: 1, height: '100%' }}>
        <TiptapEditor currentFileName={activeFile} />
      </div>
    </div>
  );
}

export default App;