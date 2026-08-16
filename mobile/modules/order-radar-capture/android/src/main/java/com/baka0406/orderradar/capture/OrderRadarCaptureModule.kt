package com.baka0406.orderradar.capture

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

class OrderRadarCaptureModule : Module() {
  private var pendingSettings: Map<String, Double> = emptyMap()

  override fun definition() = ModuleDefinition {
    Name("OrderRadarCapture")

    Events("onCaptureStatus", "onOrderDetected")

    OnCreate {
      activeModule = WeakReference(this@OrderRadarCaptureModule)
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != CAPTURE_REQUEST_CODE) return@OnActivityResult

      val context = appContext.reactContext ?: return@OnActivityResult
      val resultData = payload.data
      if (payload.resultCode != Activity.RESULT_OK || resultData == null) {
        updateStatus(context, "stopped", "使用者取消螢幕監看")
        return@OnActivityResult
      }

      val serviceIntent = Intent(context, RadarCaptureService::class.java).apply {
        action = RadarCaptureService.ACTION_START
        putExtra(RadarCaptureService.EXTRA_RESULT_CODE, payload.resultCode)
        putExtra(RadarCaptureService.EXTRA_RESULT_DATA, resultData)
        pendingSettings.forEach { (key, value) -> putExtra(key, value) }
      }
      ContextCompat.startForegroundService(context, serviceIntent)
      updateStatus(context, "requesting", "正在啟動手機端文字辨識…")
    }

    AsyncFunction("canDrawOverlaysAsync") {
      val context = appContext.reactContext
      context != null && canDrawOverlays(context)
    }

    AsyncFunction("getStatusAsync") {
      val context = appContext.reactContext
        ?: return@AsyncFunction statusMap("error", "Android 執行環境尚未就緒", false, "missing-context")
      readStatus(context)
    }

    AsyncFunction("getLastDetectionAsync") {
      val context = appContext.reactContext ?: return@AsyncFunction null
      RadarCaptureStore.readDetection(context)
    }

    AsyncFunction("openOverlaySettingsAsync") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_NO_ACTIVITY", "目前無法開啟浮動提示設定", null)
        return@AsyncFunction
      }
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(activity)) {
        promise.resolve(null)
        return@AsyncFunction
      }
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${activity.packageName}"),
      )
      activity.startActivity(intent)
      promise.resolve(null)
    }

    AsyncFunction("startCaptureAsync") { settings: Map<String, Double>, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_NO_ACTIVITY", "請回到接單雷達後再開始監看", null)
        return@AsyncFunction
      }
      if (RadarCaptureService.isRunning) {
        promise.resolve(readStatus(activity))
        return@AsyncFunction
      }

      pendingSettings = sanitizeSettings(settings)
      val projectionManager = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
      updateStatus(activity, "requesting", "請在系統視窗選擇 Uber Eats 畫面")
      activity.startActivityForResult(projectionManager.createScreenCaptureIntent(), CAPTURE_REQUEST_CODE)
      promise.resolve(readStatus(activity))
    }

    AsyncFunction("stopCaptureAsync") {
      val context = appContext.reactContext
        ?: return@AsyncFunction statusMap("stopped", "自動判單已停止", false)
      context.startService(Intent(context, RadarCaptureService::class.java).apply {
        action = RadarCaptureService.ACTION_STOP
      })
      updateStatus(context, "stopped", "自動判單已停止")
      readStatus(context)
    }
  }

  companion object {
    private const val CAPTURE_REQUEST_CODE = 7419
    private var activeModule: WeakReference<OrderRadarCaptureModule>? = null

    fun emitStatus(context: Context, state: String, message: String, error: String? = null) {
      updateStatus(context, state, message, error)
      val event = statusMap(state, message, canDrawOverlays(context), error)
      Handler(Looper.getMainLooper()).post {
        activeModule?.get()?.sendEvent("onCaptureStatus", event)
      }
    }

    fun emitDetection(context: Context, detection: Map<String, Any>) {
      RadarCaptureStore.writeDetection(context, detection)
      Handler(Looper.getMainLooper()).post {
        activeModule?.get()?.sendEvent("onOrderDetected", detection)
      }
    }

    private fun sanitizeSettings(settings: Map<String, Double>): Map<String, Double> {
      val defaults = mapOf(
        RadarCaptureService.EXTRA_CASH_COST_PER_KM to 1.6,
        RadarCaptureService.EXTRA_FULL_COST_PER_KM to 3.0,
        RadarCaptureService.EXTRA_FUEL_ECONOMY to 44.8,
        RadarCaptureService.EXTRA_FUEL_PRICE to 30.5,
        RadarCaptureService.EXTRA_GREEN_HOURLY to 250.0,
        RadarCaptureService.EXTRA_GREEN_PER_KM to 15.0,
        RadarCaptureService.EXTRA_YELLOW_HOURLY to 200.0,
        RadarCaptureService.EXTRA_YELLOW_PER_KM to 12.0,
      )
      return defaults.mapValues { (key, default) ->
        settings[key]?.takeIf { it.isFinite() && it > 0 } ?: default
      }
    }

    private fun canDrawOverlays(context: Context): Boolean =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)

    private fun readStatus(context: Context): Map<String, Any> {
      val stored = RadarCaptureStore.readStatus(context)
      val state = if (RadarCaptureService.isRunning) "running" else stored.first
      val message = if (RadarCaptureService.isRunning) "正在監看訂單畫面，辨識只在手機上進行" else stored.second
      return statusMap(state, message, canDrawOverlays(context), stored.third)
    }

    private fun updateStatus(context: Context, state: String, message: String, error: String? = null) {
      RadarCaptureStore.writeStatus(context, state, message, error)
    }

    private fun statusMap(
      state: String,
      message: String,
      canDrawOverlays: Boolean,
      error: String? = null,
    ): Map<String, Any> = buildMap {
      put("state", state)
      put("message", message)
      put("canDrawOverlays", canDrawOverlays)
      if (error != null) put("lastError", error)
    }
  }
}
