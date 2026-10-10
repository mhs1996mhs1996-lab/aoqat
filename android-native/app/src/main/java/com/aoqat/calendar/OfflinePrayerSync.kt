package com.aoqat.calendar

import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.LocalDate
import java.util.concurrent.atomic.AtomicBoolean

/** The saved database is usable before any network request. Never replace it with a partial response. */
object OfflinePrayerSync {
    const val PERIODIC_JOB = 71101
    const val RETRY_JOB = 71102
    private const val WEEK = 7L * 86400000
    private val running = AtomicBoolean(false)
    private val fields = listOf("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha")
    private fun prefs(c: Context) = c.getSharedPreferences("iqama_schedule", Context.MODE_PRIVATE)
    fun valid(r: JSONObject): Boolean = (r.optString("location_name").isBlank() || r.optString("location_name") == "الحويجة وضواحيها") &&
        r.optInt("gregorian_month") in 1..12 && r.optInt("gregorian_day") in 1..31 && fields.all { Regex("^(?:[01]?\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?$").matches(r.optString(it)) }
    fun merge(previous: JSONArray, incoming: JSONArray): JSONArray {
        val rows = linkedMapOf<String, JSONObject>()
        for (source in listOf(previous, incoming)) for (i in 0 until source.length()) {
            val r = source.optJSONObject(i) ?: continue
            val present = fields.filter { r.has(it) }
            if ((r.optString("location_name").isBlank() || r.optString("location_name") == "الحويجة وضواحيها") && r.optInt("gregorian_month") in 1..12 && r.optInt("gregorian_day") in 1..31 && present.isNotEmpty() && present.all { PrayerTimes.minutes(r.optString(it),it) != null }) {
                val key="${r.optInt("gregorian_month")}-${r.optInt("gregorian_day")}"
                val combined=JSONObject(rows[key]?.toString() ?: "{}")
                r.keys().forEach { combined.put(it,r.get(it)) }
                rows[key]=combined
            }
        }
        return JSONArray(rows.values.toList())
    }
    fun rows(c: Context): JSONArray {
        val backup = try { JSONArray(c.assets.open("www/data/prayer-times-offline.json").bufferedReader().use { it.readText() }) } catch (_: Exception) { JSONArray() }
        val saved = try { JSONArray(prefs(c).getString("rows", "[]")) } catch (_: Exception) { JSONArray() }
        return merge(backup, saved)
    }
    fun window(today: LocalDate = LocalDate.now()) = (0L..7L).map { today.plusDays(it) }
    fun complete(rows: JSONArray, dates: List<LocalDate>): Boolean = dates.all { date ->
        (0 until rows.length()).any { i -> rows.optJSONObject(i)?.let { r -> valid(r) && r.optInt("gregorian_month") == date.monthValue && r.optInt("gregorian_day") == date.dayOfMonth } == true }
    }
    fun due(c: Context, now: Long = System.currentTimeMillis()): Boolean {
        val last = prefs(c).getLong("offlineSyncAt", 0)
        val saved = try { JSONArray(prefs(c).getString("rows", "[]")) } catch (_: Exception) { JSONArray() }
        return last <= 0 || now < last || now - last >= WEEK || !complete(saved, window().take(2))
    }
    fun install(c: Context) {
        val scheduler = c.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
        val component = ComponentName(c, PrayerSyncJob::class.java)
        if (scheduler.getPendingJob(PERIODIC_JOB) == null) scheduler.schedule(JobInfo.Builder(PERIODIC_JOB, component)
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(true).setPeriodic(12 * 3600000L).build())
        if (due(c) && scheduler.getPendingJob(RETRY_JOB) == null) scheduler.schedule(JobInfo.Builder(RETRY_JOB, component)
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(true).setBackoffCriteria(60000, JobInfo.BACKOFF_POLICY_EXPONENTIAL).build())
    }
    fun refresh(c: Context, download: ((URL) -> JSONArray)? = null): Boolean {
        if (!due(c)) return true
        if (!running.compareAndSet(false, true)) return false
        try {
            val dates = window(); val filter = "(" + dates.joinToString(",") { "and(gregorian_month.eq.${it.monthValue},gregorian_day.eq.${it.dayOfMonth})" } + ")"
            val location = URLEncoder.encode("الحويجة وضواحيها", "UTF-8")
            val url = URL("https://ytdvhiijxxaqofduorwm.supabase.co/rest/v1/annual_prayer_times?select=gregorian_month,gregorian_day,location_name,${fields.joinToString(",")}&location_name=eq.$location&or=${URLEncoder.encode(filter,"UTF-8")}&limit=8")
            val incoming = download?.invoke(url) ?: fetch(url)
            if (incoming.length() != 8 || !complete(incoming, dates) || (0 until incoming.length()).any { !valid(incoming.getJSONObject(it)) }) return false
            val merged = merge(rows(c), incoming)
            if (!prefs(c).edit().putString("rows", merged.toString()).putLong("offlineSyncAt", System.currentTimeMillis()).commit()) return false
            IqamaNativeScheduler.scheduleCached(c)
            AdhanSchedule.schedule(c)
            PrayerAlarm.schedule(c)
            PrayerWidget.update(c)
            AlarmScheduler.scheduleFromDatabase(c)
            return true
        } catch (e: Exception) { android.util.Log.w("PrayerSync", "Keeping saved database rows", e); return false }
        finally { running.set(false) }
    }
    private fun fetch(url: URL): JSONArray {
        val connection = url.openConnection() as HttpURLConnection
        connection.connectTimeout = 8000; connection.readTimeout = 8000
        connection.setRequestProperty("apikey", "sb_publishable_dQRoxdwRJDDgWLze1U4ZqA_aaVlKC-1")
        return try { if (connection.responseCode !in 200..299) throw java.io.IOException("Prayer database unavailable")
            JSONArray(connection.inputStream.bufferedReader().use { it.readText() })
        } finally { connection.disconnect() }
    }
}

class PrayerSyncJob : JobService() {
    override fun onStartJob(params: JobParameters): Boolean {
        Thread { val success = OfflinePrayerSync.refresh(applicationContext); jobFinished(params, !success) }.start()
        return true
    }
    override fun onStopJob(params: JobParameters): Boolean = true
}
