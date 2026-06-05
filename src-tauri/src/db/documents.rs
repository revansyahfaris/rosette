use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use crate::Result;
use uuid::Uuid;
use chrono::Utc;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Document {
    pub id: String,
    pub book_id: String,
    pub file_path: String,
    pub title: Option<String>,
    pub doc_type: Option<String>,
    pub tags: Option<String>, // JSON string
    pub created_at: i64,
    pub modified_at: i64,
}

pub async fn create(
    pool: &SqlitePool,
    book_id: &str,
    file_path: &str,
    title: Option<&str>,
    doc_type: Option<&str>,
    tags: Option<&str>
) -> Result<Document> {
    let doc = Document {
        id: Uuid::new_v4().to_string(),
        book_id: book_id.to_string(),
        file_path: file_path.to_string(),
        title: title.map(|s| s.to_string()),
        doc_type: doc_type.map(|s| s.to_string()),
        tags: tags.map(|s| s.to_string()),
        created_at: Utc::now().timestamp(),
        modified_at: Utc::now().timestamp(),
    };

    sqlx::query(
        "INSERT INTO documents (id, book_id, file_path, title, doc_type, tags, created_at, modified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&doc.id)
    .bind(&doc.book_id)
    .bind(&doc.file_path)
    .bind(&doc.title)
    .bind(&doc.doc_type)
    .bind(&doc.tags)
    .bind(doc.created_at)
    .bind(doc.modified_at)
    .execute(pool)
    .await?;

    Ok(doc)
}

pub async fn list_by_book(pool: &SqlitePool, book_id: &str) -> Result<Vec<Document>> {
    let docs = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE book_id = ?"
    )
    .bind(book_id)
    .fetch_all(pool)
    .await?;

    Ok(docs)
}

pub async fn sync_book_files(pool: &SqlitePool, book_id: &str, book_path: &str) -> Result<()> {
    // 1. Get existing documents from DB
    let existing_docs = list_by_book(pool, book_id).await?;
    let mut db_paths: std::collections::HashSet<String> = existing_docs.into_iter().map(|d| d.file_path).collect();

    // 2. Scan filesystem
    for entry in WalkDir::new(book_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
            let relative_path = path.strip_prefix(book_path).unwrap_or(path).to_string_lossy().to_string();
            
            if db_paths.contains(&relative_path) {
                db_paths.remove(&relative_path);
            } else {
                // New file
                let title = path.file_stem().map(|s| s.to_string_lossy().to_string());
                create(pool, book_id, &relative_path, title.as_deref(), None, None).await?;
            }
        }
    }

    // 3. Remove documents from DB that no longer exist on disk
    for missing_path in db_paths {
        sqlx::query("DELETE FROM documents WHERE book_id = ? AND file_path = ?")
            .bind(book_id)
            .bind(missing_path)
            .execute(pool)
            .await?;
    }

    Ok(())
}

pub async fn search(pool: &SqlitePool, book_id: &str, query: &str) -> Result<Vec<Document>> {
    let docs = sqlx::query_as::<_, Document>(
        "SELECT d.* FROM documents d 
         JOIN documents_fts f ON d.id = f.rowid 
         WHERE d.book_id = ? AND fts5_match(?) 
         ORDER BY rank"
    )
    .bind(book_id)
    .bind(query)
    .fetch_all(pool)
    .await?;

    Ok(docs)
}
