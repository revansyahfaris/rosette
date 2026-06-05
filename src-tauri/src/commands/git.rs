use tauri::State;
use crate::AppState;
use crate::db::books;
use crate::git::{GitEngine, Snapshot};

#[tauri::command]
pub async fn create_snapshot(state: State<'_, AppState>, name: String) -> Result<(), crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("Workspace belum dimuat".into()))?;
    let books = books::list(pool).await?;
    
    let mut failed_books = Vec::new();

    // Jalankan perulangan tanpa langsung memutus aliran data jika ada crash tunggal
    for book in books {
        let git_result = GitEngine::open(&book.git_path)
            .or_else(|_| GitEngine::init(&book.git_path));

        match git_result {
            Ok(git) => {
                // Jalankan proses snapshotting internal
                if let Err(err) = git.snapshot(&name) {
                    eprintln!("Gagal membuat snapshot untuk buku '{}': {:?}", book.name, err);
                    failed_books.push(format!("{} (Error: {})", book.name, err));
                }
            }
            Err(err) => {
                eprintln!("Gagal membuka/inisialisasi GitEngine pada buku '{}': {:?}", book.name, err);
                failed_books.push(format!("{} (Gagal inisialisasi Git: {})", book.name, err));
            }
        }
    }

    // Jika ada satu atau lebih buku yang gagal, kembalikan laporan kegagalan akumulatif ke frontend
    if !failed_books.is_empty() {
        let error_message = format!(
            "Proses snapshot selesai parsial. Buku berikut gagal dicadangkan: {}", 
            failed_books.join(", ")
        );
        return Err(crate::RosetteError::Internal(error_message));
    }
    
    Ok(())
}

#[tauri::command]
pub async fn list_snapshots(state: State<'_, AppState>) -> Result<Vec<Snapshot>, crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    let books = books::list(pool).await?;
    
    if let Some(first_book) = books.first() {
        if let Ok(git) = GitEngine::open(&first_book.git_path) {
            return git.list_snapshots();
        }
    }
    Ok(vec![])
}

#[tauri::command]
pub fn restore_snapshot(path: String, hash: String) -> Result<(), crate::RosetteError> {
    let git = GitEngine::open(&path)?;
    git.restore(&hash)
}

#[tauri::command]
pub async fn check_git_status(state: State<'_, AppState>) -> Result<bool, crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = match db_lock.as_ref() {
        Some(p) => p,
        None => return Ok(false),
    };
    
    let books = books::list(pool).await.unwrap_or_default();
    for book in books {
        if let Ok(git) = GitEngine::open(&book.git_path) {
            if git.has_uncommitted_changes().unwrap_or(false) {
                return Ok(true);
            }
        }
    }
    Ok(false)
}