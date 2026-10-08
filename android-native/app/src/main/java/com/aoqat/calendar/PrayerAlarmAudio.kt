package com.aoqat.calendar

import android.content.Context
import android.media.AudioManager

/** Keep an enabled alarm audible without changing ringtone or adhan preferences. */
object PrayerAlarmAudio {
    @Volatile var running = false
    private fun prefs(c: Context) = c.getSharedPreferences("prayer_alarm_audio", Context.MODE_PRIVATE)
    fun ensureAudible(c: Context) {
        if (!running) restore(c)
        running = true
        val am = c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (am.getStreamVolume(AudioManager.STREAM_ALARM) != 0) return
        val level = maxOf(1, am.getStreamMaxVolume(AudioManager.STREAM_ALARM) / 2)
        prefs(c).edit().putInt("previous", 0).putInt("applied", level).commit()
        try { am.setStreamVolume(AudioManager.STREAM_ALARM, level, 0) }
        catch (e: SecurityException) { android.util.Log.w("PrayerAlarm", "Cannot raise alarm volume", e) }
    }
    fun restore(c: Context) {
        running = false
        val p = prefs(c)
        if (!p.contains("previous")) return
        val am = c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        try {
            if (am.getStreamVolume(AudioManager.STREAM_ALARM) == p.getInt("applied", -1))
                am.setStreamVolume(AudioManager.STREAM_ALARM, p.getInt("previous", 0), 0)
        } catch (e: SecurityException) { android.util.Log.w("PrayerAlarm", "Cannot restore alarm volume", e) }
        p.edit().clear().commit()
    }
}
