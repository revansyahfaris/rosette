// Prevents additional console window on Windows in release, do not remove!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rosette_lib::llm::{self, LlmConfig, OllamaConfig};
use rosette_lib::llm::modes::novel::NovelMode;
use rosette_lib::git::GitEngine;
use rosette_lib::db;
use rosette_lib::db::workspace::{self, Workspace};
use rosette_lib::db::books::{self, Book};
use rosette_lib::db::documents::{self, Document};
use sqlx::SqlitePool;
use tokio::sync::Mutex;
use tauri::State;

struct AppState {
    db: Mutex<Option<SqlitePool>>,
    workspace_path: Mutex<Option<String>>,
}

#[tauri::command]
async fn analyze_text(text: String) -> Result<String, rosette_lib::RosetteError> {
    let config = LlmConfig {
        mode: "local".into(),
        local: Some(OllamaConfig {
            base_url: "http://localhost:11434".into(),
            model: "qwen2.5:7b-instruct-q4_K_M".into(), 
        }),
        cloud: None,
    };

    let prompt = NovelMode::wrap_prompt(&text);
    llm::generate(&prompt, &config).await
}

#[tauri::command]
fn create_snapshot(path: String, name: String) -> Result<String, rosette_lib::RosetteError> {
    let git = GitEngine::open(&path).or_else(|_| GitEngine::init(&path))?;
    git.snapshot(&name)
}

#[tauri::command]
fn list_snapshots(path: String) -> Result<Vec<rosette_lib::git::Snapshot>, rosette_lib::RosetteError> {
    let git = GitEngine::open(&path)?;
    git.list_snapshots()
}

#[tauri::command]
fn restore_snapshot(path: String, hash: String) -> Result<(), rosette_lib::RosetteError> {
    let git = GitEngine::open(&path)?;
    git.restore(&hash)
}

#[tauri::command]
fn save_document(path: String, content: String) -> Result<(), rosette_lib::RosetteError> {
    std::fs::write(path, content)?;
    Ok(())
}

#[tauri::command]
fn load_document(path: String) -> Result<String, rosette_lib::RosetteError> {
    let content = std::fs::read_to_string(path)?;
    Ok(content)
}

#[tauri::command]
async fn initialize_workspace(
    state: State<'_, AppState>,
    path: String,
    name: String
) -> Result<Workspace, rosette_lib::RosetteError> {
    let db_path = format!("sqlite:{}/rosette.db", path);
    let pool = db::init_db(&db_path).await?;
    
    let ws = workspace::create(&pool, &name).await?;
    
    let mut db_state = state.db.lock().await;
    *db_state = Some(pool);
    
    let mut path_state = state.workspace_path.lock().await;
    *path_state = Some(path);
    
    Ok(ws)
}

#[tauri::command]
async fn load_workspace(
    state: State<'_, AppState>,
    path: String
) -> Result<Workspace, rosette_lib::RosetteError> {
    let db_path = format!("sqlite:{}/rosette.db", path);
    let pool = db::init_db(&db_path).await?;
    
    let ws = workspace::get(&pool).await?.ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace found in this directory".into())
    })?;
    
    let mut db_state = state.db.lock().await;
    *db_state = Some(pool);
    
    let mut path_state = state.workspace_path.lock().await;
    *path_state = Some(path);
    
    Ok(ws)
}

#[tauri::command]
async fn update_workspace_name(
    state: State<'_, AppState>,
    name: String
) -> Result<(), rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    let ws = workspace::get(pool).await?.ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace found".into())
    })?;
    
    workspace::update_name(pool, &ws.id, &name).await?;
    Ok(())
}

#[tauri::command]
async fn create_book(
    state: State<'_, AppState>,
    name: String,
    slug: String,
    book_type: String
) -> Result<Book, rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    let path_lock = state.workspace_path.lock().await;
    let base_path = path_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    let book = books::create(pool, &name, &slug, None, &book_type, base_path).await?;
    Ok(book)
}

