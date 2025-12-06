use window_vibrancy::{
    apply_acrylic, apply_blur, apply_mica, clear_acrylic, clear_blur, clear_mica,
};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn set_window_effect(window: tauri::Window, effect: &str) {
    #[cfg(target_os = "windows")]
    {
        // Clear all effects to ensure clean state
        let _ = clear_blur(&window);
        let _ = clear_mica(&window);
        let _ = clear_acrylic(&window);

        match effect {
            "mica" => {
                let _ = apply_mica(&window, None);
            }
            "acrylic" => {
                let _ = apply_acrylic(&window, Some((0, 0, 0, 10)));
            }
            "blur" => {
                let _ = apply_blur(&window, Some((0, 0, 0, 10)));
            }
            _ => {} // "none" or default
        }
    }
    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
        if effect == "mica" || effect == "acrylic" {
            let _ = apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, set_window_effect])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
