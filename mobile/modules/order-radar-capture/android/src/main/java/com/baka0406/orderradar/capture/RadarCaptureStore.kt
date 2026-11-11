package com.baka0406.orderradar.capture

import android.content.Context
import org.json.JSONObject

internal object RadarCaptureStore {
  private const val STORE = "order_radar_capture"
  private const val KEY_STATE = "state"
  private const val KEY_MESSAGE = "message"
  private const val KEY_ERROR = "error"
  private const val KEY_DETECTION = "detection"

  fun writeStatus(context: Context, state: String, message: String, error: String?) {
    context.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit()
      .putString(KEY_STATE, state)
      .putString(KEY_MESSAGE, message)
      .putString(KEY_ERROR, error)
      .apply()
  }

  fun readStatus(context: Context): Triple<String, String, String?> {
    val preferences = context.getSharedPreferences(STORE, Context.MODE_PRIVATE)
    return Triple(
      preferences.getString(KEY_STATE, "idle") ?: "idle",
      preferences.getString(KEY_MESSAGE, "自動判單尚未啟動") ?: "自動判單尚未啟動",
      preferences.getString(KEY_ERROR, null),
    )
  }

  fun writeDetection(context: Context, detection: Map<String, Any>) {
    context.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit()
      .putString(KEY_DETECTION, JSONObject(detection).toString())
      .apply()
  }

  fun readDetection(context: Context): Map<String, Any>? {
    val raw = context.getSharedPreferences(STORE, Context.MODE_PRIVATE)
      .getString(KEY_DETECTION, null) ?: return null
    return runCatching {
      val json = JSONObject(raw)
      buildMap {
        json.keys().forEach { key -> put(key, json.get(key)) }
      }
    }.getOrNull()
  }
}
