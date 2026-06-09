use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use crate::Result;
use uuid::Uuid;
use chrono::Utc;
use walkdir::WalkDir;

// 🌟 PERBAIKAN STRUCT: Ditambahkan sort_order agar sinkron dengan database & query SELECT *
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Document {
    pub id: String,
    pub book_id: String,
    pub file_path: String,
    pub title: Option<String>,
    pub doc_type: Option<String>,
    pub tags: Option<String>, // JSON string
    pub sort_order: i32,      // 🌟 Ditambahkan agar query_as / SELECT * tidak crash
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
        sort_order: 0, // Default order baru
        created_at: Utc::now().timestamp(),
        modified_at: Utc::now().timestamp(),
    };

    sqlx::query(
        "INSERT INTO documents (id, book_id, file_path, title, doc_type, tags, sort_order, created_at, modified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&doc.id)
    .bind(&doc.book_id)
    .bind(&doc.file_path)
    .bind(&doc.title)
    .bind(&doc.doc_type)
    .bind(&doc.tags)
    .bind(doc.sort_order)
    .bind(doc.created_at)
    .bind(doc.modified_at)
    .execute(pool)
    .await?;

    Ok(doc)
}

pub async fn list_by_book(pool: &SqlitePool, book_id: &str) -> Result<Vec<Document>> {
    // Menggunakan SELECT * kini aman karena sort_order sudah ada di struct Document
    let docs = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE book_id = ? ORDER BY sort_order ASC, created_at ASC"
    )
    .bind(book_id)
    .fetch_all(pool)
    .await?;

    Ok(docs)
}

pub async fn update_document_order(pool: &SqlitePool, id: &str, sort_order: i32) -> Result<()> {
    sqlx::query("UPDATE documents SET sort_order = ? WHERE id = ?")
        .bind(sort_order)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn move_document(pool: &SqlitePool, id: &str, new_book_id: &str) -> Result<()> {
    sqlx::query("UPDATE documents SET book_id = ? WHERE id = ?")
        .bind(new_book_id)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn sync_book_files(pool: &SqlitePool, book_id: &str, book_path: &str) -> Result<()> {
    // 1. Ambil seluruh dokumen yang terdaftar di database saat ini
    let existing_docs = list_by_book(pool, book_id).await?;
    let mut db_paths: std::collections::HashSet<String> = existing_docs.into_iter().map(|d| d.file_path).collect();

    // 2. Pindai filesystem lokal
    for entry in WalkDir::new(book_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
            let relative_path = path.strip_prefix(book_path).unwrap_or(path).to_string_lossy().to_string();
            
            if db_paths.contains(&relative_path) {
                db_paths.remove(&relative_path);
            } else {
                let title = path.file_stem().map(|s| s.to_string_lossy().to_string());
                create(pool, book_id, &relative_path, title.as_deref(), None, None).await?;
            }
        }
    }

    // 3. 🌟 FAILSAFE SINKRONISASI (Tetap Dipertahankan Aman Dari Glitch Cloud)
    for missing_path in db_paths {
        let full_check_path = std::path::Path::new(book_path).join(&missing_path);
        
        if !full_check_path.exists() {
            let _ = sqlx::query(
                "DELETE FROM links 
                 WHERE source_doc_id = (SELECT id FROM documents WHERE file_path = ? AND book_id = ?) 
                    OR target_doc_id = (SELECT id FROM documents WHERE file_path = ? AND book_id = ?)"
            )
            .bind(&missing_path)
            .bind(book_id)
            .bind(&missing_path)
            .bind(book_id)
            .execute(pool)
            .await;

            sqlx::query("DELETE FROM documents WHERE book_id = ? AND file_path = ?")
                .bind(book_id)
                .bind(missing_path)
                .execute(pool)
                .await?;
        }
    }

    Ok(())
}

pub fn sanitize_fts5_query(input: &str) -> String {
    let clean = input.replace('"', " ")
                     .replace(':', " ")
                     .replace('*', " ")
                     .replace('(', " ")
                     .replace(')', " ");

    let mut sanitized_words = Vec::new();

    for word in clean.split_whitespace() {
        let upper_word = word.to_uppercase();
        if upper_word == "AND" || upper_word == "OR" || upper_word == "NOT" || upper_word.starts_with("NEAR") {
            sanitized_words.push(format!("\"{}\"", word));
        } else {
            sanitized_words.push(format!("\"{}\"*", word));
        }
    }

    if sanitized_words.is_empty() {
        "".to_string()
    } else {
        sanitized_words.join(" ")
    }
}

pub async fn search(pool: &SqlitePool, book_id: &str, query: &str) -> crate::Result<Vec<Document>> {
    let safe_query = sanitize_fts5_query(query);

    if safe_query.is_empty() && !query.is_empty() {
        return Ok(Vec::new());
    }

    // 🌟 PERBAIKAN QUERY SELECT: Menghapus field 'content' yang fiktif, 
    // dan menarik kolom asli tabel yang sesuai dengan isi struct Document Rust.
    let rows = if book_id.is_empty() {
        sqlx::query_as::<_, Document>(
            "SELECT id, book_id, file_path, title, doc_type, tags, sort_order, created_at, modified_at 
             FROM documents 
             WHERE id IN (
                 SELECT rowid FROM documents_fts WHERE documents_fts MATCH ?
             )
             ORDER BY sort_order ASC"
        )
        .bind(&safe_query)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, Document>(
            "SELECT id, book_id, file_path, title, doc_type, tags, sort_order, created_at, modified_at 
             FROM documents 
             WHERE book_id = ? AND id IN (
                 SELECT rowid FROM documents_fts WHERE documents_fts MATCH ?
             )
             ORDER BY sort_order ASC"
        )
        .bind(book_id)
        .bind(&safe_query)
        .fetch_all(pool)
        .await?
    };

    Ok(rows)
}

pub async fn rename_document(pool: &SqlitePool, id: &str, new_title: &str) -> Result<()> {
    sqlx::query("UPDATE documents SET title = ?, modified_at = ? WHERE id = ?")
        .bind(new_title)
        .bind(Utc::now().timestamp())
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete_document(pool: &SqlitePool, id: &str) -> Result<Option<String>> {
    // Menggunakan SELECT * sekarang aman karena struct Document sudah lengkap
    let doc = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    if let Some(d) = doc {
        sqlx::query("DELETE FROM documents WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;
        
        Ok(Some(d.file_path))
    } else {
        Ok(None)
    }
}

pub async fn get_all_documents(pool: &SqlitePool) -> Result<Vec<Document>> {
    let docs = sqlx::query_as::<_, Document>(
        "SELECT id, book_id, file_path, title, doc_type, tags, sort_order, created_at, modified_at 
         FROM documents 
         ORDER BY title ASC, created_at ASC"
    )
    .fetch_all(pool)
    .await?;

    Ok(docs)
}