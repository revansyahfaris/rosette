use crate::llm::{self, LlmConfig, OllamaConfig};
use crate::llm::modes::novel::NovelMode;

// Struct untuk mencocokkan format response dari Ollama API /api/tags
#[derive(serde::Deserialize, serde::Serialize)]
struct OllamaModelInfo {
    name: String,
}

#[derive(serde::Deserialize, serde::Serialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModelInfo>,
}

// Perintah Baru: Mengambil daftar model yang sudah terunduh di PC user
#[tauri::command]
pub async fn get_available_models() -> Result<Vec<String>, crate::RosetteError> {
    let client = reqwest::Client::new();
    
    // Tembak API lokal Ollama untuk mengecek model yang terinstall
    let res = client.get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|_| crate::RosetteError::Internal("Ollama tidak aktif di background. Silakan nyalakan Ollama terlebih dahulu.".into()))?;

    let tags: OllamaTagsResponse = res.json()
        .await
        .map_err(|_| crate::RosetteError::Internal("Gagal membaca format data dari Ollama".into()))?;

    // Ambil hanya nama-nama modelnya saja
    let model_names = tags.models.into_iter().map(|m| m.name).collect();
    Ok(model_names)
}

#[tauri::command]
pub async fn analyze_text(text: String, model_name: Option<String>) -> Result<String, crate::RosetteError> {
    let active_model = model_name.unwrap_or_else(|| "qwen2.5:1.5b".into());

    let config = LlmConfig {
        mode: "local".into(),
        local: Some(OllamaConfig {
            base_url: "http://localhost:11434".into(),
            model: active_model,
        }),
        cloud: None,
    };

    let prompt = NovelMode::wrap_prompt(&text);
    llm::generate(&prompt, &config).await
}