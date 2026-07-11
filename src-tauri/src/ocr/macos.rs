use super::OcrResult;

extern "C" {
    fn fiip_vision_ocr_image(path: *const std::os::raw::c_char) -> *mut std::os::raw::c_char;
}

pub fn scan_image_to_text(image_path: &str) -> Result<OcrResult, String> {
    let _ = image_path;
    Err("Le module macOS Vision OCR doit être lié au build Tauri macOS avant utilisation.".to_string())
}
