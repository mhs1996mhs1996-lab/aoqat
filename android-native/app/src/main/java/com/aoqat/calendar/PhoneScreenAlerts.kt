package com.aoqat.calendar

import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.view.WindowManager
import org.json.JSONObject

/**
 * Android-only, user-controlled screen wake and fullscreen alert preference.
 *
 * An FSI, not a background startActivity(), is the OS-supported path for alarms
 * to wake a locked or sleeping device. Android 14+ may require a separate grant.
 * If the grant is denied Android shows a heads-up notification instead.
 *
 * Sound playback, alarm delivery, and ordinary notifications are NEVER gated by
 * this switch. Only FSI/screen waking is disabled.
 */
object PhoneScreenAlerts {
    private const val PREF = "phone_screen_alerts_v1"
    fun enabled(c: Context): Boolean =
        c.getSharedPreferences(PREF, Context.MODE_PRIVATE).getBoolean("enabled", true)

    fun setEnabled(c: Context, on: Boolean) {
        c.getSharedPreferences(PREF, Context.MODE_PRIVATE).edit()
            .putBoolean("enabled", on).commit()
    }

    fun fullScreenGranted(c: Context): Boolean {
        if (Build.VERSION.SDK_INT < 34) return true
        val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return nm.canUseFullScreenIntent()
    }

    fun status(c: Context): JSONObject {
        val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return JSONObject().put("enabled", enabled(c))
            .put("notifications", nm.areNotificationsEnabled())
            .put("fullScreen", fullScreenGranted(c))
            .put("requiresGrant", Build.VERSION.SDK_INT >= 34)
    }

    /** These flags are applied only to actual alert Activities, never MainActivity. */
    fun applyWindow(activity: Activity) {
        val on = enabled(activity)
        if (Build.VERSION.SDK_INT >= 27) {
            activity.setShowWhenLocked(on)
            activity.setTurnScreenOn(on)
        } else {
            val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            if (on) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
        }
        if (on) activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
}
