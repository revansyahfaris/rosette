use tauri::State;
use crate::AppState;
use crate::db::documents::{self, Document};
use tokio::io::AsyncWriteExt;
use regex::Regex;
use std::path::{Path, PathBuf};

use once_cell::sync::Lazy;
// 🌟 POLA HYPERLINK PARSING: Memindai href internal-link secara presisi
static WIKI_LINK_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"<a\s+[^>]*href="([^"]+)"[^>]*>"#).unwrap()
});

/// 🌟 UTALITAS KEAMANAN TERPADU: Mengonversi path ke absolut mutlak dan mengunci batasan workspace
fn resolve_and_validate_path(base_ws: &Path, input_path: &str) -> Result<PathBuf, crate::RosetteError> {
    let user_path = Path::new(input_path);
    let full_path = if user_path.is_absolute() {
        user_path.to_path_buf()
    } else {
        base_ws.join(user_path)
    };

    let canonical_ws = std::fs::canonicalize(base_ws)
        .map_err(|_| crate::RosetteError::Internal("Workspace root tidak ditemukan".into()))?;

    // Jalankan canonicalize. Jika file baru belum dibuat, ambil folder induknya (parent)
    let canonical_target = match std::fs::canonicalize(&full_path) {
        Ok(p) => p,
        Err(_) => {
            if let Some(parent) = full_path.parent() {
                let canonical_parent = std::fs::canonicalize(parent)
                    .map_err(|_| crate::RosetteError::Internal("Akses folder tidak sah".into()))?;
                if let Some(file_name) = full_path.file_name() {
                    canonical_parent.join(file_name)
                } else {
                    return Err(crate::RosetteError::Internal("Nama berkas cacat".into()));
                }
            } else {
                full_path
            }
        }
    };

    // Pengecekan Keamanan Utama: Mencegah keluar folder lewat ../
    if !canonical_target.starts_with(&canonical_ws) {
        return Err(crate::RosetteError::Internal("Akses Ditolak: Deteksi Upaya Path Traversal".into()));
    }

    Ok(canonical_target)
}

#[tauri::command]
pub async fn save_document(state: State<'_, AppState>, path: String, content: String) -> Result<(), crate::RosetteError> {
    let ws_lock = state.workspace_path.read().await;
    let base_ws = ws_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("Workspace belum dimuat".into()))?;
    
    // 1. Validasi Keamanan Menggunakan Fungsi Utilitas
    let safe_path = resolve_and_validate_path(base_ws.as_ref(), &path)?;
    
    // 2. Operasi Penulisan File Asinkron yang Aman
    let file = tokio::fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&safe_path)
        .await?;

    let mut writer = tokio::io::BufWriter::new(file);
    writer.write_all(content.as_bytes()).await?;
    writer.flush().await?;

    // 3. Sinkronisasi Hubungan Relasi Node Cerita ke Database
    let db_lock = state.db.read().await;
    if let Some(pool) = db_lock.as_ref() {
        // Cari metadata dokumen saat ini berdasarkan path spesifiknya (Gunakan query exact jika tersedia)
        if let Ok(Some(current_doc)) = documents::search(pool, "", &path).await.map(|v| v.into_iter().next()) {
            
            // Bersihkan riwayat link keluar lama agar tidak menumpuk link usang
            let _ = crate::db::links::clear_document_outgoing_links(pool, &current_doc.id).await;

            let mut detected_links = Vec::new();
            
            // Tangkap kecocokan target dari tag <a href="Nama Page">
            for cap in WIKI_LINK_REGEX.captures_iter(&content) {
                if let Some(matched_target) = cap.get(1) {
                    detected_links.push(matched_target.as_str().trim().to_string());
                }
            }

            // Hubungkan simpul dokumen asal ke dokumen target
            for target_title in detected_links {
                if let Ok(Some(target_doc)) = documents::search(pool, "", &target_title).await.map(|v| v.into_iter().next()) {
                    let _ = crate::db::links::insert_link(
                        pool, 
                        &current_doc.book_id,   
                        &current_doc.id,        
                        &target_doc.book_id,    
                        &target_doc.id          
                    ).await;
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn load_document(state: State<'_, AppState>, path: String) -> Result<String, crate::RosetteError> {
    let ws_lock = state.workspace_path.read().await;
    let base_ws = ws_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("Workspace belum dimuat".into()))?;
    
    // 🌟 PERBAIKAN TOCTOU: Validasikan dan gunakan absolute canonical path untuk membaca file
    let safe_path = resolve_and_validate_path(base_ws.as_ref(), &path)?;
    
    tokio::fs::read_to_string(safe_path).await.map_err(Into::into)
}

#[tauri::command]
pub async fn update_document_order(state: State<'_, AppState>, updates: Vec<(String, i32)>) -> Result<(), crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    for (id, sort_order) in updates {
        documents::update_document_order(pool, &id, sort_order).await?;
    }
    Ok(())
}

#[tauri::command]
pub async fn move_document_to_book(
    state: State<'_, AppState>,
    doc_id: String,
    new_book_id: String,
    old_book_path: String,
    new_book_path: String,
    file_path: String
) -> Result<(), crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    let old_full_path = std::path::Path::new(&old_book_path).join(&file_path);
    let new_full_path = std::path::Path::new(&new_book_path).join(&file_path);
    
    if old_full_path.exists() {
        std::fs::rename(old_full_path, new_full_path)?;
    }
    
    documents::move_document(pool, &doc_id, &new_book_id).await?;
    Ok(())
}

#[tauri::command]
pub async fn sync_book(state: State<'_, AppState>, book_id: String, book_path: String) -> Result<(), crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    documents::sync_book_files(pool, &book_id, &book_path).await
}

#[tauri::command]
pub async fn list_documents(state: State<'_, AppState>, book_id: String) -> Result<Vec<Document>, crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    documents::list_by_book(pool, &book_id).await
}

#[tauri::command]
pub async fn create_document(state: State<'_, AppState>, book_id: String, book_path: String, title: String, filename: String) -> Result<Document, crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    let file_path = format!("{}.md", filename);
    let full_path = std::path::Path::new(&book_path).join(&file_path);
    
    std::fs::write(&full_path, format!("---\ntitle: \"{}\"\n---\n\n", title))?;
    
    documents::create(pool, &book_id, &file_path, Some(&title), None, None).await
}

#[tauri::command]
pub async fn rename_document(state: State<'_, AppState>, id: String, new_title: String) -> Result<(), crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    documents::rename_document(pool, &id, &new_title).await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_document(state: State<'_, AppState>, id: String, book_path: String) -> Result<(), crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    if let Some(file_path) = documents::delete_document(pool, &id).await? {
        let full_path = std::path::Path::new(&book_path).join(file_path);
        let _ = std::fs::remove_file(full_path);
    }
    Ok(())
}

#[tauri::command]
pub async fn search_documents(state: State<'_, AppState>, book_id: String, query: String) -> Result<Vec<Document>, crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    documents::search(pool, &book_id, &query).await
}

#[tauri::command]
pub async fn get_all_documents(state: State<'_, AppState>) -> Result<Vec<Document>, crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    // Panggil fungsi query JOIN tunggal yang efisien
    documents::get_all_documents(pool).await
}