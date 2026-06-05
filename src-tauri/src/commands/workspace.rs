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
    let db_path = format!("sqlite:{}/rosette.db", path);
    let pool = db::init_db(&db_path).await?;
    let ws = workspace::create(&pool, &name).await?;
    
    // Gunakan .write().await karena kita ingin mengubah isi state Option-nya
    *state.db.write().await = Some(pool);
    *state.workspace_path.write().await = Some(path);
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