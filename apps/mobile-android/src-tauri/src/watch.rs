use notify::event::{EventKind, ModifyKind};
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEventPayload {
    pub path: String,
    pub kind: String,
}

pub struct BookWatcher {
    _watcher: RecommendedWatcher,
}

impl BookWatcher {
    pub fn start(app: AppHandle, root: PathBuf) -> Result<Self, String> {
        let (tx, rx) = mpsc::channel();
        let mut watcher = RecommendedWatcher::new(
            move |res| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        )
        .map_err(|e| e.to_string())?;

        watcher
            .watch(&root, RecursiveMode::Recursive)
            .map_err(|e| e.to_string())?;

        let root_for_thread = root.clone();
        std::thread::spawn(move || {
            while let Ok(event) = rx.recv() {
                if let Some(payload) = map_event(&root_for_thread, &event) {
                    let _ = app.emit("book-file", payload);
                }
            }
        });

        Ok(Self { _watcher: watcher })
    }
}

fn map_event(root: &Path, event: &notify::Event) -> Option<FileEventPayload> {
    let kind = match event.kind {
        EventKind::Create(_) => "created",
        EventKind::Remove(_) => "deleted",
        EventKind::Modify(ModifyKind::Name(_)) => "modified",
        EventKind::Modify(_) => "modified",
        _ => return None,
    };

    let path = event.paths.first()?;
    if path
        .components()
        .any(|c| c.as_os_str() == ".git" || c.as_os_str() == ".inscriva")
    {
        return None;
    }

    let rel = path.strip_prefix(root).ok()?;
    let rel_str = rel.to_string_lossy().replace('\\', "/");
    if rel_str.is_empty() {
        return None;
    }

    Some(FileEventPayload {
        path: rel_str,
        kind: kind.to_string(),
    })
}
