use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use crate::Result;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub version: i32,
}

pub async fn create(pool: &SqlitePool, name: &str) -> Result<Workspace> {
    let workspace = Workspace {
        id: Uuid::new_v4().to_string(),
        name: name.to_string(),
        created_at: Utc::now().timestamp(),
        version: 1,
    };

    sqlx::query(
        "INSERT INTO workspace (id, name, created_at, version) VALUES (?, ?, ?, ?)"
    )
    .bind(&workspace.id)
    .bind(&workspace.name)
    .bind(workspace.created_at)
    .bind(workspace.version)
    .execute(pool)
    .await?;

    Ok(workspace)
}

pub async fn get(pool: &SqlitePool) -> Result<Option<Workspace>> {
    let workspace = sqlx::query_as::<_, Workspace>("SELECT * FROM workspace LIMIT 1")
        .fetch_optional(pool)
        .await?;

    Ok(workspace)
}

pub async fn update_name(pool: &SqlitePool, id: &str, name: &str) -> Result<()> {
    sqlx::query("UPDATE workspace SET name = ? WHERE id = ?")
        .bind(name)
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}
