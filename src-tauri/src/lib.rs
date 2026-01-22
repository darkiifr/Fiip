#[cfg(target_os = "windows")]
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
                // Try Mica first (Windows 11 only)
                if let Err(_) = apply_mica(&window, Some(true)) {
                    // Fallback to Acrylic for Windows 10 if Mica fails
                    let _ = apply_acrylic(&window, Some((18, 18, 18, 125)));
                }
            }
            "acrylic" => {
                let _ = apply_acrylic(&window, Some((18, 18, 18, 125)));
            }
            "blur" => {
                let _ = apply_blur(&window, Some((18, 18, 18, 125)));
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

#[tauri::command]
fn is_portable() -> bool {
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            return exe_dir.join(".portable").exists();
        }
    }
    false
}

#[tauri::command]
fn get_hwid() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let output = Command::new("powershell")
            .args(&["-NoProfile", "-Command", "(Get-WmiObject -Class Win32_ComputerSystemProduct).UUID"])
            .creation_flags(CREATE_NO_WINDOW) 
            .output()
            .map_err(|e| e.to_string())?;
            
        let uuid = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if uuid.is_empty() {
             return Err("Failed to get HWID".to_string());
        }
        Ok(uuid)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok("UNSUPPORTED_PLATFORM".to_string())
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
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, set_window_effect, is_portable, get_hwid])
        .setup(|app| {
            use tauri::{WebviewUrl, WebviewWindowBuilder};

            let mut builder =
                WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                    .title("fiip")
                    .inner_size(800.0, 600.0)
                    .decorations(false)
                    .transparent(true)
                    .shadow(true);

            // Check for .portable file
            if let Ok(current_exe) = std::env::current_exe() {
                if let Some(exe_dir) = current_exe.parent() {
                    let portable_marker = exe_dir.join(".portable");
                    if portable_marker.exists() {
                        let data_dir = exe_dir.join("data");
                        builder = builder.data_directory(data_dir);
                    }
                }
            }

            builder.build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
