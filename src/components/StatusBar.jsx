import React, { useState, useEffect } from 'react';

export default function StatusBar({ type = 'CHAPTER', draft = 'DRAFT A', model = 'Qwen 2.5 (Local)', isChanged }) {
  const [wordCount, setWordCount] = useState(0);
  const [saveError, setSaveError] = useState(null); // 🌟 State penampung status eror fisik berkas

  useEffect(() => {
    // Tangkap update jumlah kata
    const handleWordUpdate = (e) => {
      if (e.detail && typeof e.detail.wordCount === 'number') {
        setWordCount(e.detail.wordCount);
      }
    };

    // 🌟 Tangkap sinyal kegagalan penyimpanan dari editor
    const handleSaveError = (e) => {
      setSaveError(e.detail.error || "Save Failed");
    };

    // 🌟 Bersihkan eror jika penyimpanan selanjutnya berhasil
    const handleSaveSuccess = () => {
      setSaveError(null);
    };

    window.addEventListener('rosette-word-count-update', handleWordUpdate);
    window.addEventListener('rosette-save-error', handleSaveError);
    window.addEventListener('rosette-save-success', handleSaveSuccess);
    
    return () => {
      window.removeEventListener('rosette-word-count-update', handleWordUpdate);
      window.removeEventListener('rosette-save-error', handleSaveError);
      window.removeEventListener('rosette-save-success', handleSaveSuccess);
    };
  }, []);

  return (
    <div style={{
      ...styles.statusBar,
      // 🌟 Jika ada eror, ubah warna background menjadi merah pastel peringatan agar penulis waspada
      backgroundColor: saveError ? '#f8d7da' : 'var(--panel-bg)',
      borderTop: saveError ? '1px solid #f5c2c7' : '1px solid var(--rose-100)',
      transition: 'all 0.3s ease'
    }}>
      <div style={styles.statusSection}>
        <span style={{ color: saveError ? '#721c24' : 'var(--rose-400)' }}>{type}</span>
        <span style={{ ...styles.divider, color: saveError ? '#f5c2c7' : 'var(--rose-100)' }}>|</span>
        <span style={{ color: saveError ? '#721c24' : 'var(--rose-400)' }}>{draft}</span>
      </div>
      
      <div style={styles.statusSection}>
        {/* 🌟 Tampilkan pesan peringatan keras jika terdeteksi kegagalan I/O */}
        {saveError ? (
          <span style={{ color: '#721c24', fontWeight: '700', fontSize: '11px', letterSpacing: '0.3px' }}>
            ⚠️ KRITIKAL: {saveError} (PROGRES BELUM TERSIMPAN!)
          </span>
        ) : (
          <>
            {isChanged && <span style={styles.changedBadge}>Uncommitted Changes</span>}
            <span style={styles.modelName}>{model}</span>
            <span style={styles.divider}>|</span>
            <span style={styles.wordCount}>{wordCount.toLocaleString()} words</span>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  statusBar: { 
    height: 'var(--statusbar-h, 24px)', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '0 15px', 
    fontSize: '11px', 
    color: 'var(--rose-400)', 
    userSelect: 'none' 
  },
  statusSection: { display: 'flex', alignItems: 'center', gap: '8px' },
  divider: { opacity: 0.3 },
  modelName: { fontStyle: 'italic', color: 'var(--rose-500)' },
  wordCount: { fontWeight: '600', color: 'var(--rose-700)' },
  changedBadge: { backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: '600' }
};