import Foundation
import Vision
import UIKit

@objc(FiipOcrModule)
class FiipOcrModule: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(scanImageToText:resolver:rejecter:)
  func scanImageToText(_ imagePath: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let cleanPath = imagePath.replacingOccurrences(of: "file://", with: "")
    guard let image = UIImage(contentsOfFile: cleanPath), let cgImage = image.cgImage else {
      reject("OCR_IMAGE_UNREADABLE", "Impossible de lire l'image.", nil)
      return
    }

    let request = VNRecognizeTextRequest { request, error in
      if let error = error {
        reject("OCR_FAILED", error.localizedDescription, error)
        return
      }

      let text = (request.results as? [VNRecognizedTextObservation])?
        .compactMap { $0.topCandidates(1).first?.string }
        .joined(separator: "\n") ?? ""
      resolve(text)
    }
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["fr-FR", "en-US"]

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try handler.perform([request])
      } catch {
        reject("OCR_FAILED", error.localizedDescription, error)
      }
    }
  }
}
