// use tauri::Manager;
mod ocr;

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
fn set_window_effect(
    window: tauri::Window,
    effect: &str,
    _dark: Option<bool>,
) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // Clear all effects to ensure clean state
        let _ = clear_blur(&window);
        let _ = clear_mica(&window);
        let _ = clear_acrylic(&window);

        match effect {
            "mica" => {
                apply_mica(&window, Some(_dark.unwrap_or(false))).map_err(|error| {
                    format!("Mica is not supported on this Windows version: {error}")
                })?;
                Ok("mica".to_string())
            }
            "acrylic" => {
                apply_acrylic(&window, None).map_err(|error| {
                    format!("Acrylic is not supported on this Windows version: {error}")
                })?;
                Ok("acrylic".to_string())
            }
            "blur" => {
                apply_blur(&window, None).map_err(|error| {
                    format!("Blur is not supported on this Windows version: {error}")
                })?;
                Ok("blur".to_string())
            }
            "none" => Ok("none".to_string()),
            other => Err(format!("{other} is not supported on Windows")),
        }
    }
    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

        let material = match effect {
            "vibrancy" => Some(NSVisualEffectMaterial::HudWindow),
            "sidebar" => Some(NSVisualEffectMaterial::Sidebar),
            "none" => None,
            _ => None,
        };

        if let Some(mat) = material {
            apply_vibrancy(&window, mat, None, None)
                .map_err(|error| format!("Vibrancy is not supported: {error}"))?;
            Ok(effect.to_string())
        } else if effect == "none" {
            Ok("none".to_string())
        } else {
            Err(format!("{effect} is not supported on macOS"))
        }
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = window;
        if effect == "none" {
            Ok("none".to_string())
        } else {
            Err(format!("{effect} is not supported on this platform"))
        }
    }
}

#[tauri::command]
fn is_portable() -> bool {
    #[cfg(not(debug_assertions))]
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            return exe_dir.join(".portable").exists();
        }
    }
    false
}

fn launch_fiin_path_from_args<I>(args: I) -> Option<String>
where
    I: IntoIterator<Item = String>,
{
    args.into_iter().skip(1).find(|arg| {
        std::path::Path::new(arg)
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("fiin"))
            .unwrap_or(false)
    })
}

fn oauth_callback_from_args<I>(args: I) -> Option<String>
where
    I: IntoIterator<Item = String>,
{
    fiip_deep_link_from_args(args).filter(|arg| {
        url::Url::parse(arg)
            .map(|url| url.host_str() == Some("login-callback"))
            .unwrap_or(false)
    })
}

fn fiip_deep_link_from_args<I>(args: I) -> Option<String>
where
    I: IntoIterator<Item = String>,
{
    args.into_iter().skip(1).find(|arg| {
        url::Url::parse(arg)
            .map(|url| {
                let allowed_host =
                    matches!(url.host_str(), Some("login-callback" | "clip" | "license"));
                url.scheme() == "fiip"
                    && allowed_host
                    && (url.path().is_empty() || url.path() == "/")
                    && url.username().is_empty()
                    && url.password().is_none()
                    && url.port().is_none()
            })
            .unwrap_or(false)
    })
}

#[tauri::command]
fn read_launch_fiin_file() -> Result<Option<(String, String)>, String> {
    let Some(path) = launch_fiin_path_from_args(std::env::args()) else {
        return Ok(None);
    };

    let content = std::fs::read_to_string(&path)
        .map_err(|error| format!("Impossible de lire le fichier .fiin : {error}"))?;
    Ok(Some((path, content)))
}

#[tauri::command]
fn read_launch_deep_link() -> Result<Option<String>, String> {
    Ok(fiip_deep_link_from_args(std::env::args()))
}

#[tauri::command]
fn scan_image_to_text(image_path: String) -> Result<ocr::OcrResult, String> {
    ocr::scan_image_to_text(&image_path)
}

#[tauri::command]
fn get_hwid() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let output = Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-Command",
                "(Get-WmiObject -Class Win32_ComputerSystemProduct).UUID",
            ])
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

