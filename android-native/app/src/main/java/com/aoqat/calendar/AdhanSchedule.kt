package com.aoqat.calendar

import android.app.*
import android.content.*
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.time.*

/** One database cache, explicit prayer identity, absolute deadlines; UI never starts scheduled audio. */
object PrayerTimes {
    val ids = listOf("fajr", "dhuhr", "asr", "maghrib", "isha")
    val names = mapOf("fajr" to "الفجر", "dhuhr" to "الظهر", "asr" to "العصر", "maghrib" to "المغرب", "isha" to "العشاء")
    fun minutes(value: String, id: String): Int? {
        val m = Regex("^(\\d{1,2}):(\\d{2})").find(value) ?: return null
        var h = m.groupValues[1].toInt(); val n = m.groupValues[2].toInt()
        if (h !in 0..23 || n !in 0..59) return null
        if (id in listOf("asr", "maghrib", "isha") && h < 12) h += 12
        if (id in listOf("fajr", "sunrise") && h == 12) h = 0
        return h * 60 + n
    }
    data class Prayer(val id: String, val at: Long, val friday: Boolean)
    fun rows(c: Context): JSONArray = try { JSONArray(c.getSharedPreferences("iqama_schedule", Context.MODE_PRIVATE).getString("rows", "[]")) } catch (_: Exception) { JSONArray() }
    fun events(c: Context, today: LocalDate = LocalDate.now()): List<Prayer> {
        val rows = rows(c); val out = mutableListOf<Prayer>()
        for (offset in 0L..7L) {
            val d = today.plusDays(offset)
            val row = (0 until rows.length()).map { rows.getJSONObject(it) }.firstOrNull { it.optInt("gregorian_month") == d.monthValue && it.optInt("gregorian_day") == d.dayOfMonth } ?: continue
            for (id in ids) {
                val n = minutes(row.optString(id), id) ?: continue
                out.add(Prayer(id, d.atStartOfDay().plusMinutes(n.toLong()).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(), id == "dhuhr" && d.dayOfWeek == DayOfWeek.FRIDAY))
            }
        }
        return out.sortedBy { it.at }
    }
}
object AdhanSchedule {
    private fun prefs(c: Context) = c.getSharedPreferences("adhan_settings", Context.MODE_PRIVATE)
    fun settings(c: Context): JSONObject = try { JSONObject(prefs(c).getString("settings", "{}")) } catch (_: Exception) { JSONObject() }
    fun enabled(c: Context) = settings(c).optBoolean("enabled", false)
    fun configure(c: Context, json: String) {
        val s = try { JSONObject(json) } catch (_: Exception) { return }
        // Permission-dependent features must never appear enabled when Android refuses them.
        if (s.optInt("afterSilent") > 0 && !(c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).isNotificationPolicyAccessGranted) s.put("afterSilent", 0)
        prefs(c).edit().putString("settings", s.toString()).commit()
        if (!s.optBoolean("enabled")) c.stopService(Intent(c, AdhanPlaybackService::class.java))
        schedule(c)
        if (s.optBoolean("persistent")) NextPrayerService.start(c) else c.stopService(Intent(c, NextPrayerService::class.java))
        PrayerWidget.update(c)
        Thread { IqamaNativeScheduler.refresh(c) }.start()
    }
    fun storeRows(c: Context, value: String) {
        try { val a = JSONArray(value); if (a.length() > 0) c.getSharedPreferences("iqama_schedule", Context.MODE_PRIVATE).edit().putString("rows", a.toString()).commit() } catch (_: Exception) { return }
        schedule(c); IqamaNativeScheduler.scheduleCached(c); PrayerWidget.update(c)
    }
    fun alarm(c: Context, id: Int, action: String, at: Long, prayer: PrayerTimes.Prayer? = null) {
        val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) return
        val intent = Intent(c, AdhanReceiver::class.java).setAction(action)
        prayer?.let { intent.putExtra("prayerId", it.id).putExtra("prayerAt", it.at).putExtra("friday", it.friday) }
        val pi = PendingIntent.getBroadcast(c, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        if (action == "PLAY") {
            val show = PendingIntent.getActivity(c, id, Intent(c, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            am.setAlarmClock(AlarmManager.AlarmClockInfo(at, show), pi)
        } else am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
    }
    private fun cancel(c: Context, id: Int, action: String) {
        val pi = PendingIntent.getBroadcast(c, id, Intent(c, AdhanReceiver::class.java).setAction(action), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE) ?: return
        (c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pi); pi.cancel()
    }
    @Synchronized fun schedule(c: Context) {
        val s = settings(c); val now = System.currentTimeMillis(); val events = PrayerTimes.events(c)
        // Fixed slots are replaced/cancelled on every settings edit, not accumulated.
        for (i in 0..39) { cancel(c, 60000 + i, "PLAY"); cancel(c, 60100 + i, "REMINDER"); cancel(c, 60200 + i, "SUHOOR") }
        for ((i,p) in events.withIndex()) if (p.at > now && i < 40 && s.optBoolean("enabled", false)) {
            val mode = s.optJSONObject("modes")?.optString(if (p.friday) "friday" else p.id, "sound") ?: "sound"
            if (mode != "silent") alarm(c, 60000+i, "PLAY", p.at, p)
            val before = s.optInt("reminder", 0).coerceIn(0,60)*60000L
            if (before > 0 && p.at-before > now) alarm(c, 60100+i, "REMINDER", p.at-before, p)
            val suhoor = s.optInt("suhoor",0).coerceIn(0,120)*60000L
            if (p.id == "fajr" && suhoor > 0 && p.at-suhoor > now) alarm(c, 60200+i, "SUHOOR", p.at-suhoor, p)
        }
        cancel(c, 60300, "NEXT")
        events.firstOrNull { it.at > now }?.let { if (s.optBoolean("persistent") || PrayerWidget.exists(c)) alarm(c,60300,"NEXT",it.at+1000) }
        cancel(c,60301,"REFRESH")
        if (s.optBoolean("enabled") || s.optBoolean("persistent") || PrayerWidget.exists(c)) alarm(c,60301,"REFRESH",LocalDate.now().plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli())
    }
}
class AdhanReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, intent: Intent) {
        when(intent.action) {
            "PLAY" -> if (AdhanSchedule.enabled(c) && kotlin.math.abs(System.currentTimeMillis()-intent.getLongExtra("prayerAt",0)) < 120000) {
                androidx.core.content.ContextCompat.startForegroundService(c, Intent(c, AdhanPlaybackService::class.java).putExtras(intent))
            }
            "REMINDER", "SUHOOR" -> if (AdhanSchedule.enabled(c)) {
                val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.createNotificationChannel(NotificationChannel("adhan_reminders","تذكيرات الصلاة والسحور",NotificationManager.IMPORTANCE_DEFAULT))
                nm.notify(if(intent.action=="SUHOOR") 60402 else 60401, Notification.Builder(c,"adhan_reminders").setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(if(intent.action=="SUHOOR")"تذكير بالسحور" else "اقترب وقت الصلاة").setContentText(PrayerTimes.names[intent.getStringExtra("prayerId")] ?: "").setVisibility(Notification.VISIBILITY_PUBLIC).setAutoCancel(true).setContentIntent(PendingIntent.getActivity(c,0,Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE)).build())
            }
            "RESTORE_SOUND" -> AdhanPlaybackService.restoreRinger(c)
            "REFRESH" -> { AdhanSchedule.schedule(c); val pending=goAsync(); Thread { try { IqamaNativeScheduler.refresh(c) } finally { pending.finish() } }.start() }
            "NEXT" -> { PrayerWidget.update(c); if(AdhanSchedule.settings(c).optBoolean("persistent"))NextPrayerService.start(c); AdhanSchedule.schedule(c) }
        }
    }
}
