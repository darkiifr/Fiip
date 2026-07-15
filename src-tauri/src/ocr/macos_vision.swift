import Foundation
import ImageIO
import Vision

private func makePayload(text: String, confidence: Double, width: Double, height: Double, words: [[String: Any]]) -> String {
    let payload: [String: Any] = [
        "text": text,
        "confidence": confidence,
        "engine": "macos-vision",
        "words": words,
        "source_width": width,
        "source_height": height
    ]
    guard
        let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
        let json = String(data: data, encoding: .utf8)
    else {
        return #"{"text":"","confidence":0,"engine":"macos-vision","words":[],"source_width":0,"source_height":0}"#
    }
    return json
}

@_cdecl("fiip_vision_ocr_image")
public func fiipVisionOcrImage(_ pathPointer: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar>? {
    let path = String(cString: pathPointer)
    let url = URL(fileURLWithPath: path)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        return strdup(makePayload(text: "", confidence: 0, width: 0, height: 0, words: []))
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["fr-FR", "en-US"]

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do {
        try handler.perform([request])
        let observations = request.results ?? []
        let lines = observations.compactMap { $0.topCandidates(1).first?.string }
        var words: [[String: Any]] = []
        var confidenceSum = 0.0
        var confidenceCount = 0.0
        let imageWidth = Double(cgImage.width)
        let imageHeight = Double(cgImage.height)

        for observation in observations {
            guard let candidate = observation.topCandidates(1).first else { continue }
            confidenceSum += Double(candidate.confidence) * 100
            confidenceCount += 1
            let box = observation.boundingBox
            words.append([
                "text": candidate.string,
                "confidence": Double(candidate.confidence) * 100,
                "bbox": [
                    "x": Double(box.minX) * imageWidth,
                    "y": (1.0 - Double(box.maxY)) * imageHeight,
                    "width": Double(box.width) * imageWidth,
                    "height": Double(box.height) * imageHeight
                ]
            ])
        }

        let text = lines.joined(separator: "\n")
        let confidence = confidenceCount > 0 ? confidenceSum / confidenceCount : (text.isEmpty ? 0 : 86)
        return strdup(makePayload(text: text, confidence: confidence, width: imageWidth, height: imageHeight, words: words))
    } catch {
        return strdup(makePayload(text: "", confidence: 0, width: Double(cgImage.width), height: Double(cgImage.height), words: []))
    }
}
