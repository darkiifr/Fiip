import Foundation
import ImageIO
import Vision

@_cdecl("fiip_vision_ocr_image")
public func fiipVisionOcrImage(_ pathPointer: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar>? {
    let path = String(cString: pathPointer)
    let url = URL(fileURLWithPath: path)
    guard let cgImage = CGImageSourceCreateWithURL(url as CFURL, nil).flatMap({ CGImageSourceCreateImageAtIndex($0, 0, nil) }) else {
        return strdup("")
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["fr-FR", "en-US"]

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do {
        try handler.perform([request])
        let text = request.results?
            .compactMap { $0.topCandidates(1).first?.string }
            .joined(separator: "\n") ?? ""
        return strdup(text)
    } catch {
        return strdup("")
    }
}
