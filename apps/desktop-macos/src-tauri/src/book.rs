use crate::watch::BookWatcher;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, State};

pub fn repo_name_from_url(url: &str) -> String {
    let trimmed = url.trim().trim_end_matches(".git").trim_end_matches('/');
    if let Some(rest) = trimmed.split(':').next_back() {
        if trimmed.contains('@') && !trimmed.contains("://") {
            return rest.split('/').next_back().unwrap_or("book").to_string();
        }
    }
    trimmed
        .split('/')
        .filter(|s| !s.is_empty())
        .next_back()
        .unwrap_or("book")
        .to_string()
}

pub struct BookState {
    pub root: Option<PathBuf>,
    watcher: Option<BookWatcher>,
}

impl Default for BookState {
    fn default() -> Self {
        Self {
            root: None,
            watcher: None,
        }
    }
}

#[derive(Serialize)]
pub struct BookHandle {
    pub id: String,
    pub path: String,
    pub title: String,
}

fn recents_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".inscriva")
        .join("recents.json")
}

#[tauri::command]
pub fn open_book(
    path: String,
    app: AppHandle,
    state: State<Mutex<BookState>>,
) -> Result<BookHandle, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }
    ensure_notes_file(&root)?;
    let title = read_title(&root);
    let watcher = BookWatcher::start(app.clone(), root.clone())?;
    {
        let mut guard = state.lock().map_err(|e| e.to_string())?;
        guard.root = Some(root);
        guard.watcher = Some(watcher);
    }
    add_recent(path.clone())?;
    Ok(BookHandle {
        id: path.clone(),
        path,
        title,
    })
}

#[tauri::command]
pub fn list_files(state: State<Mutex<BookState>>) -> Result<Vec<String>, String> {
    let root = require_root(&state)?;
    let mut files = Vec::new();
    collect_files(&root, &root, &mut files)?;
    files.sort();
    Ok(files)
}

#[tauri::command]
pub fn read_file(path: String, state: State<Mutex<BookState>>) -> Result<String, String> {
    let full = safe_join(require_root(&state)?, &path)?;
    fs::read_to_string(full).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(
    path: String,
    content: String,
    state: State<Mutex<BookState>>,
) -> Result<(), String> {
    let full = safe_join(require_root(&state)?, &path)?;
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(full, content).map_err(|e| e.to_string())
}

fn anchor_sidecar_path(file_path: &str) -> String {
    let safe = file_path.replace(['/', '\\'], "__");
    format!(".inscriva/anchors/{safe}.json")
}

#[tauri::command]
pub fn rename_file(from: String, to: String, state: State<Mutex<BookState>>) -> Result<(), String> {
    if from == to {
        return Ok(());
    }
    let root = require_root(&state)?;
    let old_full = safe_join(root.clone(), &from)?;
    let new_full = safe_join(root.clone(), &to)?;
    if new_full.exists() {
        return Err(format!("File already exists: {to}"));
    }
    fs::rename(&old_full, &new_full).map_err(|e| e.to_string())?;

    let old_sidecar = safe_join(root.clone(), &anchor_sidecar_path(&from))?;
    let new_sidecar = safe_join(root.clone(), &anchor_sidecar_path(&to))?;
    if old_sidecar.exists() {
        let raw = fs::read_to_string(&old_sidecar).map_err(|e| e.to_string())?;
        let mut data: serde_json::Value =
            serde_json::from_str(&raw).map_err(|e| e.to_string())?;
        if let Some(obj) = data.as_object_mut() {
            obj.insert("file".to_string(), serde_json::Value::String(to.clone()));
        }
        if let Some(parent) = new_sidecar.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(
            &new_sidecar,
            serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        let _ = fs::remove_file(old_sidecar);
    }
    Ok(())
}

#[derive(serde::Deserialize)]
pub struct NewBookOptions {
    pub title: String,
    pub path: String,
    #[serde(default = "default_true")]
    pub init_git: bool,
}

fn default_true() -> bool {
    true
}

#[tauri::command]
pub fn create_book(
    options: NewBookOptions,
    app: AppHandle,
    state: State<Mutex<BookState>>,
) -> Result<BookHandle, String> {
    let root = PathBuf::from(&options.path);
    create_layout(&root, &options.title)?;
    if options.init_git {
        git2::Repository::init(&root).map_err(|e| e.to_string())?;
    }
    open_book(options.path, app, state)
}

#[tauri::command]
pub fn get_recents() -> Result<Vec<String>, String> {
    let path = recents_path();
    if !path.exists() {
        return Ok(vec![]);
    }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_recent(path: String) -> Result<(), String> {
    let mut recents = get_recents().unwrap_or_default();
    recents.retain(|p| p != &path);
    recents.insert(0, path);
    let file = recents_path();
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(
        file,
        serde_json::to_string_pretty(&recents).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

fn require_root(state: &State<Mutex<BookState>>) -> Result<PathBuf, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .root
        .clone()
        .ok_or_else(|| "No book open".to_string())
}

fn safe_join(root: PathBuf, rel: &str) -> Result<PathBuf, String> {
    let full = root.join(rel);
    if !full.starts_with(&root) {
        return Err("Path escapes book root".into());
    }
    Ok(full)
}

fn collect_files(dir: &Path, root: &Path, out: &mut Vec<String>) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
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
                .replace('\\', "/");
            out.push(rel);
        }
    }
    Ok(())
}

fn read_title(root: &Path) -> String {
    let config = root.join(".inscriva/config.json");
    if let Ok(raw) = fs::read_to_string(config) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(t) = v.get("bookTitle").and_then(|t| t.as_str()) {
                return t.to_string();
            }
        }
    }
    root.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Book")
        .to_string()
}

fn ensure_notes_file(root: &Path) -> Result<(), String> {
    let notes = root.join(".inscriva/notes/notes.jsonl");
    if notes.exists() {
        return Ok(());
    }
    if let Some(parent) = notes.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(notes, "").map_err(|e| e.to_string())
}

fn create_layout(root: &Path, title: &str) -> Result<(), String> {
    let dirs = [
        "00 Canon",
        "01 Outlines/Chapter Outlines",
        "02 Drafts/Chapters",
        "03 Revision",
        ".inscriva/anchors",
        ".inscriva/notes",
    ];
    for d in dirs {
        fs::create_dir_all(root.join(d)).map_err(|e| e.to_string())?;
    }
    fs::write(
        root.join(format!("{title}.md")),
        format!("# {title}\n\nBook hub.\n"),
    )
    .map_err(|e| e.to_string())?;
    fs::write(
        root.join(".inscriva/notes/notes.jsonl"),
        "",
    )
    .map_err(|e| e.to_string())?;
    fs::write(
        root.join(".inscriva/config.json"),
        serde_json::json!({
            "bookTitle": title,
            "branch": "main",
            "autosaveIdleSeconds": 30
        })
        .to_string(),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
