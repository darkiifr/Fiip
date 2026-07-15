use std::ffi::{CStr, CString};
use std::os::raw::c_char;

use super::OcrResult;

extern "C" {
    fn fiip_vision_ocr_image(path: *const c_char) -> *mut c_char;
}

pub fn scan_image_to_text(image_path: &str) -> Result<OcrResult, String> {
    let path = CString::new(image_path).map_err(|_| {
        "Le chemin de l'image contient un caractere invalide pour macOS Vision.".to_string()
    })?;

    let raw = unsafe { fiip_vision_ocr_image(path.as_ptr()) };
    if raw.is_null() {
        return Err("OCR macOS Vision indisponible.".to_string());
    }

    let json = unsafe { CStr::from_ptr(raw).to_string_lossy().to_string() };
    unsafe {
        let _ = CString::from_raw(raw);
    }

    if json.trim().is_empty() {
        return Err("OCR macOS Vision n'a renvoye aucun resultat.".to_string());
    }

    serde_json::from_str::<OcrResult>(&json)
        .map_err(|error| format!("Impossible de lire le resultat OCR macOS Vision: {error}"))
}
