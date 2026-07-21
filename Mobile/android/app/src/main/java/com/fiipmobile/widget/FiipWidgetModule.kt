package com.fiipmobile.widget

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FiipWidgetModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "FiipWidgetModule"

  @ReactMethod
  fun refresh(promise: Promise) {
    try {
      FiipWidgetProvider.refreshAll(reactContext.applicationContext)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("FIIP_WIDGET_REFRESH_FAILED", error.message, error)
    }
  }
}
