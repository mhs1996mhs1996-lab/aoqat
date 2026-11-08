package com.aoqat.calendar

import android.content.Context
import android.content.Intent

/** Opt-in lock-screen fallback for launchers that do not allow third-party lock widgets.
 * Shows the next prayer with a live native Android chronometer in an ongoing,
 * public, silent notification. It does not unlock the phone or change alarm behavior.
 */
object LockScreenPrayer {
    private const val PREFS = "lockscreen_prayer_v1"
    fun enabled(c: Context): Boolean =
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("enabled", false)

    fun configure(c: Context, enabled: Boolean): Boolean {
        if (!c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putBoolean("enabled", enabled).commit()) return false
        if (enabled || AdhanSchedule.settings(c).optBoolean("persistent"))
            NextPrayerService.start(c)
        else
            c.stopService(Intent(c, NextPrayerService::class.java))
        AdhanSchedule.schedule(c)
        return true
    }
}
