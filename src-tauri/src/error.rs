use thiserror::Error;

#[derive(Error, Debug)]
pub enum RosetteError {
    #[error("Database error: {0}")]
    Db(#[from] sqlx::Error),

    #[error("Git error: {0}")]
    Git(#[from] git2::Error),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Unknown error")]
    Unknown,
}

impl serde::Serialize for RosetteError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
