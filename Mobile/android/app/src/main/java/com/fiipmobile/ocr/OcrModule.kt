package com.fiipmobile.ocr

import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.File

class OcrModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "FiipOcrModule"

  @ReactMethod
  fun scanImageToText(imagePath: String, promise: Promise) {
    try {
      val uri = if (imagePath.startsWith("content://") || imagePath.startsWith("file://")) {
        Uri.parse(imagePath)
      } else {
        Uri.fromFile(File(imagePath))
      }
      val image = InputImage.fromFilePath(reactContext, uri)
      val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      recognizer.process(image)
        .addOnSuccessListener { result -> promise.resolve(result.text.trim()) }
        .addOnFailureListener { error -> promise.reject("OCR_FAILED", error.message, error) }
    } catch (error: Exception) {
      promise.reject("OCR_IMAGE_UNREADABLE", error.message, error)
    }
  }
}
