// Prevents additional console window on Windows in release, do not remove!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rosette_lib::llm::{self, LlmConfig, OllamaConfig};
use rosette_lib::llm::modes::novel::NovelMode;
use rosette_lib::git::GitEngine;

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
fn save_document(path: String, content: String) -> Result<(), rosette_lib::RosetteError> {
    std::fs::write(path, content)?;
    Ok(())
}

#[derive(serde::Serialize)]
struct FileInfo {
    name: String,
    path: String,
    is_dir: bool,
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

                if is_dir || file_name.ends_with(".md") || file_name.ends_with(".txt") {
                    files.push(FileInfo {
                        name: file_name,
                        path: file_path,
                        is_dir,
                    });
                }
            }
        }
        Ok(files)
    } else {
        Err(rosette_lib::RosetteError::Internal("User cancelled".into()))
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![analyze_text, create_snapshot, save_document, open_workspace_dialog])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
