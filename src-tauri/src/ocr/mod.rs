use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct OcrBox {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OcrWord {
    pub text: String,
    pub confidence: f32,
    pub bbox: OcrBox,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OcrResult {
    pub text: String,
    pub confidence: f32,
    pub engine: String,
    pub words: Vec<OcrWord>,
    pub source_width: f32,
    pub source_height: f32,
}

pub fn scan_image_to_text(image_path: &str) -> Result<OcrResult, String> {
    if image_path.trim().is_empty() {
        return Err("Aucun chemin d'image fourni pour l'OCR.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        return windows::scan_image_to_text(image_path);
    }

    #[cfg(target_os = "macos")]
    {
        return macos::scan_image_to_text(image_path);
    }

    #[cfg(target_os = "linux")]
    {
        return linux::scan_image_to_text(image_path);
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        let _ = image_path;
        Err("OCR natif indisponible sur cette plateforme.".to_string())
    }
}

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "linux")]
mod linux;
