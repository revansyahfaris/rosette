use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use crate::Result;
use uuid::Uuid;
use chrono::Utc;
use std::path::Path;
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

use regex::Regex;
use serde_json::json;

pub async fn sync_book_files(pool: &SqlitePool, book_id: &str, book_path: &str) -> Result<()> {
    // 1. Get existing documents from DB
    let existing_docs = list_by_book(pool, book_id).await?;
    let mut db_paths: std::collections::HashSet<String> = existing_docs.into_iter().map(|d| d.file_path).collect();

    let fm_regex = Regex::new(r"(?s)^---\s*\n(.*?)\n---\s*\n").unwrap();
    let title_regex = Regex::new(r#"title:\s*["']?(.*?)["']?\s*(\n|$)"#).unwrap();
    let type_regex = Regex::new(r#"type:\s*["']?(.*?)["']?\s*(\n|$)"#).unwrap();
    let tags_regex = Regex::new(r#"tags:\s*\[(.*?)\]"#).unwrap();

    // 2. Scan filesystem
    for entry in WalkDir::new(book_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
            let relative_path = path.strip_prefix(book_path).unwrap_or(path).to_string_lossy().to_string();
            
            // Skip hidden files/folders
            if relative_path.contains("/.") || relative_path.starts_with('.') {
                continue;
            }

            let content = std::fs::read_to_string(path).unwrap_or_default();
            
            let mut title = path.file_stem().map(|s| s.to_string_lossy().to_string());
            let mut doc_type = None;
            let mut tags = None;

            if let Some(caps) = fm_regex.captures(&content) {
                let fm_content = &caps[1];
                
                if let Some(t_caps) = title_regex.captures(fm_content) {
                    title = Some(t_caps[1].to_string());
                }
                if let Some(dt_caps) = type_regex.captures(fm_content) {
                    doc_type = Some(dt_caps[1].to_string());
                }
                if let Some(tg_caps) = tags_regex.captures(fm_content) {
                    let tags_list: Vec<String> = tg_caps[1]
                        .split(',')
                        .map(|s| s.trim().trim_matches('"').trim_matches('\'').to_string())
                        .filter(|s| !s.is_empty())
                        .collect();
                    tags = Some(json!(tags_list).to_string());
                }
            }

            if db_paths.contains(&relative_path) {
                // Update existing
                sqlx::query(
                    "UPDATE documents SET title = ?, doc_type = ?, tags = ?, modified_at = ? 
                     WHERE book_id = ? AND file_path = ?"
                )
                .bind(&title)
                .bind(&doc_type)
                .bind(&tags)
                .bind(Utc::now().timestamp())
                .bind(book_id)
                .bind(&relative_path)
                .execute(pool)
                .await?;

                db_paths.remove(&relative_path);
            } else {
                // New file
                create(pool, book_id, &relative_path, title.as_deref(), doc_type.as_deref(), tags.as_deref()).await?;
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
    // Simplified search for Milestone 1: search title and tags metadata
    let docs = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents 
         WHERE book_id = ? AND (title LIKE ? OR tags LIKE ?)"
    )
    .bind(book_id)
    .bind(format!("%{}%", query))
    .bind(format!("%{}%", query))
    .fetch_all(pool)
    .await?;

    Ok(docs)
}
