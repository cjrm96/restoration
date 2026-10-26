// Car Guy Simulator desktop shell. It opens one window and loads the game
// from desktop/web/ exactly as the browser build runs it.

// No console window behind the game on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Car Guy Simulator");
}
