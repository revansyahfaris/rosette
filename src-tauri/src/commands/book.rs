use tauri::State;
use crate::AppState;
use crate::db::books::{self, Book};

#[tauri::command]
pub async fn create_book(state: State<'_, AppState>, name: String, slug: String, book_type: String) -> Result<Book, crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    let path_lock = state.workspace_path.read().await;
    let base_path = path_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    books::create(pool, &name, &slug, None, &book_type, base_path).await
}

#[tauri::command]
pub async fn rename_book(state: State<'_, AppState>, id: String, new_name: String) -> Result<(), crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    books::rename_book(pool, &id, &new_name).await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_book(state: State<'_, AppState>, id: String) -> Result<(), crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    if let Some(git_path) = books::delete_book(pool, &id).await? {
        let _ = std::fs::remove_dir_all(git_path);
    }
    Ok(())
}

#[tauri::command]
pub async fn list_books(state: State<'_, AppState>) -> Result<Vec<Book>, crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    books::list(pool).await
}

#[tauri::command]
pub async fn update_book_order(state: State<'_, AppState>, updates: Vec<(String, i32)>) -> Result<(), crate::RosetteError> {
    let db_lock = state.db.read().await;
    let pool = db_lock.as_ref().ok_or_else(|| crate::RosetteError::Internal("No workspace loaded".into()))?;
    
    for (id, sort_order) in updates {
        books::update_book_order(pool, &id, sort_order).await?;
    }
    Ok(())
}