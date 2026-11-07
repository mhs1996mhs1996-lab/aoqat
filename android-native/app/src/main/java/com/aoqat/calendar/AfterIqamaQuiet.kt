package com.aoqat.calendar

import android.content.Context
import org.json.JSONObject

/** Uses saved prayer identity and iqama durations, never WebView countdown text. */
object AfterIqamaQuiet {
    fun window(settings: JSONObject, prayerId: String, prayerAt: Long, iqamaMinutes: Int, elapsedMinutes: Int = 10): Pair<Long, Long>? {
        val quiet=settings.optJSONObject("afterIqamaSilent") ?: return null
        // This feature has its own switch. The adhan audio master switch only
        // controls playback; it must never prevent the prayer-time quiet window.
        if (!quiet.optBoolean("enabled")) return null
        val duration=quiet.optJSONObject("minutes")?.optInt(prayerId,0)?.coerceIn(0,120) ?: 0
        if (duration==0 || prayerId !in PrayerTimes.ids || prayerAt<=0L) return null
        val start=prayerAt+iqamaMinutes.coerceIn(0,120)*60000L
        // The silent window must never outlive the displayed "مضى على الإقامة".
        return start to start+minOf(duration,elapsedMinutes.coerceIn(0,120))*60000L
    }
    /**
     * Independent confirmation from the notification countdown's exact zero point.
     * The ordinary IQAMA_QUIET alarm remains scheduled even when notifications are
     * turned off; both paths use the same absolute database + iqama deadline.
     * Never derive the start from the moment the application was opened.
     */
    fun onCountdownZero(c: Context, prayerAt: Long) {
        val state=c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE)
        if(!state.getBoolean("active",false) || state.getLong("prayerAt",0L)!=prayerAt) return
        val prayerId=state.getString("prayerId","") ?: return
        if(prayerId in PrayerTimes.ids) start(c,prayerId,prayerAt)
    }

    fun start(c: Context, prayerId: String, prayerAt: Long) {
        if(FridaySchedule.suppress(c,prayerId,prayerAt))return
        val countdown=IqamaNativeScheduler.durations(c,prayerId)
        val times=window(AdhanSchedule.settings(c),prayerId,prayerAt,countdown.beforeMinutes,countdown.afterMinutes) ?: return
        val now=System.currentTimeMillis()
        if (now !in times.first until times.second) return
        // A short iqama window must never silence a still-playing adhan.
        // Recheck after 15 seconds, preserving the original absolute end time.
        if (AdhanPlaybackService.running) {
            AdhanSchedule.alarm(c, 60590 + PrayerTimes.ids.indexOf(prayerId), "IQAMA_QUIET", now + 15000L,
                PrayerTimes.Prayer(prayerId,prayerAt,false))
            return
        }
        // Only change the ringtone, never substitute or overwrite the user's
        // scheduled Do Not Disturb policy (e.g. 23:20–07:00).
        AdhanPlaybackService.activateQuiet(c,times.second,times.first,preserveUserDnd=true)
    }

    fun onCountdownComplete(c: Context, prayerAt: Long) {
        val state=c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE)
        // Keep this recovery independent of the foreground notification. OEMs
        // can close the service or the user can dismiss it before the boundary.
        // A stale event must never restore a newer prayer's quiet period.
        if(state.getLong("prayerAt",0L)!=prayerAt) {
            AdhanPlaybackService.restoreRingerIfExpired(c)
            return
        }
        val saved=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
        val deadline=saved.getLong("iqamaEnd",0L)
        if(saved.getBoolean("changed",false) && deadline>0 &&
            System.currentTimeMillis()>=deadline) {
            AdhanPlaybackService.restoreRinger(c)
        } else {
            AdhanPlaybackService.restoreRingerIfExpired(c)
        }
    }
}
