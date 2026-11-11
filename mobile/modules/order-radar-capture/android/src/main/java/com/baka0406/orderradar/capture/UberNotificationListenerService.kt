package com.baka0406.orderradar.capture

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class UberNotificationListenerService : NotificationListenerService() {
  override fun onNotificationPosted(statusBarNotification: StatusBarNotification?) {
    val posted = statusBarNotification ?: return
    if (posted.packageName !in UBER_DRIVER_PACKAGES) return

    // Android grants notification listeners broad access. To minimize collection, do not
    // inspect extras until the posting package has been confirmed as Uber Driver.
    val notification = posted.notification ?: return
    val text = notificationText(notification)
    if (text.isBlank()) return

    RadarCaptureService.onUberNotification(text)
  }

  private fun notificationText(notification: Notification): String {
    val extras = notification.extras ?: return ""
    val values = mutableListOf<CharSequence>()
    listOf(
      Notification.EXTRA_TITLE,
      Notification.EXTRA_TITLE_BIG,
      Notification.EXTRA_TEXT,
      Notification.EXTRA_BIG_TEXT,
      Notification.EXTRA_SUB_TEXT,
      Notification.EXTRA_INFO_TEXT,
      Notification.EXTRA_SUMMARY_TEXT,
    ).forEach { key ->
      extras.getCharSequence(key)?.let(values::add)
    }
    extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.let { values.addAll(it.asList()) }
    return values
      .map { it.toString() }
      .map { it.trim() }
      .filter { it.isNotEmpty() }
      .distinct()
      .joinToString("\n")
  }

  companion object {
    private val UBER_DRIVER_PACKAGES = setOf("com.ubercab.driver")
  }
}
