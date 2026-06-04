use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use crate::Result;
use crate::git::GitEngine;
use uuid::Uuid;
use chrono::Utc;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Book {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub description: Option<String>,
    pub book_type: String, // 'main', 'encyclopedia', etc.
    pub git_path: String,
    pub created_at: i64,
}

pub async fn create(
    pool: &SqlitePool, 
    name: &str, 
    slug: &str, 
    description: Option<&str>,
    book_type: &str,
    base_path: &str
) -> Result<Book> {
    let book_id = Uuid::new_v4().to_string();
    let git_path = Path::new(base_path).join("books").join(slug);
    let git_path_str = git_path.to_string_lossy().to_string();

    // 1. Initialize Git repository
    GitEngine::init(&git_path_str)?;

    let book = Book {
        id: book_id,
        slug: slug.to_string(),
        name: name.to_string(),
        description: description.map(|s| s.to_string()),
        book_type: book_type.to_string(),
        git_path: git_path_str,
        created_at: Utc::now().timestamp(),
    };

    // 2. Insert into DB
    sqlx::query(
        "INSERT INTO books (id, slug, name, description, type, git_path, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&book.id)
    .bind(&book.slug)
    .bind(&book.name)
    .bind(&book.description)
    .bind(&book.book_type)
    .bind(&book.git_path)
    .bind(book.created_at)
    .execute(pool)
    .await?;

    Ok(book)
}

pub async fn list(pool: &SqlitePool) -> Result<Vec<Book>> {
    let books = sqlx::query_as::<_, Book>("SELECT id, slug, name, description, type as book_type, git_path, created_at FROM books")
        .fetch_all(pool)
        .await?;

    Ok(books)
}

pub async fn get_by_slug(pool: &SqlitePool, slug: &str) -> Result<Option<Book>> {
    let book = sqlx::query_as::<_, Book>(
        "SELECT id, slug, name, description, type as book_type, git_path, created_at FROM books WHERE slug = ?"
    )
    .bind(slug)
    .fetch_optional(pool)
    .await?;

    Ok(book)
}
