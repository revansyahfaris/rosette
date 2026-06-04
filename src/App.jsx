import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TiptapEditor from './features/editor/TiptapEditor';
import TitleBar from './components/TitleBar';
import StatusBar from './components/StatusBar';

import "./App.css"; 

function App() {
  const [activeFile, setActiveFile] = useState({ name: '', path: '' });
  const [workspace, setWorkspace] = useState(null);
  const [docStatus, setStatus] = useState({
    wordCount: 0,
    type: 'CHAPTER',
    draft: 'DRAFT A'
  });

  const handleStatusChange = (newStatus) => {
    setStatus(prev => ({ ...prev, ...newStatus }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TitleBar workspaceName={workspace?.name} activeDraft={docStatus.draft} />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar onSelectFile={setActiveFile} onWorkspaceLoaded={setWorkspace} />
        
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <TiptapEditor 
            currentFile={activeFile} 
            onStatusChange={handleStatusChange}
          />
        </main>
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
