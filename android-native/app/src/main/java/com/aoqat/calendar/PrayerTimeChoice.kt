package com.aoqat.calendar

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors

/** User offsets never enter the shared annual database. Every native service uses effective rows. */
object PrayerTimeChoice {
    private fun prefs(c: Context) = c.getSharedPreferences("prayer_time_choice_v1", Context.MODE_PRIVATE)
    fun normalize(raw: JSONObject): JSONObject {
        val offsets=JSONObject()
        for(id in PrayerTimes.ids){val value=raw.optJSONObject("offsets")?.opt(id);val n=(value as? Number)?.toDouble() ?: value?.toString()?.toDoubleOrNull()
            offsets.put(id,if(n!=null&&n.isFinite()&&n%1.0==0.0&&n in -40.0..40.0)n.toInt() else 0)}
        return JSONObject().put("mode",if(raw.optString("mode")=="custom")"custom" else "database").put("offsets",offsets)
    }
    fun settings(c: Context): JSONObject = normalize(try{JSONObject(prefs(c).getString("settings","{}"))}catch(_:Exception){JSONObject()})
    fun configure(c: Context,json: String): String {
        val normalized=normalize(try{JSONObject(json)}catch(_:Exception){JSONObject()}).toString()
        if(normalized!=settings(c).toString()){prefs(c).edit().putString("settings",normalized).commit();PrayerStartup.refresh(c)}
        return normalized
    }
    fun apply(raw: JSONArray,settings: JSONObject): JSONArray {
        if(settings.optString("mode")!="custom")return raw
        val out=JSONArray(raw.toString());val offsets=settings.optJSONObject("offsets") ?: JSONObject()
        for(i in 0 until out.length()){val row=out.getJSONObject(i);for(id in PrayerTimes.ids){val delta=offsets.optInt(id,0);if(delta==0)continue
            val base=PrayerTimes.minutes(row.optString(id),id) ?: continue
            val minutes=((base+delta)%1440+1440)%1440;var hour=minutes/60
            if(id in listOf("asr","maghrib","isha")&&hour>=13)hour-=12
            row.put(id,"$hour:${(minutes%60).toString().padStart(2,'0')}")}}
        return out
    }
}

/** One serial worker restores cached services; opening a WebView never waits for alarm loops. */
object PrayerStartup {
    private val executor=Executors.newSingleThreadExecutor()
    fun refresh(c: Context){val app=c.applicationContext;executor.execute{
        try{
            OfflinePrayerSync.install(app)
            IqamaNativeScheduler.scheduleCached(app)
            AdhanSchedule.schedule(app)
            PrayerAlarm.schedule(app)
            AlarmScheduler.scheduleFromDatabase(app)
            PrayerWidget.update(app)
        }catch(e:Exception){android.util.Log.e("PrayerStartup","Unable to restore cached services",e)}
    }}
}
