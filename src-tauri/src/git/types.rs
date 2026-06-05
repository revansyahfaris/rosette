use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Snapshot {
    pub id: String,
    pub hash: String,
    pub name: String,
    pub message: String,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Draft {
    pub name: String,
    pub is_active: bool,
}
