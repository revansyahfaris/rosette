pub mod workspace;
pub mod book;
pub mod document;
pub mod git;
pub mod llm;

use std::path::{Path, PathBuf};

pub(crate) fn parse_dialog_path(file_path: tauri_plugin_dialog::FilePath) -> std::result::Result<std::path::PathBuf, crate::RosetteError> {
    match file_path {
        tauri_plugin_dialog::FilePath::Path(p) => Ok(p),
        tauri_plugin_dialog::FilePath::Url(u) => u.to_file_path().map_err(|_| {
            crate::RosetteError::Internal("Gagal mengonversi URL menjadi path lokal".into())
        }),
    }
}

// Tambahkan Helper ini untuk memvalidasi Path Traversal
pub(crate) fn validate_safe_path(base_workspace: &str, target_path: &str) -> std::result::Result<PathBuf, crate::RosetteError> {
    let base = Path::new(base_workspace).canonicalize().map_err(|_| {
        crate::RosetteError::Internal("Jalur utama workspace tidak valid".into())
    })?;
    
    let target = Path::new(target_path);
    // Jika target belum absolute, gabungkan dengan base
    let full_target = if target.is_absolute() {
        target.to_path_buf()
    } else {
        base.join(target)
    };

    let canonical_target = full_target.canonicalize().map_err(|_| {
        crate::RosetteError::Internal("Berkas yang diminta tidak ditemukan di disk".into())
    })?;

    if canonical_target.starts_with(base) {
        Ok(canonical_target)
    } else {
        Err(crate::RosetteError::Internal("Pelanggaran Keamanan: Mencoba mengakses berkas di luar Workspace!".into()))
    }
}