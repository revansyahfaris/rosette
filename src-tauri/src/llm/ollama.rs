use serde_json::json;
use crate::Result;
use super::OllamaConfig;

pub async fn generate(prompt: &str, config: &OllamaConfig) -> Result<String> {
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/api/generate", config.base_url))
        .json(&json!({
            "model": config.model,
            "prompt": prompt,
            "stream": false,
        }))
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;

    Ok(res["response"].as_str().unwrap_or_default().to_string())
}
