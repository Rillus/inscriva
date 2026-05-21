use crate::book::BookState;
use crate::keys::api_key_for;
use futures_util::StreamExt;
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmRequest {
    pub task_id: String,
    pub provider: String,
    pub model: String,
    #[allow(dead_code)]
    pub book_id: String,
    pub chapter_key: Option<String>,
    pub selection_text: Option<String>,
    pub draft_excerpt: Option<String>,
    pub user_message: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextSection {
    pub label: String,
    pub path: Option<String>,
    pub chars: usize,
    pub included: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssembledContext {
    pub system: String,
    pub user: String,
    pub sections: Vec<ContextSection>,
    pub estimated_tokens: usize,
}

#[derive(Clone, Serialize)]
struct LlmChunkPayload {
    text: String,
}

#[derive(Clone, Serialize)]
struct LlmErrorPayload {
    error: String,
}

fn task_system_prompt(task_id: &str) -> String {
    let base = match task_id {
        "draft-scene" => "You are Inscriva's drafting assistant (task: draft-scene). Write prose for the requested scene card only. Match the Style Guide voice. Output finished prose, not meta commentary.",
        "expand-outline" => "You are Inscriva's outline assistant (task: expand-outline). Propose scene bullets that fit the master outline and continuity. Use markdown bullets only.",
        "review-continuity" => "You are Inscriva's continuity reviewer (task: review-continuity). List concrete issues with file/section references. Do not rewrite unless asked.",
        "review-voice" => "You are Inscriva's voice reviewer (task: review-voice). Suggest line-level voice tweaks against the Style Guide. No wholesale rewrites.",
        "review-structure" => "You are Inscriva's structure reviewer (task: review-structure). Compare outline beats to draft headings. Report missing or extra beats.",
        "fix-paragraph" => "You are Inscriva's line editor (task: fix-paragraph). Return a single replacement paragraph that preserves facts and POV.",
        "brainstorm" => "You are Inscriva's brainstorm partner (task: brainstorm). Respond with bullets and questions only — never draft chapter prose.",
        "explain-canon" => "You are Inscriva's canon explainer (task: explain-canon). Summarise the canon note in plain language for the author.",
        _ => "You are Inscriva's writing assistant.",
    };
    format!(
        "{base}\n\nRespect canon and continuity. Never invent facts that contradict the Continuity Log."
    )
}

fn load_book_files(root: &Path) -> Result<HashMap<String, String>, String> {
    let mut paths = Vec::new();
    collect_files(root, root, &mut paths)?;
    let mut files = HashMap::new();
    for rel in paths {
        if !rel.ends_with(".md") && !rel.ends_with(".json") && !rel.ends_with(".jsonl") {
            continue;
        }
        let full = root.join(&rel);
        if full.is_file() {
            if let Ok(content) = std::fs::read_to_string(&full) {
                files.insert(rel.replace('\\', "/"), content);
            }
        }
    }
    Ok(files)
}

fn collect_files(dir: &Path, root: &Path, out: &mut Vec<String>) -> Result<(), String> {
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name == ".git" {
            continue;
        }
        let path = entry.path();
        if path.is_dir() {
            collect_files(&path, root, out)?;
        } else {
            let rel = path
                .strip_prefix(root)
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .to_string();
            out.push(rel);
        }
    }
    Ok(())
}

fn find_canon_path<'a>(files: &'a HashMap<String, String>, pattern: &str) -> Option<&'a str> {
    files.keys().find(|p| {
        p.starts_with("00 Canon/") && p.to_lowercase().contains(&pattern.to_lowercase())
    }).map(|s| s.as_str())
}

fn chapter_outline_path<'a>(
    files: &'a HashMap<String, String>,
    chapter_key: &str,
) -> Option<&'a str> {
    files.keys().find(|p| {
        (p.contains("Chapter Outlines/") || p.contains("Chapter Outlines\\"))
            && p.contains(chapter_key)
    }).map(|s| s.as_str())
}

pub fn assemble_context(request: &LlmRequest, files: &HashMap<String, String>) -> AssembledContext {
    let mut blocks: Vec<(String, Option<String>, String)> = Vec::new();

    for (label, pattern) in [
        ("Style Guide", "style guide"),
        ("Character Bible", "character bible"),
        ("Continuity Log", "continuity log"),
    ] {
        if let Some(path) = find_canon_path(files, pattern) {
            if let Some(body) = files.get(path) {
                if !body.trim().is_empty() {
                    blocks.push((label.to_string(), Some(path.to_string()), body.trim().to_string()));
                }
            }
        }
    }

    if let Some(key) = &request.chapter_key {
        if let Some(path) = chapter_outline_path(files, key) {
            if let Some(body) = files.get(path) {
                blocks.push((
                    "Chapter outline".to_string(),
                    Some(path.to_string()),
                    body.trim().to_string(),
                ));
            }
        }
    }

    if let Some(text) = &request.selection_text {
        if !text.trim().is_empty() {
            blocks.push(("Selection".to_string(), None, text.trim().to_string()));
        }
    }
    if let Some(text) = &request.draft_excerpt {
        if !text.trim().is_empty() {
            blocks.push(("Draft excerpt".to_string(), None, text.trim().to_string()));
        }
    }
    if let Some(text) = &request.user_message {
        if !text.trim().is_empty() {
            blocks.push(("Author note".to_string(), None, text.trim().to_string()));
        }
    }

    let max_chars = 24_000usize;
    let mut used = 0usize;
    let mut sections = Vec::new();
    let mut included_bodies = Vec::new();

    for (label, path, body) in &blocks {
        let remaining = max_chars.saturating_sub(used);
        if remaining == 0 {
            sections.push(ContextSection {
                label: label.clone(),
                path: path.clone(),
                chars: body.len(),
                included: false,
            });
            continue;
        }
        let mut text = body.clone();
        if text.len() > remaining {
            text.truncate(remaining);
            text.push_str("\n…[trimmed]");
        }
        used += text.len();
        sections.push(ContextSection {
            label: label.clone(),
            path: path.clone(),
            chars: text.len(),
            included: true,
        });
        let path_suffix = path
            .as_ref()
            .map(|p| format!(" ({p})"))
            .unwrap_or_default();
        included_bodies.push(format!("## {label}{path_suffix}\n\n{text}"));
    }

    let user = [
        format!("Task: {}", request.task_id),
        request
            .chapter_key
            .as_ref()
            .map(|k| format!("Chapter: {k}"))
            .unwrap_or_default(),
        String::new(),
        included_bodies.join("\n\n"),
    ]
    .join("\n");

    let system = task_system_prompt(&request.task_id);
    let chars = system.len() + user.len();

    AssembledContext {
        system,
        user,
        sections,
        estimated_tokens: chars.div_ceil(4),
    }
}

