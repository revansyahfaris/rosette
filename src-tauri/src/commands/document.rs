use tauri::State;
use crate::AppState;
use crate::db::documents::{self, Document};
use crate::commands::validate_safe_path;
use tokio::io::AsyncWriteExt;
use regex::Regex;

use once_cell::sync::Lazy;
static WIKI_LINK_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\[\[([^\]]+)\]\]").unwrap()
});

#[tauri::command]
pub async fn save_document(state: State<'_, AppState>, path: String, content: String) -> Result<(), crate::RosetteError> {
    let ws_lock = state.workspace_path.read().await;
    let base_ws = ws_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("Workspace belum dimuat".into()))?;
    
    // 1. Validasi Keamanan Path Traversal
    let safe_path = validate_safe_path(base_ws, &path)?;
    
    // 2. Operasi Penulisan File Asinkron dengan Buffer
    let file = tokio::fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(safe_path)
        .await?;

    let mut writer = tokio::io::BufWriter::new(file);
    writer.write_all(content.as_bytes()).await?;
    writer.flush().await?;

    let db_lock = state.db.read().await;
    if let Some(pool) = db_lock.as_ref() {
        // Cari metadata dokumen saat ini di database berdasarkan path-nya
        if let Ok(Some(current_doc)) = documents::search(pool, "", &path).await.map(|v| v.into_iter().next()) {
            
            // 🌟 BERSIHKAN LINK LAMA: Agar peta relasi tidak menyimpan tautan yang sudah dihapus penulis
            let _ = crate::db::links::clear_document_outgoing_links(pool, &current_doc.id).await;

            // Definisikan pola regex untuk menangkap [[Judul Halaman]]
            let re = Regex::new(r"\[\[([^\]]+)\]\]").unwrap();
            let mut detected_links = Vec::new();
            
            // Cari semua kecocokan di dalam konten teks dokumen
            for cap in re.captures_iter(&content) {
                if let Some(matched_target) = cap.get(1) {
                    detected_links.push(matched_target.as_str().trim().to_string());
                }
            }

            // Hubungkan current_doc.id dengan target_doc.id ke tabel database relasi
            for target_title in detected_links {
                // Cari apakah dokumen target ada di database berdasarkan judulnya
                if let Ok(Some(target_doc)) = documents::search(pool, "", &target_title).await.map(|v| v.into_iter().next()) {
                    
                    // 🌟 SINKRONISASI 5 ARGUMEN: Masukkan relasi lengkap ke tabel SQLite
                    let _ = crate::db::links::insert_link(
                        pool, 
                        &current_doc.book_id,   // 1. source_book_id (Diambil dari metadata dokumen saat ini)
                        &current_doc.id,        // 2. source_doc_id
                        &target_doc.book_id,    // 3. target_book_id (Diambil dari metadata dokumen target)
                        &target_doc.id          // 4. target_doc_id
                    ).await;
                    
                    println!(">>> [Knowledge Graph] Hubungan tersimpan: {} ➔ [[{}]] <<<", current_doc.file_path, target_title);
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
    
    // Validasi jalur berkas
    let safe_path = validate_safe_path(base_ws, &path)?;
    
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