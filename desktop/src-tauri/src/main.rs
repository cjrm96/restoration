// Car Guy Simulator desktop shell. It opens one window and loads the game
// from desktop/web/ exactly as the browser build runs it, plus save files.
//
// Saves: the game keeps localStorage as its working copy and mirrors every
// save write here (see saveStore in Car_Guy_Sim.html). Each key becomes one
// file in <app data>/saves/, e.g. on Windows
// %APPDATA%\com.winnxt.carguysim\saves\classic_restoration_save_v5.json.
// That folder is what Steam Cloud syncs. At launch the files are handed to
// the page as window.__DESKTOP_SAVES before any game code runs.

// No console window behind the game on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::BTreeMap;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

static QUITTING: AtomicBool = AtomicBool::new(false);

fn saves_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("saves");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

// Keys come from the page, so only plain names are allowed: no paths.
fn key_file(app: &AppHandle, key: &str) -> Result<PathBuf, String> {
    let ok = !key.is_empty()
        && key.len() <= 64
        && key.chars().all(|c| c.is_ascii_alphanumeric() || c == '_');
    if !ok {
        return Err(format!("bad save key: {key}"));
    }
    Ok(saves_dir(app)?.join(format!("{key}.json")))
}

fn read_saves(app: &AppHandle) -> BTreeMap<String, String> {
    let mut saves = BTreeMap::new();
    let Ok(dir) = saves_dir(app) else { return saves };
    let Ok(entries) = fs::read_dir(dir) else { return saves };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let Some(key) = path.file_stem().and_then(|s| s.to_str()) else { continue };
        if let Ok(data) = fs::read_to_string(&path) {
            saves.insert(key.to_string(), data);
        }
    }
    saves
}

// Async, so disk writes never stall the window. Order is kept by the page,
// which waits for each save command to finish before sending the next.
#[tauri::command]
async fn save_write(app: AppHandle, key: String, data: String) -> Result<(), String> {
    let path = key_file(&app, &key)?;
    // Write a temp file, flush it to disk, then swap it in, so a crash or
    // power cut mid-write leaves the old save whole.
    let tmp = path.with_extension("json.tmp");
    let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
    f.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    f.sync_all().map_err(|e| e.to_string())?;
    drop(f);
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_remove(app: AppHandle, key: String) -> Result<(), String> {
    let path = key_file(&app, &key)?;
    match fs::remove_file(path) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
        _ => Ok(()),
    }
}

#[tauri::command]
fn app_quit(app: AppHandle) {
    app.exit(0);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_write, save_remove, app_quit])
        .setup(|app| {
            let saves = serde_json::to_string(&read_saves(app.handle()))?;
            // Tells the page's first load of this launch apart from reloads.
            let launch = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or_default();
            let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Car Guy Simulator")
                .inner_size(1280.0, 800.0)
                .min_inner_size(1024.0, 640.0)
                .center()
                .initialization_script(&format!(
                    "window.__DESKTOP_SAVES = {saves}; window.__DESKTOP_LAUNCH = \"{launch}\";"
                ))
                .build()?;
            window.on_window_event({
                let window = window.clone();
                move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        if QUITTING.swap(true, Ordering::SeqCst) {
                            return; // second close: let it go
                        }
                        // The game saves one last time (__desktopBeforeQuit
                        // waits for the file write), then the page calls
                        // app_quit. If the page is stuck, quit anyway after
                        // two seconds.
                        api.prevent_close();
                        let _ = window.eval(
                            "Promise.resolve(window.__desktopBeforeQuit && window.__desktopBeforeQuit()) \
                             .finally(() => window.__TAURI__.core.invoke('app_quit'));",
                        );
                        let app = window.app_handle().clone();
                        std::thread::spawn(move || {
                            std::thread::sleep(Duration::from_secs(2));
                            app.exit(0);
                        });
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Car Guy Simulator");
}
