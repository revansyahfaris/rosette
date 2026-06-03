use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use crate::Result;

pub mod workspace;
pub mod books;
pub mod documents;
pub mod links;
pub mod snapshots;

pub async fn init_db(database_url: &str) -> Result<SqlitePool> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    // Run migrations
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS workspace (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at INTEGER,
            version INTEGER DEFAULT 1
        );"
    ).execute(&pool).await?;

    // Add other tables as defined in GEMINI.md
    
    Ok(pool)
}
