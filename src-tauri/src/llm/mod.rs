pub mod ollama;
pub mod cloud;
pub mod modes;

use serde::{Serialize, Deserialize};
use crate::Result;

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmConfig {
    pub mode: String, // "local", "cloud", "hybrid"
    pub local: Option<OllamaConfig>,
    pub cloud: Option<CloudConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaConfig {
    pub base_url: String,
    pub model: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudConfig {
    pub provider: String,
    pub base_url: String,
    pub model: String,
}

pub async fn generate(prompt: &str, config: &LlmConfig) -> Result<String> {
    // Basic router implementation
    if config.mode == "local" {
        if let Some(local_config) = &config.local {
            return ollama::generate(prompt, local_config).await;
        }
    }
    
    Err(crate::RosetteError::Internal("LLM mode not implemented".into()))
}