#[tauri::command]
fn register_deep_link() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // Don't register the deep link in debug mode to prevent launching the debug terminal
        #[cfg(debug_assertions)]
        {
            println!("Skipping deep link registration in debug mode.");
            return Ok(());
        }

        #[cfg(not(debug_assertions))]
        {
            use std::os::windows::process::CommandExt;
            use std::process::Command;

            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
            let exe_path = exe.to_str().ok_or("Invalid path")?;

            // 1. Create Key HKCU\Software\Classes\fiip
            let _ = Command::new("reg")
                .args(&[
                    "add",
                    "HKCU\\Software\\Classes\\fiip",
                    "/ve",
                    "/d",
                    "URL:Fiip Protocol",
                    "/f",
                ])
                .creation_flags(0x08000000)
                .output();

            // 2. Add 'URL Protocol' value
            let _ = Command::new("reg")
                .args(&[
                    "add",
                    "HKCU\\Software\\Classes\\fiip",
                    "/v",
                    "URL Protocol",
                    "/d",
                    "",
                    "/f",
                ])
                .creation_flags(0x08000000)
                .output();

            // 3. Create command key
            let cmd_val = format!("\"{}\" \"%1\"", exe_path);
            let _ = Command::new("reg")
                .args(&[
                    "add",
                    "HKCU\\Software\\Classes\\fiip\\shell\\open\\command",
                    "/ve",
                    "/d",
                    &cmd_val,
                    "/f",
                ])
                .creation_flags(0x08000000)
                .output();

            return Ok(());
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            use tauri::{Emitter, Manager};
            let window = app.get_webview_window("main").expect("no main window");
            if let Some(path) = launch_fiin_path_from_args(args.clone()) {
                let _ = window.emit("fiip://open-fiin", path);
            } else if let Some(url) = fiip_deep_link_from_args(args) {
                let _ = window.emit("fiip://deep-link", url.clone());
                if oauth_callback_from_args([String::from("fiip.exe"), url.clone()]).is_some() {
                    let _ = window.emit("fiip://oauth-callback", url);
                }
            }
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }))
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
        .invoke_handler(tauri::generate_handler![
            greet,
            set_window_effect,
            is_portable,
            read_launch_fiin_file,
            read_launch_deep_link,
            scan_image_to_text,
            get_hwid,
            register_deep_link
        ])
        .setup(|_app| {
            println!("App setup starting...");

            // Check for .portable file (Skip in Dev/Debug mode)
            #[cfg(not(debug_assertions))]
            if let Ok(current_exe) = std::env::current_exe() {
                if let Some(exe_dir) = current_exe.parent() {
                    let portable_marker = exe_dir.join(".portable");
                    if portable_marker.exists() {
                        let data_dir = exe_dir.join("data");
                        println!("Portable mode detected. Data dir: {:?}", data_dir);
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{fiip_deep_link_from_args, oauth_callback_from_args};

    #[test]
    fn extracts_only_strict_oauth_callback_from_second_instance_args() {
        assert_eq!(
            oauth_callback_from_args(
                ["fiip.exe", "fiip://login-callback?code=abc"].map(String::from)
            ),
            Some("fiip://login-callback?code=abc".into())
        );
        assert_eq!(
            oauth_callback_from_args(
                ["fiip.exe", "https://evil.test/login-callback?code=abc"].map(String::from)
            ),
            None
        );
        assert_eq!(
            oauth_callback_from_args(
                ["fiip.exe", "fiip://user@login-callback?code=abc"].map(String::from)
            ),
            None
        );
        assert_eq!(
            oauth_callback_from_args(
                ["fiip.exe", "fiip://:secret@login-callback?code=abc"].map(String::from)
            ),
            None
        );
        assert_eq!(
            oauth_callback_from_args(
                ["fiip.exe", "fiip://login-callback:42?code=abc"].map(String::from)
            ),
            None
        );
    }

    #[test]
    fn extracts_safe_fiip_deep_links_from_second_instance_args() {
        assert_eq!(
            fiip_deep_link_from_args(["fiip.exe", "fiip://clip?payload=%7B%7D"].map(String::from)),
            Some("fiip://clip?payload=%7B%7D".into())
        );
        assert_eq!(
            fiip_deep_link_from_args(["fiip.exe", "fiip://license?key=abc"].map(String::from)),
            Some("fiip://license?key=abc".into())
        );
        assert_eq!(
            fiip_deep_link_from_args(
                ["fiip.exe", "https://evil.test/clip?payload=%7B%7D"].map(String::from)
            ),
            None
        );
        assert_eq!(
            fiip_deep_link_from_args(
                ["fiip.exe", "fiip://user@clip?payload=%7B%7D"].map(String::from)
            ),
            None
        );
        assert_eq!(
            fiip_deep_link_from_args(
                ["fiip.exe", "fiip://clip:42?payload=%7B%7D"].map(String::from)
            ),
            None
        );
        assert_eq!(
            fiip_deep_link_from_args(
                ["fiip.exe", "fiip://unknown?payload=%7B%7D"].map(String::from)
            ),
            None
        );
    }
}
