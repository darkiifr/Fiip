use std::process::Command;

use super::OcrResult;

pub fn scan_image_to_text(image_path: &str) -> Result<OcrResult, String> {
    let script = r#"
$ErrorActionPreference = 'Stop'
$path = $args[0]
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 } | Select-Object -First 1)
function Await($operation) { $asTask.Invoke($null, @($operation)).GetAwaiter().GetResult() }
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($path))
$stream = Await ($file.OpenReadAsync())
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream))
$bitmap = Await ($decoder.GetSoftwareBitmapAsync())
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) { throw 'Aucun pack de langue OCR Windows compatible. Installez le pack OCR de la langue souhaitée dans les paramètres Windows.' }
$result = Await ($engine.RecognizeAsync($bitmap))
$words = @()
$confidences = @()
foreach ($line in $result.Lines) {
  foreach ($word in $line.Words) {
    $rect = $word.BoundingRect
    $words += [PSCustomObject]@{
      text = $word.Text
      confidence = 92
      bbox = [PSCustomObject]@{
        x = [double]$rect.X
        y = [double]$rect.Y
        width = [double]$rect.Width
        height = [double]$rect.Height
      }
    }
    $confidences += 92
  }
}
[PSCustomObject]@{
  text = $result.Text
  confidence = if ($result.Text) { 92 } else { 0 }
  engine = 'windows-media-ocr'
  words = $words
  source_width = [double]$bitmap.PixelWidth
  source_height = [double]$bitmap.PixelHeight
} | ConvertTo-Json -Depth 8 -Compress
"#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script, image_path])
        .output()
        .map_err(|error| format!("Impossible de lancer l'OCR Windows: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "OCR Windows indisponible. Vérifiez que le pack de langue OCR est installé.".to_string()
        } else {
            stderr
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    serde_json::from_str::<OcrResult>(&stdout)
        .map_err(|error| format!("Impossible de lire le résultat OCR Windows: {error}"))
}
