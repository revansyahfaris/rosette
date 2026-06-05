use sqlx::SqlitePool;

pub async fn insert_link(
    pool: &SqlitePool,
    source_book_id: &str,
    source_doc_id: &str,
    target_book_id: &str,
    target_doc_id: &str,
) -> Result<(), crate::RosetteError> {
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO links (id, source_book_id, source_doc_id, target_book_id, target_doc_id, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        "#,
    )
    .bind(format!("{}-{}", source_doc_id, target_doc_id))
    .bind(source_book_id)
    .bind(source_doc_id)
    .bind(target_book_id)
    .bind(target_doc_id)
    .execute(pool)
    .await
    .map_err(|e| crate::RosetteError::Internal(format!("Gagal menyimpan grafik link: {}", e)))?;

    Ok(())
}

pub async fn clear_document_outgoing_links(
    pool: &SqlitePool,
    source_doc_id: &str,
) -> Result<(), crate::RosetteError> {
    sqlx::query(
        r#"
        DELETE FROM links WHERE source_doc_id = ?
        "#,
    )
    .bind(source_doc_id)
    .execute(pool)
    .await
    .map_err(|e| crate::RosetteError::Internal(format!("Gagal membersihkan link lama: {}", e)))?;

    Ok(())
}