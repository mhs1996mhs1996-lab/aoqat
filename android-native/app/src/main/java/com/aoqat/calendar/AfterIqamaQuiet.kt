package com.aoqat.calendar

import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import org.json.JSONObject

/** Uses saved prayer identity and iqama durations, never WebView countdown text. */
object AfterIqamaQuiet {
    fun window(settings: JSONObject, prayerId: String, prayerAt: Long, iqamaMinutes: Int): Pair<Long, Long>? {
        val quiet=settings.optJSONObject("afterIqamaSilent") ?: return null
        if (!settings.optBoolean("enabled") || !quiet.optBoolean("enabled")) return null
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
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (!nm.isNotificationPolicyAccessGranted) return
        val am=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val prefs=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
        val previous=if(prefs.getBoolean("changed",false))prefs.getInt("previous",2) else am.ringerMode
        val end=maxOf(times.second,prefs.getLong("end",0))
        try {
            am.ringerMode=AudioManager.RINGER_MODE_SILENT
            prefs.edit().putBoolean("changed",true).putInt("previous",previous).putLong("end",end).commit()
            AdhanSchedule.alarm(c,60403,"RESTORE_SOUND",end)
        } catch (_: SecurityException) { }
    }
}

