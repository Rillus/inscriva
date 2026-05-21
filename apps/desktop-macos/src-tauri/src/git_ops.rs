use git2::build::RepoBuilder;
use git2::{Repository, StatusOptions};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use tauri::{AppHandle, State};

use crate::book::{self, BookHandle, BookState};

#[derive(Serialize)]
pub struct GitStatus {
    pub ahead: i32,
    pub behind: i32,
    pub dirty: bool,
}

#[derive(Serialize)]
pub struct PullResult {
    pub pulled: bool,
    pub skipped: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRemoteInfo {
    pub name: String,
    pub url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRepoInfo {
    pub path: String,
    #[serde(rename = "isRepo")]
    pub is_repo: bool,
    pub branch: Option<String>,
    pub remotes: Vec<GitRemoteInfo>,
    pub dirty: Option<bool>,
    pub ahead: Option<i32>,
    pub behind: Option<i32>,
}

#[tauri::command]
pub fn git_inspect(path: String) -> Result<GitRepoInfo, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err("Path is not a directory".into());
    }

    let repo = match Repository::open(&root) {
        Ok(r) => r,
        Err(_) => {
            return Ok(GitRepoInfo {
                path: path.clone(),
                is_repo: false,
                branch: None,
                remotes: vec![],
                dirty: None,
                ahead: None,
                behind: None,
            })
        }
    };

    let branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(str::to_string));

    let mut remotes = Vec::new();
    if let Ok(names) = repo.remotes() {
        for name in names.iter().flatten() {
            if let Ok(remote) = repo.find_remote(name) {
                if let Some(url) = remote.url() {
                    remotes.push(GitRemoteInfo {
                        name: name.to_string(),
                        url: url.to_string(),
                    });
                }
            }
        }
    }

    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    let dirty = repo
        .statuses(Some(&mut opts))
        .map(|s| !s.is_empty())
        .ok();

    let (ahead, behind) = upstream_ahead_behind(&repo).unwrap_or((0, 0));

    Ok(GitRepoInfo {
        path,
        is_repo: true,
        branch,
        remotes,
        dirty,
        ahead: Some(ahead),
        behind: Some(behind),
    })
}

#[tauri::command]
pub fn git_clone(
    url: String,
    parent_path: String,
    app: AppHandle,
    state: State<Mutex<BookState>>,
) -> Result<BookHandle, String> {
    let parent = PathBuf::from(&parent_path);
    if !parent.is_dir() {
        return Err("Parent folder does not exist".into());
    }
    let name = book::repo_name_from_url(&url);
    let target = parent.join(&name);
    if target.exists() {
        return Err(format!("Folder already exists: {}", target.display()));
    }

    RepoBuilder::new()
        .clone(&url, &target)
        .map_err(|e| e.to_string())?;

    book::open_book(target.to_string_lossy().into_owned(), app, state)
}

#[tauri::command]
pub fn git_pull(state: State<Mutex<BookState>>) -> Result<PullResult, String> {
    let root = require_root(&state)?;
    git_pull_at(&root)
}

