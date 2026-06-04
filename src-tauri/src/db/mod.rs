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

    // Create tables
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS workspace (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at INTEGER,
            version INTEGER DEFAULT 1
        );"
    ).execute(&pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            slug TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT DEFAULT 'main',
            git_path TEXT NOT NULL,
            created_at INTEGER
        );"
    ).execute(&pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            book_id TEXT REFERENCES books(id),
            file_path TEXT NOT NULL,
            title TEXT,
            doc_type TEXT,
            tags TEXT,
            created_at INTEGER,
            modified_at INTEGER
        );"
    ).execute(&pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS links (
            id TEXT PRIMARY KEY,
            source_book_id TEXT NOT NULL,
            source_doc_id TEXT NOT NULL,
            target_book_id TEXT NOT NULL,
            target_doc_id TEXT NOT NULL,
            link_type TEXT,
            context_snippet TEXT,
            created_at INTEGER
        );"
    ).execute(&pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS snapshots (
            id TEXT PRIMARY KEY,
            book_id TEXT REFERENCES books(id),
            git_commit_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            created_at INTEGER
        );"
    ).execute(&pool).await?;

    // Full-text search virtual table
    sqlx::query(
        "CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
            title, content, tags,
            content=documents,
            content_rowid=id
        );"
    ).execute(&pool).await?;
    
    Ok(pool)
}
