use std::process::Command;

use super::OcrResult;

pub fn scan_image_to_text(image_path: &str) -> Result<OcrResult, String> {
    let output = Command::new("tesseract")
        .args([image_path, "stdout", "-l", "fra+eng"])
        .output()
        .map_err(|_| "Tesseract OCR n'est pas installé. Installez le paquet tesseract-ocr via votre gestionnaire de paquets.".to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "Tesseract n'a pas pu lire cette image.".to_string()
        } else {
            stderr
        });
    }

    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(OcrResult {
        confidence: if text.is_empty() { 0.0 } else { 82.0 },
        text,
        engine: "tesseract".to_string(),
        words: Vec::new(),
        source_width: 0.0,
        source_height: 0.0,
    })
}
