use keyring::Entry;
use serde::Serialize;

#[derive(Serialize)]
pub struct ProviderStatus {
    pub provider: String,
    pub configured: bool,
}

const SERVICE: &str = "inscriva";

#[tauri::command]
pub fn set_api_key(provider: String, key: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE, &provider).map_err(|e| e.to_string())?;
    entry.set_password(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_api_key(provider: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE, &provider).map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())
}

pub fn api_key_for(provider: &str) -> Result<String, String> {
    let entry = Entry::new(SERVICE, provider).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|_| {
        format!("No API key configured for {provider}")
    })
}

#[tauri::command]
pub fn list_providers() -> Result<Vec<ProviderStatus>, String> {
    let providers = ["openai", "anthropic", "google"];
    Ok(providers
        .iter()
        .map(|p| ProviderStatus {
            provider: (*p).to_string(),
            configured: Entry::new(SERVICE, p)
                .and_then(|e| e.get_password())
                .is_ok(),
        })
        .collect())
}
