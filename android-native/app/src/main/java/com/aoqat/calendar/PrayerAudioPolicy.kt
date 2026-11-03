package com.aoqat.calendar

import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import org.json.JSONObject

/**
 * The user's two audio permissions are separate for each of the five prayers.
 * Notification delivery, alarm scheduling and after-iqama quiet never depend on these flags.
 */
object PrayerAudioPolicy {
    data class Grant(val allowed: Boolean, val dndBypass: Boolean = false)
    private const val STORE = "prayer_audio_dnd_bypass"

    fun allowed(settings: JSONObject, prayerId: String, silent: Boolean, dnd: Boolean): Boolean {
        if (prayerId !in PrayerTimes.ids) return true // Preserve independent Friday and third-night rules.
        val selected = settings.optJSONObject("audibility")?.optJSONObject(prayerId)
        val legacy = settings.optBoolean("overrideSilent", false)
        val allowSilent = selected?.optBoolean("silent", legacy) ?: legacy
        val allowDnd = selected?.optBoolean("dnd", legacy) ?: legacy
        return (!silent || allowSilent) && (!dnd || allowDnd)
    }

    @Synchronized fun begin(c: Context, prayerId: String, settings: JSONObject): Grant {
        val am = c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val prefs = c.getSharedPreferences(STORE, Context.MODE_PRIVATE)
        val current = nm.currentInterruptionFilter
        // With two active services the filter was temporarily lifted. Check the ORIGINAL
        // DND condition so the second prayer cannot bypass a disabled per-prayer switch.
        val held = prefs.getInt("holders", 0) > 0 && current == NotificationManager.INTERRUPTION_FILTER_ALL
        if (!held && prefs.getInt("holders", 0) > 0) prefs.edit().clear().commit()
        val original = if (held) prefs.getInt("previousFilter", current) else current
        val dnd = original != NotificationManager.INTERRUPTION_FILTER_ALL &&
            original != NotificationManager.INTERRUPTION_FILTER_UNKNOWN
        val silent = am.ringerMode != AudioManager.RINGER_MODE_NORMAL
        if (!allowed(settings, prayerId, silent, dnd)) return Grant(false)
        if (!dnd) return Grant(true)
        if (!nm.isNotificationPolicyAccessGranted) {
            android.util.Log.w("PrayerAudioPolicy", "DND access required for audible prayer: $prayerId")
            return Grant(false)
        }
        if (held) {
            prefs.edit().putInt("holders", prefs.getInt("holders", 0) + 1).commit()
            return Grant(true, true)
        }
        return try {
            nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
            if (nm.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL) {
                Grant(false)
            } else {
                prefs.edit().putInt("previousFilter", original).putInt("holders", 1).commit()
                Grant(true, true)
            }
        } catch (e: SecurityException) {
            android.util.Log.w("PrayerAudioPolicy", "Cannot temporarily allow prayer audio in DND", e)
            Grant(false)
        }
    }

    @Synchronized fun end(c: Context) {
        val prefs = c.getSharedPreferences(STORE, Context.MODE_PRIVATE)
        val holders = prefs.getInt("holders", 0)
        if (holders <= 0) return
        if (holders > 1) {
            prefs.edit().putInt("holders", holders - 1).commit()
            return
        }
        val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        try {
            // Never overwrite a DND change made by the user while the audio was playing.
            if (nm.isNotificationPolicyAccessGranted &&
                nm.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_ALL) {
                nm.setInterruptionFilter(prefs.getInt("previousFilter", NotificationManager.INTERRUPTION_FILTER_ALL))
            }
            prefs.edit().clear().commit()
        } catch (e: SecurityException) {
            android.util.Log.w("PrayerAudioPolicy", "DND restore will retry on next app startup", e)
        }
    }

    /** Recover an interrupted foreground service without leaving the user's DND disabled. */
    @Synchronized fun recover(c: Context) {
        if (AdhanPlaybackService.running || PrayerAlarmAudio.running) return
        val prefs = c.getSharedPreferences(STORE, Context.MODE_PRIVATE)
        if (prefs.getInt("holders", 0) > 0) {
            prefs.edit().putInt("holders", 1).commit()
            end(c)
        }
    }
}