#[tauri::command]
async fn list_books(state: State<'_, AppState>) -> Result<Vec<Book>, rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    books::list(pool).await
}

#[tauri::command]
async fn sync_book(
    state: State<'_, AppState>,
    book_id: String,
    book_path: String
) -> Result<(), rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    documents::sync_book_files(pool, &book_id, &book_path).await
}

#[tauri::command]
async fn list_documents(
    state: State<'_, AppState>,
    book_id: String
) -> Result<Vec<Document>, rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    documents::list_by_book(pool, &book_id).await
}

#[tauri::command]
async fn create_document(
    state: State<'_, AppState>,
    book_id: String,
    book_path: String,
    title: String,
    filename: String
) -> Result<Document, rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    let file_path = format!("{}.md", filename);
    let full_path = std::path::Path::new(&book_path).join(&file_path);
    
    // Create file
    std::fs::write(&full_path, format!("---\ntitle: \"{}\"\n---\n\n", title))?;
    
    // Add to DB
    let doc = documents::create(pool, &book_id, &file_path, Some(&title), None, None).await?;
    Ok(doc)
}

#[tauri::command]
async fn search_documents(
    state: State<'_, AppState>,
    book_id: String,
    query: String
) -> Result<Vec<Document>, rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    documents::search(pool, &book_id, &query).await
}

#[derive(serde::Serialize)]
struct FileInfo {
    name: String,
    path: String,
    is_dir: bool,
}

#[tauri::command]
async fn pick_folder(app: tauri::AppHandle) -> Result<String, rosette_lib::RosetteError> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app.dialog().file().blocking_pick_folder();
    if let Some(path) = folder {
        let path_str = match path {
            tauri_plugin_dialog::FilePath::Path(p) => p.to_string_lossy().into_owned(),
            tauri_plugin_dialog::FilePath::Url(u) => u.to_file_path().map_err(|_| rosette_lib::RosetteError::Internal("Invalid URL".into()))?.to_string_lossy().into_owned(),
        };
        Ok(path_str)
    } else {
        Err(rosette_lib::RosetteError::Internal("Cancelled".into()))
    }
}

#[tauri::command]
async fn open_workspace_dialog(app: tauri::AppHandle) -> Result<Vec<FileInfo>, rosette_lib::RosetteError> {
    use tauri_plugin_dialog::DialogExt;
    use std::fs;

    let folder_path = app.dialog().file().blocking_pick_folder();

    if let Some(path) = folder_path {
        let mut files = Vec::new();
        
        let path_buf = match path {
            tauri_plugin_dialog::FilePath::Path(p) => p,
            tauri_plugin_dialog::FilePath::Url(u) => u.to_file_path().map_err(|_| rosette_lib::RosetteError::Internal("Invalid URL path".into()))?,
        };
        
        if let Ok(entries) = fs::read_dir(&path_buf) {
            for entry in entries.flatten() {
                let file_name = entry.file_name().to_string_lossy().into_owned();
                let file_path = entry.path().to_string_lossy().into_owned();
                let is_dir = entry.path().is_dir();

                // Filter out hidden files/folders and common noise
                if file_name.starts_with('.') || file_name == "node_modules" || file_name == "target" {
                    continue;
                }

                let name_lower = file_name.to_lowercase();
                if is_dir || name_lower.ends_with(".md") || name_lower.ends_with(".txt") {
                    files.push(FileInfo {
                        name: file_name,
                        path: file_path,
                        is_dir,
                    });
                }
            }
        }
        
        // Sort: Directories first, then files
        files.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
        
        Ok(files)
    } else {
        Err(rosette_lib::RosetteError::Internal("User cancelled".into()))
    }
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(None),
            workspace_path: Mutex::new(None),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            analyze_text, 
            create_snapshot,
            list_snapshots,
            restore_snapshot,
            save_document,
            load_document,
            initialize_workspace,
            load_workspace,
            update_workspace_name,
            create_book,
            list_books,
            sync_book,
            list_documents,
            create_document,
            search_documents,
            pick_folder,
            open_workspace_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
