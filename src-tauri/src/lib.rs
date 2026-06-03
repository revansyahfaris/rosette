pub mod git;
pub mod db;
pub mod llm;
pub mod search;
pub mod link_graph;
pub mod error;

pub use error::RosetteError;
pub type Result<T> = std::result::Result<T, RosetteError>;
