import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TiptapEditor from './features/editor/TiptapEditor';
import TitleBar from './components/TitleBar';
import StatusBar from './components/StatusBar';

import "./App.css"; 

function App() {
  const [activeFile, setActiveFile] = useState({ name: '', path: '' });
  const [workspace, setWorkspace] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TitleBar workspaceName={workspace?.name} activeDraft="DRAFT A" />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar onSelectFile={setActiveFile} onWorkspaceLoaded={setWorkspace} />
        
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <TiptapEditor currentFile={activeFile} />
        </main>
      </div>

      <StatusBar draft="DRAFT A" wordCount={0} model="qwen2.5:7b" />
    </div>
  );
}

export default App;
