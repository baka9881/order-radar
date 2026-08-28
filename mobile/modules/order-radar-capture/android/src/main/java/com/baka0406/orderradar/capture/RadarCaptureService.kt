package com.baka0406.orderradar.capture

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.atomic.AtomicBoolean
import java.lang.ref.WeakReference
import kotlin.math.max

class RadarCaptureService : Service() {
  private val imageThread = HandlerThread("order-radar-screen-reader")
  private lateinit var imageHandler: Handler
  private val mainHandler = Handler(android.os.Looper.getMainLooper())
  private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  private val processing = AtomicBoolean(false)

  private var mediaProjection: MediaProjection? = null
  private var virtualDisplay: VirtualDisplay? = null
  private var imageReader: ImageReader? = null
  private var overlayView: LinearLayout? = null
  private var lastFrameAt = 0L
  private var lastDetectionKey: String? = null
  private var lastDetectionAt = 0L
  private var blackFrameCount = 0
  private var releasing = false
  private var settings = CalculationSettings()

  override fun onCreate() {
    super.onCreate()
    imageThread.start()
    imageHandler = Handler(imageThread.looper)
    activeService = WeakReference(this)
    createNotificationChannels()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        OrderRadarCaptureModule.emitStatus(this, "stopped", "自動判單已停止")
        stopSelf()
      }
      ACTION_START -> startProjection(intent)
    }
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun startProjection(intent: Intent) {
    if (isRunning) return
    val resultData = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra(EXTRA_RESULT_DATA)
    }
    if (resultData == null) {
      fail("missing-projection-token", "沒有取得螢幕監看授權，請重新開始")
      return
    }

    settings = CalculationSettings.fromIntent(intent)
    val notification = buildForegroundNotification("正在啟動手機端訂單辨識…")
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ServiceCompat.startForeground(
        this,
        FOREGROUND_NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION,
      )
    } else {
      startForeground(FOREGROUND_NOTIFICATION_ID, notification)
    }

    try {
      val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
      val projection = projectionManager.getMediaProjection(
        intent.getIntExtra(EXTRA_RESULT_CODE, 0),
        resultData,
      ) ?: throw IllegalStateException("MediaProjection token rejected")
      mediaProjection = projection
      projection.registerCallback(object : MediaProjection.Callback() {
        override fun onStop() {
          if (!releasing) {
            OrderRadarCaptureModule.emitStatus(
              this@RadarCaptureService,
              "stopped",
              "螢幕監看已由系統停止；鎖定螢幕後需要重新啟動",
            )
            stopSelf()
          }
        }
      }, mainHandler)
      createVirtualDisplay()
      isRunning = true
      OrderRadarCaptureModule.emitStatus(this, "running", "正在監看訂單畫面，辨識只在手機上進行")
      updateForegroundNotification("自動判單運作中；點一下返回接單雷達")
    } catch (error: Throwable) {
      fail("projection-start-failed", "螢幕監看啟動失敗：${error.message ?: "未知錯誤"}")
    }
  }

  private fun createVirtualDisplay() {
    val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val density = resources.configuration.densityDpi
    val (width, height) = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val bounds = windowManager.maximumWindowMetrics.bounds
      bounds.width() to bounds.height()
    } else {
      @Suppress("DEPRECATION")
      resources.displayMetrics.widthPixels to resources.displayMetrics.heightPixels
    }
    imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2).also { reader ->
      reader.setOnImageAvailableListener({ source -> consumeLatestFrame(source) }, imageHandler)
    }
    virtualDisplay = mediaProjection?.createVirtualDisplay(
      "OrderRadarOfferReader",
      width,
      height,
      density,
      DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
      imageReader?.surface,
      null,
      imageHandler,
    )
  }

  private fun consumeLatestFrame(reader: ImageReader) {
    val image = reader.acquireLatestImage() ?: return
    val now = System.currentTimeMillis()
    if (now - lastFrameAt < FRAME_INTERVAL_MS || !processing.compareAndSet(false, true)) {
      image.close()
      return
    }
    lastFrameAt = now

    val plane = image.planes.firstOrNull()
    if (plane == null) {
      image.close()
      processing.set(false)
      return
    }
    val pixelStride = plane.pixelStride
    val rowPadding = plane.rowStride - pixelStride * image.width
    val paddedWidth = image.width + rowPadding / pixelStride
    val padded = Bitmap.createBitmap(paddedWidth, image.height, Bitmap.Config.ARGB_8888)
    padded.copyPixelsFromBuffer(plane.buffer)
    image.close()
    val frame = Bitmap.createBitmap(padded, 0, 0, imageReader?.width ?: padded.width, imageReader?.height ?: padded.height)
    if (frame !== padded) padded.recycle()

    if (isProbablyProtectedFrame(frame)) {
      blackFrameCount += 1
      frame.recycle()
      processing.set(false)
      if (blackFrameCount == PROTECTED_FRAME_THRESHOLD) {
        OrderRadarCaptureModule.emitStatus(
          this,
          "running",
          "目前取得的是黑畫面；Uber Eats 可能封鎖螢幕擷取",
          "protected-screen",
        )
      }
      return
    }
    blackFrameCount = 0

    recognizer.process(InputImage.fromBitmap(frame, 0))
      .addOnSuccessListener { result -> handleRecognizedText(result.text) }
      .addOnFailureListener { error ->
        OrderRadarCaptureModule.emitStatus(
          this,
          "running",
          "文字辨識暫時失敗，監看仍會繼續",
          error.message ?: "ocr-failed",
        )
      }
      .addOnCompleteListener {
        frame.recycle()
        processing.set(false)
      }
  }

  private fun handleRecognizedText(rawText: String) {
    val offer = OfferParser.parse(rawText) ?: return
    val key = "${offer.amount}|${offer.distance}|${offer.minutes}"
    val now = System.currentTimeMillis()
    if (key == lastDetectionKey && now - lastDetectionAt < DUPLICATE_WINDOW_MS) return
    lastDetectionKey = key
    lastDetectionAt = now

    val result = calculate(offer)
    val detection = mapOf<String, Any>(
      "amount" to offer.amount,
      "distance" to offer.distance,
      "minutes" to offer.minutes,
      "returnMode" to offer.returnMode,
      "effectiveDistance" to result.effectiveDistance,
      "effectiveMinutes" to result.effectiveMinutes,
      "signal" to result.signal,
      "fullNet" to result.fullNet,
      "fullHourly" to result.fullHourly,
      "perKm" to result.perKm,
      "confidence" to offer.confidence,
      "detectedAt" to isoTime(now),
      "sourceText" to "\$${offer.amount.toInt()} · ${offer.distance} km · ${offer.minutes.toInt()} min",
    )
    OrderRadarCaptureModule.emitDetection(this, detection)
    showDecision(result, offer)
  }

  private fun handleUberNotification(rawText: String) {
    imageHandler.post {
      // A matching notification should make the next captured frame eligible immediately.
      // If Uber included all three values in the notification, calculate without waiting.
      lastFrameAt = 0L
      handleRecognizedText(rawText)
    }
  }

  private fun calculate(offer: ParsedOffer): CalculationResult {
    val multiplier = when (offer.returnMode) {
      "full" -> 2.0
      "hotspot" -> 1.3
      else -> 1.0
    }
    val effectiveDistance = offer.distance * multiplier
    val effectiveMinutes = max(offer.minutes * multiplier, 1.0)
    val fullNet = offer.amount - effectiveDistance * settings.fullCostPerKm
    val fullHourly = fullNet * 60.0 / effectiveMinutes
    val perKm = if (effectiveDistance > 0) offer.amount / effectiveDistance else 0.0
    val greenMinimum = maxOf(
      45.0,
      effectiveDistance * settings.greenPerKm,
      effectiveDistance * settings.fullCostPerKm + settings.greenHourly * effectiveMinutes / 60.0,
    )
    val yellowMinimum = maxOf(
      45.0,
      effectiveDistance * settings.yellowPerKm,
      effectiveDistance * settings.fullCostPerKm + settings.yellowHourly * effectiveMinutes / 60.0,
    )
    val signal = when {
      offer.amount >= greenMinimum -> "green"
      offer.amount >= yellowMinimum -> "yellow"
      else -> "red"
    }
    return CalculationResult(signal, fullNet, fullHourly, perKm, effectiveDistance, effectiveMinutes)
  }

  private fun showDecision(result: CalculationResult, offer: ParsedOffer) {
    showDecisionNotification(result, offer)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)) {
      showDecisionOverlay(result, offer)
    }
  }

  private fun showDecisionNotification(result: CalculationResult, offer: ParsedOffer) {
    val (label, emoji) = when (result.signal) {
      "green" -> "值得接" to "✅"
      "yellow" -> "看情況" to "⚠️"
      else -> "先不要" to "⛔"
    }
    val returnLabel = when (offer.returnMode) {
      "full" -> "原路空返"
      "hotspot" -> "回附近熱區"
      else -> "當地續跑"
    }
    val body = "\$${offer.amount.toInt()} · $returnLabel ${String.format("%.1f", result.effectiveDistance)} km / ${result.effectiveMinutes.toInt()} 分｜淨時薪 \$${result.fullHourly.toInt()}"
    val notification = NotificationCompat.Builder(this, RESULT_CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("$emoji $label")
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
      .setAutoCancel(true)
      .setContentIntent(appPendingIntent())
      .build()
    (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
      .notify(RESULT_NOTIFICATION_ID, notification)
  }

  private fun showDecisionOverlay(result: CalculationResult, offer: ParsedOffer) {
    mainHandler.post {
      removeOverlay()
      val color = when (result.signal) {
        "green" -> Color.rgb(57, 224, 121)
        "yellow" -> Color.rgb(255, 203, 71)
        else -> Color.rgb(255, 106, 98)
      }
      val action = when (result.signal) {
        "green" -> "接 · 值得接"
        "yellow" -> "看 · 看情況"
        else -> "拒 · 先不要"
      }
      val card = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(18), dp(13), dp(18), dp(13))
        background = GradientDrawable().apply {
          cornerRadius = dp(18).toFloat()
          setColor(Color.rgb(7, 17, 13))
          setStroke(dp(2), color)
        }
        elevation = dp(12).toFloat()
        addView(textView(action, 21f, color, true))
        addView(textView(
          "\$${offer.amount.toInt()}  ·  ${offer.distance} km  ·  ${offer.minutes.toInt()} 分",
          14f,
          Color.WHITE,
          true,
        ))
        addView(textView(
          "淨利 \$${result.fullNet.toInt()}  ·  淨時薪 \$${result.fullHourly.toInt()}  ·  每公里 \$${String.format("%.1f", result.perKm)}",
          12f,
          Color.rgb(190, 207, 198),
          false,
        ))
      }
      val manager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
      val width = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        manager.maximumWindowMetrics.bounds.width() - dp(24)
      } else {
        @Suppress("DEPRECATION")
        resources.displayMetrics.widthPixels - dp(24)
      }
      val params = WindowManager.LayoutParams(
        width,
        WindowManager.LayoutParams.WRAP_CONTENT,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
          @Suppress("DEPRECATION")
          WindowManager.LayoutParams.TYPE_PHONE
        },
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
          WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
          WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT,
      ).apply {
        gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
        y = dp(72)
      }
      runCatching {
        manager.addView(card, params)
        overlayView = card
        mainHandler.postDelayed({ removeOverlay() }, OVERLAY_HIDE_MS)
      }
    }
  }

  private fun textView(value: String, sizeSp: Float, color: Int, bold: Boolean) = TextView(this).apply {
    text = value
    textSize = sizeSp
    setTextColor(color)
    gravity = Gravity.CENTER_HORIZONTAL
    if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
  }

  private fun removeOverlay() {
    val view = overlayView ?: return
    runCatching { (getSystemService(Context.WINDOW_SERVICE) as WindowManager).removeView(view) }
    overlayView = null
  }

  private fun isProbablyProtectedFrame(bitmap: Bitmap): Boolean {
    var dark = 0
    var total = 0
    val stepX = max(bitmap.width / 12, 1)
    val stepY = max(bitmap.height / 20, 1)
    var x = stepX / 2
    while (x < bitmap.width) {
      var y = stepY / 2
      while (y < bitmap.height) {
        val pixel = bitmap.getPixel(x, y)
        if (Color.red(pixel) < 4 && Color.green(pixel) < 4 && Color.blue(pixel) < 4) dark += 1
        total += 1
        y += stepY
      }
      x += stepX
    }
    return total > 0 && dark.toDouble() / total > 0.98
  }

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(NotificationChannel(
      SERVICE_CHANNEL_ID,
      "自動判單運作狀態",
      NotificationManager.IMPORTANCE_LOW,
    ).apply { description = "顯示螢幕監看是否正在執行" })
    manager.createNotificationChannel(NotificationChannel(
      RESULT_CHANNEL_ID,
      "訂單判斷結果",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "訂單出現時立即顯示紅黃綠建議"
      enableVibration(true)
    })
  }

  private fun buildForegroundNotification(message: String): Notification =
    NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("接單雷達自動判單")
      .setContentText(message)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setContentIntent(appPendingIntent())
      .addAction(0, "停止", PendingIntent.getService(
        this,
        2,
        Intent(this, RadarCaptureService::class.java).apply { action = ACTION_STOP },
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      ))
      .build()

  private fun updateForegroundNotification(message: String) {
    (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
      .notify(FOREGROUND_NOTIFICATION_ID, buildForegroundNotification(message))
  }

  private fun appPendingIntent(): PendingIntent? {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    return PendingIntent.getActivity(
      this,
      1,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun fail(code: String, message: String) {
    OrderRadarCaptureModule.emitStatus(this, "error", message, code)
    stopSelf()
  }

  private fun isoTime(timestamp: Long): String = SimpleDateFormat(
    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    Locale.US,
  ).apply {
    timeZone = TimeZone.getTimeZone("UTC")
  }.format(Date(timestamp))

  override fun onDestroy() {
    isRunning = false
    releasing = true
    removeOverlay()
    imageReader?.setOnImageAvailableListener(null, null)
    virtualDisplay?.release()
    imageReader?.close()
    mediaProjection?.stop()
    recognizer.close()
    imageThread.quitSafely()
    processing.set(false)
    if (activeService?.get() === this) activeService = null
    super.onDestroy()
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  companion object {
    const val ACTION_START = "com.baka0406.orderradar.capture.START"
    const val ACTION_STOP = "com.baka0406.orderradar.capture.STOP"
    const val EXTRA_RESULT_CODE = "projectionResultCode"
    const val EXTRA_RESULT_DATA = "projectionResultData"
    const val EXTRA_CASH_COST_PER_KM = "cashCostPerKm"
    const val EXTRA_FULL_COST_PER_KM = "fullCostPerKm"
    const val EXTRA_FUEL_ECONOMY = "fuelEconomy"
    const val EXTRA_FUEL_PRICE = "fuelPrice"
    const val EXTRA_GREEN_HOURLY = "greenHourly"
    const val EXTRA_GREEN_PER_KM = "greenPerKm"
    const val EXTRA_YELLOW_HOURLY = "yellowHourly"
    const val EXTRA_YELLOW_PER_KM = "yellowPerKm"

    private const val SERVICE_CHANNEL_ID = "order-radar-capture-service"
    private const val RESULT_CHANNEL_ID = "order-radar-capture-results"
    private const val FOREGROUND_NOTIFICATION_ID = 8119
    private const val RESULT_NOTIFICATION_ID = 8120
    private const val FRAME_INTERVAL_MS = 850L
    private const val DUPLICATE_WINDOW_MS = 45_000L
    private const val OVERLAY_HIDE_MS = 9_000L
    private const val PROTECTED_FRAME_THRESHOLD = 4

    @Volatile
    var isRunning = false
      private set

    private var activeService: WeakReference<RadarCaptureService>? = null

    fun onUberNotification(rawText: String) {
      activeService?.get()?.handleUberNotification(rawText)
    }
  }
}

private data class CalculationSettings(
  val cashCostPerKm: Double = 1.6,
  val fullCostPerKm: Double = 3.0,
  val fuelEconomy: Double = 44.8,
  val fuelPrice: Double = 30.5,
  val greenHourly: Double = 250.0,
  val greenPerKm: Double = 15.0,
  val yellowHourly: Double = 200.0,
  val yellowPerKm: Double = 12.0,
) {
  companion object {
    fun fromIntent(intent: Intent) = CalculationSettings(
      cashCostPerKm = intent.getDoubleExtra(RadarCaptureService.EXTRA_CASH_COST_PER_KM, 1.6),
      fullCostPerKm = intent.getDoubleExtra(RadarCaptureService.EXTRA_FULL_COST_PER_KM, 3.0),
      fuelEconomy = intent.getDoubleExtra(RadarCaptureService.EXTRA_FUEL_ECONOMY, 44.8),
      fuelPrice = intent.getDoubleExtra(RadarCaptureService.EXTRA_FUEL_PRICE, 30.5),
      greenHourly = intent.getDoubleExtra(RadarCaptureService.EXTRA_GREEN_HOURLY, 250.0),
      greenPerKm = intent.getDoubleExtra(RadarCaptureService.EXTRA_GREEN_PER_KM, 15.0),
      yellowHourly = intent.getDoubleExtra(RadarCaptureService.EXTRA_YELLOW_HOURLY, 200.0),
      yellowPerKm = intent.getDoubleExtra(RadarCaptureService.EXTRA_YELLOW_PER_KM, 12.0),
    )
  }
}

private data class ParsedOffer(
  val amount: Double,
  val distance: Double,
  val minutes: Double,
  val confidence: Double,
  val returnMode: String,
)

private data class CalculationResult(
  val signal: String,
  val fullNet: Double,
  val fullHourly: Double,
  val perKm: Double,
  val effectiveDistance: Double,
  val effectiveMinutes: Double,
)

private object OfferParser {
  private val amountPattern = Regex("""(?i)(?:NT\s*)?[$＄]\s*([0-9][0-9,]*(?:\.[0-9]+)?)""")
  private val distancePattern = Regex("""(?i)([0-9]+(?:\.[0-9]+)?)\s*(?:公里|公厘|km)""")
  private val timePattern = Regex("""(?i)([0-9]+(?:\.[0-9]+)?)\s*(?:分鐘|分鍾|分|mins?|minutes?)""")
  private val hourPattern = Regex("""(?i)([0-9]+(?:\.[0-9]+)?)\s*(?:小時|時|hours?|hrs?|h)\s*(?:([0-9]+(?:\.[0-9]+)?)\s*(?:分鐘|分鍾|分|mins?|minutes?))?""")

  fun parse(text: String): ParsedOffer? {
    if (text.length < 6) return null
    val amount = amountPattern.findAll(text)
      .mapNotNull { it.groupValues.getOrNull(1)?.replace(",", "")?.toDoubleOrNull() }
      .filter { it in 20.0..3000.0 }
      .maxOrNull() ?: return null
    val distance = distancePattern.findAll(text)
      .mapNotNull { it.groupValues.getOrNull(1)?.toDoubleOrNull() }
      .filter { it in 0.1..200.0 }
      .maxOrNull() ?: return null
    val hourMatch = hourPattern.find(text)
    val minutes = if (hourMatch != null) {
      val hours = hourMatch.groupValues.getOrNull(1)?.toDoubleOrNull() ?: return null
      val remainder = hourMatch.groupValues.getOrNull(2)?.toDoubleOrNull() ?: 0.0
      hours * 60.0 + remainder
    } else {
      timePattern.findAll(text)
        .mapNotNull { it.groupValues.getOrNull(1)?.toDoubleOrNull() }
        .firstOrNull { it in 1.0..300.0 } ?: return null
    }
    val returnMode = if (text.contains("包裹") && distance >= 15.0) "full" else "local"
    return ParsedOffer(amount, distance, minutes, 0.95, returnMode)
  }
}
