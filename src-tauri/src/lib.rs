pub mod git;
pub mod db;
pub mod llm;
pub mod search;
pub mod link_graph;
pub mod error;
pub mod commands;

pub use error::RosetteError;
pub type Result<T> = std::result::Result<T, RosetteError>;

use sqlx::SqlitePool;
use tokio::sync::RwLock; // Gunakan RwLock yang lebih efisien untuk read/write state

pub struct AppState {
    // SqlitePool dipisah dan tidak perlu dibungkus Mutex karena internalnya sudah thread-safe pool
    pub db: RwLock<Option<SqlitePool>>,
    pub workspace_path: RwLock<Option<String>>,
}