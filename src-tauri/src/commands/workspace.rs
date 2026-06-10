use tauri::State;
use crate::AppState;
use crate::db;
use crate::db::workspace::{self, Workspace};
use tauri_plugin_dialog::DialogExt;
use std::fs;

#[derive(serde::Serialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
pub async fn initialize_workspace(state: State<'_, AppState>, path: String, name: String) -> Result<Workspace, crate::RosetteError> {
    // 1. 🌟 Jalankan inisialisasi pool database SQLite terlebih dahulu ke direktori target
    let pool = crate::db::init_db(&path).await?;
    
    // 2. 🌟 Jalankan fungsi create asli dari db::workspace menggunakan pool yang didapat
    let ws = crate::db::workspace::create(&pool, &name).await?;

    // 3. Autopilot menyuntikkan data Buku Utama (6 Parameter Pas)
    // Parameter: pool, name, slug, description, book_type, base_path
    let default_book = crate::db::books::create(
        &pool, 
        "Unsorted Grimoire", 
        "unsorted-grimoire", 
        None, 
        "main", 
        &path
    ).await?;
    
    // 4. Buat Folder Fisik Buku di dalam direktori
    let book_dir = std::path::Path::new(&path).join("unsorted-grimoire");
    std::fs::create_dir_all(&book_dir)?;

    // 5. Buat File Draf Bab Pertama (.md) secara fisik di disk
    let file_path = "untitled-scroll.md";
    let full_file_path = book_dir.join(file_path);
    std::fs::write(&full_file_path, "---\ntitle: \"Untitled Scroll\"\n---\n\n<p>Start writing your chronicle here...</p>")?;

    // 6. Daftarkan file draf tersebut ke database dokumen
    let _default_doc = crate::db::documents::create(
        &pool, 
        &default_book.id, 
        file_path, 
        Some("Untitled Scroll"), 
        None, 
        None
    ).await?;

    // 7. Simpan path dalam bentuk tipe String murni ke AppState
    *state.workspace_path.write().await = Some(path);
    *state.db.write().await = Some(pool);

    Ok(ws)
}

#[tauri::command]
pub async fn load_workspace(state: State<'_, AppState>, path: String) -> Result<Workspace, crate::RosetteError> {
    let db_path = format!("sqlite:{}/rosette.db", path);
    let pool = db::init_db(&db_path).await?;
    let ws = workspace::get(&pool).await?.ok_or_else(|| {
        crate::RosetteError::Internal("No workspace found in this directory".into())
    })?;
    
    *state.db.write().await = Some(pool);
    *state.workspace_path.write().await = Some(path);
    Ok(ws)
}

#[tauri::command]
pub async fn update_workspace_name(state: State<'_, AppState>, name: String) -> Result<(), crate::RosetteError> {
    // Gunakan .read().await karena kita hanya meminjam pool database untuk query (Read-Only State Lock)
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    let ws = workspace::get(pool).await?.ok_or_else(|| crate::RosetteError::Internal("No workspace found".into()))?;
    
    workspace::update_name(pool, &ws.id, &name).await?;
    Ok(())
}

#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Result<String, crate::RosetteError> {
    if let Some(path) = app.dialog().file().blocking_pick_folder() {
        let path_buf = crate::commands::parse_dialog_path(path)?;
        Ok(path_buf.to_string_lossy().into_owned())
    } else {
        Err(crate::RosetteError::Internal("Cancelled".into()))
    }
}

#[tauri::command]
pub async fn open_workspace_dialog(app: tauri::AppHandle) -> Result<Vec<FileInfo>, crate::RosetteError> {
    if let Some(path) = app.dialog().file().blocking_pick_folder() {
        let mut files = Vec::new();
        let path_buf = crate::commands::parse_dialog_path(path)?;
        
        if let Ok(entries) = fs::read_dir(&path_buf) {
            for entry in entries.flatten() {
                let file_name = entry.file_name().to_string_lossy().into_owned();
                let file_path = entry.path().to_string_lossy().into_owned();
                let is_dir = entry.path().is_dir();

                if file_name.starts_with('.') || file_name == "node_modules" || file_name == "target" {
                    continue;
                }

                let name_lower = file_name.to_lowercase();
                if is_dir || name_lower.ends_with(".md") || name_lower.ends_with(".txt") {
                    files.push(FileInfo { name: file_name, path: file_path, is_dir });
                }
            }
        }
        files.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
        Ok(files)
    } else {
        Err(crate::RosetteError::Internal("User cancelled".into()))
    }
}