fn require_root(state: &State<Mutex<BookState>>) -> Result<PathBuf, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .root
        .clone()
        .ok_or_else(|| "No book open".to_string())
}

#[tauri::command]
pub fn llm_preview(
    request: LlmRequest,
    state: State<Mutex<BookState>>,
) -> Result<AssembledContext, String> {
    let root = require_root(&state)?;
    let files = load_book_files(&root)?;
    Ok(assemble_context(&request, &files))
}

#[tauri::command]
pub async fn llm_stream(
    request: LlmRequest,
    app: AppHandle,
    state: State<'_, Mutex<BookState>>,
) -> Result<(), String> {
    let root = require_root(&state)?;
    let api_key = api_key_for(&request.provider)?;
    let files = load_book_files(&root)?;
    let ctx = assemble_context(&request, &files);

    let app_handle = app.clone();
    let provider = request.provider.clone();
    let model = request.model.clone();

    tauri::async_runtime::spawn(async move {
        let result = stream_llm(
            &provider,
            &model,
            &api_key,
            &ctx.system,
            &ctx.user,
            |text| {
                let _ = app_handle.emit("llm-chunk", LlmChunkPayload { text: text.to_string() });
            },
        )
        .await;

        if let Err(error) = result {
            let _ = app_handle.emit("llm-error", LlmErrorPayload { error });
        }
        let _ = app_handle.emit("llm-done", ());
    });

    Ok(())
}

async fn stream_llm(
    provider: &str,
    model: &str,
    api_key: &str,
    system: &str,
    user: &str,
    on_chunk: impl Fn(&str),
) -> Result<(), String> {
    match provider {
        "openai" | "custom" => stream_openai(model, api_key, system, user, on_chunk).await,
        "anthropic" => stream_anthropic(model, api_key, system, user, on_chunk).await,
        "google" => stream_google(model, api_key, system, user, on_chunk).await,
        other => Err(format!("Unknown provider: {other}")),
    }
}

async fn stream_openai(
    model: &str,
    api_key: &str,
    system: &str,
    user: &str,
    on_chunk: impl Fn(&str),
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let res = client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&serde_json::json!({
            "model": model,
            "stream": true,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": user }
            ]
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(res.text().await.unwrap_or_else(|e| e.to_string()));
    }

    parse_openai_sse(res, on_chunk).await
}

async fn parse_openai_sse(
    res: reqwest::Response,
    on_chunk: impl Fn(&str),
) -> Result<(), String> {
    let mut stream = res.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim_end_matches('\r').to_string();
            buffer = buffer[pos + 1..].to_string();
            if let Some(data) = line.strip_prefix("data:") {
                let data = data.trim();
                if data == "[DONE]" {
                    return Ok(());
                }
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(text) = parsed["choices"][0]["delta"]["content"].as_str() {
                        on_chunk(text);
                    }
                }
            }
        }
    }
    Ok(())
}

async fn stream_anthropic(
    model: &str,
    api_key: &str,
    system: &str,
    user: &str,
    on_chunk: impl Fn(&str),
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let res = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&serde_json::json!({
            "model": model,
            "max_tokens": 4096,
            "stream": true,
            "system": system,
            "messages": [{ "role": "user", "content": user }]
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(res.text().await.unwrap_or_else(|e| e.to_string()));
    }

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim_end_matches('\r').to_string();
            buffer = buffer[pos + 1..].to_string();
            if let Some(data) = line.strip_prefix("data:") {
                let data = data.trim();
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                    if parsed["type"] == "content_block_delta" {
                        if let Some(text) = parsed["delta"]["text"].as_str() {
                            on_chunk(text);
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

async fn stream_google(
    model: &str,
    api_key: &str,
    system: &str,
    user: &str,
    on_chunk: impl Fn(&str),
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?key={}",
        urlencoding::encode(model),
        urlencoding::encode(api_key)
    );
    let res = client
        .post(url)
        .json(&serde_json::json!({
            "systemInstruction": { "parts": [{ "text": system }] },
            "contents": [{ "role": "user", "parts": [{ "text": user }] }]
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(res.text().await.unwrap_or_else(|e| e.to_string()));
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    for part in body.lines() {
        let trimmed = part.trim().trim_end_matches(',');
        if trimmed.is_empty() || trimmed == "[" || trimmed == "]" {
            continue;
        }
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(trimmed) {
            if let Some(text) = parsed["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                on_chunk(text);
            }
        }
    }
    Ok(())
}
