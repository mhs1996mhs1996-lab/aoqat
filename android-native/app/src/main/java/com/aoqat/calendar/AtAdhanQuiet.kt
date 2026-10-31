package com.aoqat.calendar

import android.content.Context
import org.json.JSONObject

/** Independently selected quiet window starting at the database adhan timestamp.
 * Does not depend on opening the WebView, on notification countdowns, or on the
 * master switch for playing the adhan recording.
 */
object AtAdhanQuiet {
    private const val DEFAULT_MINUTES = 10

    fun window(settings: JSONObject, prayerId: String, prayerAt: Long): Pair<Long, Long>? {
        if(prayerId !in PrayerTimes.ids || prayerAt<=0L)return null
        val cfg=settings.optJSONObject("atAdhanSilent") ?: return null
        if(!cfg.optBoolean("enabled"))return null
        val duration=cfg.optJSONObject("minutes")?.optInt(prayerId,DEFAULT_MINUTES)
            ?.coerceIn(0,120) ?: DEFAULT_MINUTES
        if(duration<=0)return null
        return prayerAt to (prayerAt + duration*60000L)
    }

    fun start(c: Context, prayerId: String, prayerAt: Long) {
        if(FridaySchedule.suppress(c,prayerId,prayerAt))return
        val (begin,end)=window(AdhanSchedule.settings(c),prayerId,prayerAt) ?: return
        val now=System.currentTimeMillis()
        if(now !in begin until end)return
        // Restore the previous ringer/DND state on the original absolute deadline.
        AdhanPlaybackService.activateQuiet(c,end,begin)
    }

    fun ownsActiveRinger(c: Context, prayerId: String, prayerAt: Long): Boolean {
        val (begin,end)=window(AdhanSchedule.settings(c),prayerId,prayerAt) ?: return false
        val now=System.currentTimeMillis()
        if(now !in begin until end)return false
        val prefs=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
        return prefs.getBoolean("changed",false) && prefs.getLong("end",0L)>now
    }
}
