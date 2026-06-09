#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rosette_lib::AppState; // Diambil dari library crate rosette_lib
use tokio::sync::Mutex;    // Tetap gunakan Mutex bawaan tokio untuk pembungkus awal app runtime

// Import masukan semua perintah sub-modul melalui path rosette_lib
use rosette_lib::commands::{
    workspace::*,
    book::*,
    document::*,
    git::*,
    llm::*,
};

fn main() {
    tauri::Builder::default()
        // Menginisialisasi AppState global menggunakan RwLock asinkron internal
        .manage(AppState {
            db: tokio::sync::RwLock::new(None),
            workspace_path: tokio::sync::RwLock::new(None),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            analyze_text, 
            get_available_models,
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
            open_workspace_dialog,
            get_all_documents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}