/// Pull via the system `git` CLI so macOS credential helpers, SSH, and GitHub OAuth work.
pub fn git_pull_at(root: &Path) -> Result<PullResult, String> {
    if !root.join(".git").exists() {
        return Ok(PullResult {
            pulled: false,
            skipped: Some("not a git repository".into()),
        });
    }

    let remotes = git_output(root, &["remote"]).unwrap_or_default();
    if remotes.lines().all(|line| line.trim().is_empty()) {
        return Ok(PullResult {
            pulled: false,
            skipped: Some("no remote configured".into()),
        });
    }

    let branch = resolve_branch_git(root)?;

    let mut cmd = Command::new("git");
    cmd.arg("-C").arg(root);
    apply_git_credentials(&mut cmd, root)?;
    cmd.args(["pull", "--rebase", "origin", &branch]);

    let output = cmd.output().map_err(|e| {
        format!(
            "Could not run git: {e}. Install Xcode Command Line Tools or Git for macOS."
        )
    })?;

    if output.status.success() {
        return Ok(PullResult {
            pulled: true,
            skipped: None,
        });
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let detail = if !stderr.trim().is_empty() {
        stderr.trim().to_string()
    } else {
        stdout.trim().to_string()
    };

    Err(if detail.is_empty() {
        "Pull failed — check remote access and credentials.".into()
    } else {
        detail
    })
}

fn git_output(root: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(args)
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn resolve_branch_git(root: &Path) -> Result<String, String> {
    if let Ok(branch) = git_output(root, &["rev-parse", "--abbrev-ref", "HEAD"]) {
        if !branch.is_empty() && branch != "HEAD" {
            return Ok(branch);
        }
    }

    if let Ok(refname) = git_output(root, &["symbolic-ref", "refs/remotes/origin/HEAD"]) {
        if let Some(branch) = refname.strip_prefix("refs/remotes/origin/") {
            return Ok(branch.to_string());
        }
    }

    Ok("main".to_string())
}

/// Prefer system credential helpers; inject GitHub OAuth token for github.com HTTPS remotes.
fn apply_git_credentials(cmd: &mut Command, root: &Path) -> Result<(), String> {
    let origin = match git_output(root, &["remote", "get-url", "origin"]) {
        Ok(url) => url,
        Err(_) => return Ok(()),
    };

    if origin.contains('@') {
        return Ok(());
    }

    if origin.contains("github.com") {
        if let Ok(Some(token)) = crate::github_oauth::github_access_token() {
            let helper = github_credential_helper(&token);
            cmd.arg("-c").arg(format!("credential.helper={helper}"));
        }
    }

    Ok(())
}

fn github_credential_helper(token: &str) -> String {
    let escaped = token.replace('\'', "'\"'\"'");
    format!("!f() {{ echo \"username=x-access-token\"; echo \"password='{escaped}'\"; }}; f")
}

#[tauri::command]
pub fn git_autosave(message: Option<String>, state: State<Mutex<BookState>>) -> Result<(), String> {
    let root = require_root(&state)?;
    let repo = Repository::open(&root).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    let sig = repo.signature().map_err(|e| e.to_string())?;
    let head = repo.head().ok();
    let parents: Vec<git2::Commit> = if let Some(h) = head {
        vec![h.peel_to_commit().map_err(|e| e.to_string())?]
    } else {
        vec![]
    };
    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
    let msg = message.unwrap_or_else(|| format!("Inscriva autosave {}", chrono_now()));
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &msg,
        &tree,
        &parent_refs,
    )
    .map_err(|e| e.to_string())?;

    let branch = resolve_branch(&repo)?;
    let mut push_cmd = Command::new("git");
    push_cmd
        .arg("-C")
        .arg(&root)
        .arg("push")
        .arg("origin")
        .arg(&branch);
    let _ = apply_git_credentials(&mut push_cmd, &root);
    let _ = push_cmd.output();

    Ok(())
}

#[tauri::command]
pub fn git_status(state: State<Mutex<BookState>>) -> Result<GitStatus, String> {
    let root = match require_root(&state) {
        Ok(r) => r,
        Err(_) => {
            return Ok(GitStatus {
                ahead: 0,
                behind: 0,
                dirty: false,
            })
        }
    };
    let repo = Repository::open(&root).map_err(|e| e.to_string())?;
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;
    let (ahead, behind) = upstream_ahead_behind(&repo).unwrap_or((0, 0));
    Ok(GitStatus {
        ahead,
        behind,
        dirty: !statuses.is_empty(),
    })
}

fn require_root(state: &State<Mutex<BookState>>) -> Result<PathBuf, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .root
        .clone()
        .ok_or_else(|| "No book open".to_string())
}

fn resolve_branch(repo: &Repository) -> Result<String, String> {
    if let Ok(head) = repo.head() {
        if let Some(name) = head.shorthand() {
            if name != "HEAD" {
                return Ok(name.to_string());
            }
        }
    }
    Ok("main".to_string())
}

fn upstream_ahead_behind(repo: &Repository) -> Result<(i32, i32), String> {
    let head = repo.head().map_err(|e| e.to_string())?;
    let local = head.peel_to_commit().map_err(|e| e.to_string())?.id();
    let branch = resolve_branch(repo)?;
    let upstream_name = format!("refs/remotes/origin/{branch}");
    let upstream_ref = match repo.find_reference(&upstream_name) {
        Ok(r) => r,
        Err(_) => return Ok((0, 0)),
    };
    let upstream = upstream_ref
        .peel_to_commit()
        .map_err(|e| e.to_string())?
        .id();
    let (ahead, behind) = repo
        .graph_ahead_behind(local, upstream)
        .map_err(|e| e.to_string())?;
    Ok((ahead as i32, behind as i32))
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let d = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", d.as_secs())
}
