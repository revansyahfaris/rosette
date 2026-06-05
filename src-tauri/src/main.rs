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
async fn create_snapshot(state: State<'_, AppState>, name: String) -> Result<(), rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    let books = books::list(pool).await?;
    
    for book in books {
        let git = GitEngine::open(&book.git_path).or_else(|_| GitEngine::init(&book.git_path))?;
        git.snapshot(&name)?;
    }
    
    Ok(())
}

#[tauri::command]
async fn list_snapshots(state: State<'_, AppState>) -> Result<Vec<rosette_lib::git::Snapshot>, rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    // We get snapshots from the first book as a proxy for the workspace timeline.
    // In a real implementation, we'd either track a central workspace repo,
    // or merge the timelines. For now, since we snapshot all books simultaneously,
    // any book's timeline represents the workspace timeline.
    let books = books::list(pool).await?;
    if let Some(first_book) = books.first() {
        if let Ok(git) = GitEngine::open(&first_book.git_path) {
            return git.list_snapshots();
        }
    }
    
    Ok(vec![])
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
async fn rename_book(
    state: State<'_, AppState>,
    id: String,
    new_name: String
) -> Result<(), rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    books::rename_book(pool, &id, &new_name).await?;
    Ok(())
}

#[tauri::command]
async fn delete_book(
    state: State<'_, AppState>,
    id: String
) -> Result<(), rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    if let Some(git_path) = books::delete_book(pool, &id).await? {
        let _ = std::fs::remove_dir_all(git_path); // Ignore if folder doesn't exist
    }
    Ok(())
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
async fn update_book_order(
    state: State<'_, AppState>,
    updates: Vec<(String, i32)>
) -> Result<(), rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    for (id, sort_order) in updates {
        books::update_book_order(pool, &id, sort_order).await?;
    }
    Ok(())
}

#[tauri::command]
async fn update_document_order(
    state: State<'_, AppState>,
    updates: Vec<(String, i32)>
) -> Result<(), rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    for (id, sort_order) in updates {
        documents::update_document_order(pool, &id, sort_order).await?;
    }
    Ok(())
}

#[tauri::command]
async fn move_document_to_book(
    state: State<'_, AppState>,
    doc_id: String,
    new_book_id: String,
    old_book_path: String,
    new_book_path: String,
    file_path: String
) -> Result<(), rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    let old_full_path = std::path::Path::new(&old_book_path).join(&file_path);
    let new_full_path = std::path::Path::new(&new_book_path).join(&file_path);
    
    // Physically move the file
    if old_full_path.exists() {
        std::fs::rename(old_full_path, new_full_path)?;
    }
    
    // Update database
    documents::move_document(pool, &doc_id, &new_book_id).await?;
    
    Ok(())
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
async fn rename_document(
    state: State<'_, AppState>,
    id: String,
    new_title: String
) -> Result<(), rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    documents::rename_document(pool, &id, &new_title).await?;
    Ok(())
}

#[tauri::command]
async fn delete_document(
    state: State<'_, AppState>,
    id: String,
    book_path: String
) -> Result<(), rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = db_lock.as_ref().ok_or_else(|| {
        rosette_lib::RosetteError::Internal("No workspace loaded".into())
    })?;
    
    if let Some(file_path) = documents::delete_document(pool, &id).await? {
        let full_path = std::path::Path::new(&book_path).join(file_path);
        let _ = std::fs::remove_file(full_path);
    }
    Ok(())
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

#[tauri::command]
async fn check_git_status(state: State<'_, AppState>) -> Result<bool, rosette_lib::RosetteError> {
    let db_lock = state.db.lock().await;
    let pool = match db_lock.as_ref() {
        Some(p) => p,
        None => return Ok(false), // No workspace loaded yet
    };
    
    let books = books::list(pool).await.unwrap_or_default();
    
    for book in books {
        if let Ok(git) = GitEngine::open(&book.git_path).or_else(|_| GitEngine::init(&book.git_path)) {
            if git.has_uncommitted_changes().unwrap_or(false) {
                return Ok(true);
            }
        }
    }
    
    Ok(false)
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
            check_git_status,
            save_document,
            load_document,
            initialize_workspace,
            load_workspace,
            update_workspace_name,
            create_book,
            rename_book,
            delete_book,
            list_books,
            update_book_order,
            sync_book,
            list_documents,
            create_document,
            rename_document,
            delete_document,
            update_document_order,
            move_document_to_book,
            search_documents,
            pick_folder,
            open_workspace_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
