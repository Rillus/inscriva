mod book;
mod git_ops;
mod github_oauth;
mod keys;
mod llm;
mod watch;

use book::BookState;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter};

fn load_env_files() {
    let _ = dotenvy::dotenv();
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let dev_bridge_env = manifest.join("../../dev-bridge/.env");
    if dev_bridge_env.exists() {
        let _ = dotenvy::from_path(dev_bridge_env);
    }
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let open_book =
        MenuItem::with_id(app, "open_book", "Open Book…", true, Some("CmdOrCtrl+O"))?;
    let new_book = MenuItem::with_id(app, "new_book", "New Book…", true, Some("CmdOrCtrl+N"))?;
    let pull = MenuItem::with_id(app, "pull", "Pull from Remote", true, Some("CmdOrCtrl+Shift+P"))?;
    let close_book =
        MenuItem::with_id(app, "close_book", "Close Book", true, Some("CmdOrCtrl+W"))?;
    let separator = PredefinedMenuItem::separator(app)?;

    let undo = PredefinedMenuItem::undo(app, None)?;
    let redo = PredefinedMenuItem::redo(app, None)?;
    let cut = PredefinedMenuItem::cut(app, None)?;
    let copy = PredefinedMenuItem::copy(app, None)?;
    let paste = PredefinedMenuItem::paste(app, None)?;
    let select_all = PredefinedMenuItem::select_all(app, None)?;
    let edit_separator = PredefinedMenuItem::separator(app)?;

    let mode_draft = MenuItem::with_id(app, "mode_draft", "Draft Mode", true, Some("CmdOrCtrl+1"))?;
    let mode_revise =
        MenuItem::with_id(app, "mode_revise", "Revise Mode", true, Some("CmdOrCtrl+2"))?;
    let mode_read = MenuItem::with_id(app, "mode_read", "Read Mode", true, Some("CmdOrCtrl+3"))?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &open_book,
            &new_book,
            &separator,
            &pull,
            &separator,
            &close_book,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &undo,
            &redo,
            &edit_separator,
            &cut,
            &copy,
            &paste,
            &edit_separator,
            &select_all,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[&mode_draft, &mode_revise, &mode_read],
    )?;

    Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    load_env_files();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(BookState::default()))
        .setup(|app| {
            let menu = build_menu(app.handle())?;
            app.set_menu(menu)?;

            let handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                let _ = handle.emit("menu-action", event.id().as_ref());
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            book::open_book,
            book::list_files,
            book::read_file,
            book::write_file,
            book::rename_file,
            book::create_book,
            book::get_recents,
            book::add_recent,
            git_ops::git_clone,
            git_ops::git_inspect,
            git_ops::git_pull,
            git_ops::git_autosave,
            git_ops::git_status,
            github_oauth::github_oauth_start,
            github_oauth::github_oauth_status,
            github_oauth::github_oauth_disconnect,
            github_oauth::github_list_repos,
            github_oauth::github_clone_remote,
            keys::set_api_key,
            keys::clear_api_key,
            keys::list_providers,
            llm::llm_preview,
            llm::llm_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Inscriva");
}
