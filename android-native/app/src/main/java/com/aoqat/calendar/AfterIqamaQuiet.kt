package com.aoqat.calendar

import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import org.json.JSONObject

/** Uses saved prayer identity and iqama durations, never WebView countdown text. */
object AfterIqamaQuiet {
    fun window(settings: JSONObject, prayerId: String, prayerAt: Long, iqamaMinutes: Int): Pair<Long, Long>? {
        val quiet=settings.optJSONObject("afterIqamaSilent") ?: return null
        // This feature has its own switch. The adhan audio master switch only
        // controls playback; it must never prevent the prayer-time quiet window.
        if (!quiet.optBoolean("enabled")) return null
        val duration=quiet.optJSONObject("minutes")?.optInt(prayerId,0)?.coerceIn(0,120) ?: 0
        if (duration==0 || prayerId !in PrayerTimes.ids) return null
        val start=prayerAt+iqamaMinutes.coerceIn(0,120)*60000L
        return start to start+duration*60000L
    }
    fun start(c: Context, prayerId: String, prayerAt: Long) {
        if(FridaySchedule.suppress(c,prayerId,prayerAt))return
        val times=window(AdhanSchedule.settings(c),prayerId,prayerAt,IqamaNativeScheduler.durations(c,prayerId).beforeMinutes) ?: return
        val now=System.currentTimeMillis()
        if (now !in times.first until times.second) return
        // A short iqama window must never silence a still-playing adhan.
        // Recheck after 15 seconds, preserving the original absolute end time.
        if (AdhanPlaybackService.running) {
            AdhanSchedule.alarm(c, 60590 + PrayerTimes.ids.indexOf(prayerId), "IQAMA_QUIET", now + 15000L,
                PrayerTimes.Prayer(prayerId,prayerAt,false))
            return
        }
        AdhanPlaybackService.activateQuiet(c,times.second)
    }
}
