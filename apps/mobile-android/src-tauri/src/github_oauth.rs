use crate::book::{self, BookHandle, BookState};
use git2::build::RepoBuilder;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitOAuthStart {
    pub url: Option<String>,
    pub configured: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRemoteRepo {
    pub provider: String,
    pub id: u64,
    pub full_name: String,
    pub name: String,
    pub clone_url: String,
    pub private: bool,
    pub updated_at: String,
    pub description: Option<String>,
}

#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredToken {
    access_token: String,
    username: String,
    created_at: String,
}

#[derive(serde::Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

#[derive(serde::Deserialize)]
struct GithubUser {
    login: String,
}

#[derive(serde::Deserialize)]
struct GithubApiRepo {
    id: u64,
    name: String,
    full_name: String,
    private: bool,
    clone_url: String,
    updated_at: String,
    description: Option<String>,
}

fn pending_states() -> &'static Mutex<HashMap<String, u64>> {
    static PENDING: OnceLock<Mutex<HashMap<String, u64>>> = OnceLock::new();
    PENDING.get_or_init(|| Mutex::new(HashMap::new()))
}

fn token_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".inscriva")
        .join("oauth")
        .join("github.json")
}

fn oauth_port() -> u16 {
    std::env::var("INSCRIVA_OAUTH_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3848)
}

fn redirect_uri(port: u16) -> String {
    std::env::var("GITHUB_OAUTH_REDIRECT").unwrap_or_else(|_| {
        format!("http://127.0.0.1:{port}/git/oauth/github/callback")
    })
}

fn client_id() -> Option<String> {
    std::env::var("GITHUB_CLIENT_ID").ok().filter(|s| !s.is_empty())
}

fn client_secret() -> Option<String> {
    std::env::var("GITHUB_CLIENT_SECRET")
        .ok()
        .filter(|s| !s.is_empty())
}

pub fn github_oauth_configured() -> bool {
    client_id().is_some() && client_secret().is_some()
}

#[tauri::command]
pub fn github_oauth_start(app: AppHandle) -> Result<GitOAuthStart, String> {
    let id = match client_id() {
        Some(id) => id,
        None => {
            return Ok(GitOAuthStart {
                url: None,
                configured: false,
            })
        }
    };

    let port = oauth_port();
    let state = random_hex(16);
    {
        let mut pending = pending_states().lock().map_err(|e| e.to_string())?;
        pending.insert(state.clone(), now_secs());
    }

    let redirect = redirect_uri(port);
    let params = format!(
        "client_id={}&redirect_uri={}&scope=repo+read:user&state={}",
        urlencoding_encode(&id),
        urlencoding_encode(&redirect),
        urlencoding_encode(&state),
    );
    let url = format!("https://github.com/login/oauth/authorize?{params}");

    std::thread::spawn(move || {
        if let Err(err) = run_callback_server(app, port) {
            eprintln!("GitHub OAuth callback server: {err}");
        }
    });

    Ok(GitOAuthStart {
        url: Some(url),
        configured: true,
    })
}

#[tauri::command]
pub fn github_oauth_status() -> Result<serde_json::Value, String> {
    if !github_oauth_configured() {
        return Ok(serde_json::json!({ "connected": false, "configured": false }));
    }
    match load_token()? {
        Some(token) => Ok(serde_json::json!({
            "connected": true,
            "configured": true,
            "provider": "github",
            "username": token.username,
        })),
        None => Ok(serde_json::json!({ "connected": false, "configured": true })),
    }
}

#[tauri::command]
pub fn github_oauth_disconnect() -> Result<(), String> {
    let path = token_path();
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn github_list_repos() -> Result<Vec<GitRemoteRepo>, String> {
    let token = require_token()?;
    let client = reqwest::blocking::Client::new();
    let mut repos = Vec::new();

    for page in 1..=5 {
        let url = format!(
            "https://api.github.com/user/repos?per_page=100&page={page}&sort=updated&affiliation=owner,organization_member"
        );
        let res = client
            .get(&url)
            .header("Accept", "application/vnd.github+json")
            .header("Authorization", format!("Bearer {}", token.access_token))
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "Inscriva-Desktop")
            .send()
            .map_err(|e| e.to_string())?;

        if !res.status().is_success() {
            return Err(format!("GitHub API error ({})", res.status()));
        }

        let batch: Vec<GithubApiRepo> = res.json().map_err(|e| e.to_string())?;
        if batch.is_empty() {
            break;
        }

        for repo in &batch {
            repos.push(GitRemoteRepo {
                provider: "github".to_string(),
                id: repo.id,
                full_name: repo.full_name.clone(),
                name: repo.name.clone(),
                clone_url: repo.clone_url.clone(),
                private: repo.private,
                updated_at: repo.updated_at.clone(),
                description: repo.description.clone(),
            });
        }

        if batch.len() < 100 {
            break;
        }
    }

    Ok(repos)
}

#[tauri::command]
pub fn github_clone_remote(
    full_name: String,
    parent_path: String,
    app: AppHandle,
    state: State<Mutex<BookState>>,
) -> Result<BookHandle, String> {
    let token = require_token()?;
    let parent = PathBuf::from(&parent_path);
    if !parent.is_dir() {
        return Err("Parent folder does not exist".into());
    }
    let folder_name = full_name.split('/').next_back().unwrap_or("repo");
    let target = parent.join(folder_name);
    if target.exists() {
        return Err(format!("Folder already exists: {}", target.display()));
    }

    let authed_url = format!(
        "https://x-access-token:{}@github.com/{}.git",
        token.access_token, full_name
    );

    RepoBuilder::new()
        .clone(&authed_url, &target)
        .map_err(|e| e.to_string())?;

    book::open_book(
        target.to_string_lossy().into_owned(),
        app,
        state,
    )
}

fn run_callback_server(app: AppHandle, port: u16) -> Result<(), String> {
    let listener = TcpListener::bind(("127.0.0.1", port)).map_err(|e| e.to_string())?;
    listener
        .set_nonblocking(false)
        .map_err(|e| e.to_string())?;

    for stream in listener.incoming().take(1) {
        let mut stream = stream.map_err(|e| e.to_string())?;
        let mut buf = [0u8; 8192];
        let n = stream.read(&mut buf).map_err(|e| e.to_string())?;
        let request = String::from_utf8_lossy(&buf[..n]);
        let (status, body) = handle_oauth_request(&app, &request);
        let response = format!(
            "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}",
            body.len(),
            body
        );
        stream.write_all(response.as_bytes()).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn handle_oauth_request(app: &AppHandle, request: &str) -> (&'static str, String) {
    let path = request.lines().next().unwrap_or("");
    if !path.contains("/git/oauth/github/callback") {
        return ("404 Not Found", error_html("Unknown path"));
    }

    let query = path.split('?').nth(1).unwrap_or("").split_whitespace().next().unwrap_or("");
    let params: HashMap<&str, &str> = query
        .split('&')
        .filter_map(|pair| {
            let mut parts = pair.splitn(2, '=');
            Some((parts.next()?, parts.next()?))
        })
        .collect();

    if let Some(err) = params.get("error") {
        return ("400 Bad Request", error_html(err));
    }

    let code = match params.get("code") {
        Some(c) => *c,
        None => return ("400 Bad Request", error_html("Missing code")),
    };
    let state = match params.get("state") {
        Some(s) => *s,
        None => return ("400 Bad Request", error_html("Missing state")),
    };

    match complete_oauth(app, code, state) {
        Ok(username) => (
            "200 OK",
            success_html(&username),
        ),
        Err(err) => ("400 Bad Request", error_html(&err)),
    }
}

fn complete_oauth(app: &AppHandle, code: &str, state: &str) -> Result<String, String> {
    {
        let mut pending = pending_states().lock().map_err(|e| e.to_string())?;
        if !pending.contains_key(state) {
            return Err("Invalid OAuth state — try connecting again".into());
        }
        pending.remove(state);
    }

    let id = client_id().ok_or_else(|| "GitHub OAuth not configured".to_string())?;
    let secret = client_secret().ok_or_else(|| "GitHub OAuth not configured".to_string())?;

    let client = reqwest::blocking::Client::new();
    let token_res = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .json(&serde_json::json!({
            "client_id": id,
            "client_secret": secret,
            "code": code,
        }))
        .send()
        .map_err(|e| e.to_string())?;

    if !token_res.status().is_success() {
        return Err(format!("GitHub token exchange failed ({})", token_res.status()));
    }

    let token_body: TokenResponse = token_res.json().map_err(|e| e.to_string())?;
    let access_token = token_body
        .access_token
        .ok_or_else(|| {
            token_body
                .error_description
                .or(token_body.error)
                .unwrap_or_else(|| "No access token".to_string())
        })?;

    let user_res = client
        .get("https://api.github.com/user")
        .header("Accept", "application/vnd.github+json")
        .header("Authorization", format!("Bearer {access_token}"))
        .header("X-GitHub-Api-Version", "2022-11-28")
        .header("User-Agent", "Inscriva-Desktop")
        .send()
        .map_err(|e| e.to_string())?;

    if !user_res.status().is_success() {
        return Err("Could not load GitHub profile".into());
    }

    let user: GithubUser = user_res.json().map_err(|e| e.to_string())?;
    save_token(&access_token, &user.login)?;

    let _ = app.emit(
        "github-connected",
        serde_json::json!({ "username": user.login }),
    );

    Ok(user.login)
}

/// GitHub OAuth access token for HTTPS git operations (pull/push).
pub(crate) fn github_access_token() -> Result<Option<String>, String> {
    Ok(load_token()?.map(|t| t.access_token))
}

fn load_token() -> Result<Option<StoredToken>, String> {
    let path = token_path();
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw)
        .map(Some)
        .map_err(|e| e.to_string())
}

fn require_token() -> Result<StoredToken, String> {
    load_token()?.ok_or_else(|| "Not connected to GitHub — connect first".into())
}

fn save_token(access_token: &str, username: &str) -> Result<(), String> {
    let path = token_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let payload = StoredToken {
        access_token: access_token.to_string(),
        username: username.to_string(),
        created_at: chrono_iso_now(),
    };
    fs::write(
        path,
        serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn success_html(username: &str) -> String {
    format!(
        r#"<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><title>GitHub connected</title>
<style>body{{font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f7f4ef;color:#1c1917}}
.card{{padding:2rem;background:#fff;border-radius:12px;text-align:center;max-width:360px}}</style></head>
<body><div class="card"><h1>Connected</h1><p>Signed in as <strong>{username}</strong>.</p>
<p>You can close this window and return to Inscriva.</p></div></body></html>"#
    )
}

fn error_html(message: &str) -> String {
    format!(
        r#"<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><title>Connection failed</title></head>
<body><p>GitHub connection failed: {message}</p><p>Close this window and try again in Inscriva.</p></body></html>"#
    )
}

fn urlencoding_encode(value: &str) -> String {
    value
        .bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                (b as char).to_string()
            }
            _ => format!("%{b:02X}"),
        })
        .collect()
}

fn random_hex(bytes: usize) -> String {
    let mut buf = vec![0u8; bytes];
    getrandom::fill(&mut buf).unwrap_or_else(|_| {
        let fallback = now_secs();
        for (i, slot) in buf.iter_mut().enumerate() {
            *slot = ((fallback >> (i % 8)) & 0xff) as u8;
        }
    });
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn chrono_iso_now() -> String {
    format!("{}", now_secs())
}
