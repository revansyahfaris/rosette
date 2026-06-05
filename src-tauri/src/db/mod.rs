use sqlx::{sqlite::{SqliteConnectOptions, SqliteJournalMode, SqliteSynchronous}, SqlitePool};
use crate::Result;

pub mod workspace;
pub mod books;
pub mod documents;
pub mod links;
pub mod snapshots;

pub async fn init_db(database_url: &str) -> Result<SqlitePool> {
    // 🌟 PERBAIKAN PERFORMA: Gunakan SqliteConnectOptions untuk menyuntikkan Mode WAL
    // Kita bersihkan awalan "sqlite:" jika ada pada URL untuk parsing path file murni
    let connection_path = database_url.strip_prefix("sqlite:").unwrap_or(database_url);

    let connect_options = SqliteConnectOptions::new()
        .filename(connection_path)
        .create_if_missing(true)
        // ⚡ WAL mode membuat operasi Read & Write berjalan simultan tanpa memicu database locked
        .journal_mode(SqliteJournalMode::Wal)
        // ⚡ Synchronous Normal memotong latensi penulisan disk I/O secara masif, sangat cocok untuk autosave
        .synchronous(SqliteSynchronous::Normal);

    // Bangun Pool Koneksi dengan konfigurasi performa di atas
    let pool = SqlitePool::connect_with(connect_options)
        .await
        .map_err(|e| crate::RosetteError::Internal(format!("Gagal membangun pool database: {}", e)))?;

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
            created_at INTEGER,
            sort_order INTEGER DEFAULT 0
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
            modified_at INTEGER,
            sort_order INTEGER DEFAULT 0
        );"
    ).execute(&pool).await?;

    // Attempt to add sort_order columns if they don't exist (for existing dev databases)
    let _ = sqlx::query("ALTER TABLE books ADD COLUMN sort_order INTEGER DEFAULT 0").execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE documents ADD COLUMN sort_order INTEGER DEFAULT 0").execute(&pool).await;

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