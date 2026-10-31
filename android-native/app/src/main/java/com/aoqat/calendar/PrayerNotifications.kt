package com.aoqat.calendar

import android.app.*
import android.content.*
import android.media.*
import android.os.*
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.time.LocalDate
import java.time.ZoneId

/** Notification-only delivery is native, durable, and independent of WebView or network. */
object PrayerNotifications {
    private fun prefs(c: Context) = c.getSharedPreferences("prayer_notifications_v1", Context.MODE_PRIVATE)
    fun settings(c: Context): JSONObject = try { JSONObject(prefs(c).getString("settings", "{}")) } catch (_: Exception) { JSONObject() }
    fun selected(c: Context, id: String): Boolean {
        val s = settings(c)
        return id in PrayerTimes.ids && s.optBoolean("enabled") && (s.optJSONObject("prayers")?.optBoolean(id, true) ?: true)
    }
    fun title(id: String, friday: Boolean = false) = "حان موعد صلاة " + (if (friday || id == "fridaySecond") "الجمعة" else PrayerTimes.names[id] ?: "الصلاة")
    fun configure(c: Context, json: String) {
        val incoming = try { JSONObject(json) } catch (_: Exception) { return }
        val old = settings(c); val prayers = JSONObject(); val edit = prefs(c).edit()
        for (id in PrayerTimes.ids) {
            val checked = incoming.optJSONObject("prayers")?.optBoolean(id, true) ?: true
            prayers.put(id, checked)
            if (incoming.optBoolean("enabled") && checked && (!old.optBoolean("enabled") || old.optJSONObject("prayers")?.optBoolean(id, true) == false)) edit.putLong("enabledAt_$id", System.currentTimeMillis())
        }
        val clean = JSONObject().put("enabled", incoming.optBoolean("enabled")).put("volume", incoming.optInt("volume", 65).coerceIn(0, 100)).put("prayers", prayers)
        edit.putString("settings", clean.toString()).commit()
        // An enabled notification must not stop or replace an independently enabled adhan.
        // A phone notification may sound while the separately enabled alarm rings. Never cancel it.
        if (!clean.optBoolean("enabled")) c.stopService(Intent(c, PrayerNotificationSoundService::class.java))
        AdhanSchedule.schedule(c); PrayerAlarm.schedule(c)
    }
    private fun pi(c: Context, slot: Int, action: String, id: String = "", at: Long = 0, friday: Boolean = false) = PendingIntent.getBroadcast(c, slot,
        Intent(c, PrayerNotificationReceiver::class.java).setAction(action).putExtra("id", id).putExtra("at", at).putExtra("friday", friday), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    @Synchronized fun schedule(c: Context) {
        val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        for (i in 0..39) am.cancel(pi(c, 78000 + i, "DUE"))
        am.cancel(pi(c, 78990, "REFRESH"))
        if (!settings(c).optBoolean("enabled") || (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms())) return
        val now = System.currentTimeMillis()
        PrayerTimes.events(c).forEachIndexed { i, e ->
            if (i < 40 && e.at > now && selected(c, e.id) && !FridaySchedule.suppress(c, e.id, e.at))
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, e.at, pi(c, 78000 + i, "DUE", e.id, e.at, e.friday))
        }
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, LocalDate.now().plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli(), pi(c, 78990, "REFRESH"))
    }
    @Synchronized fun claim(c: Context, id: String, at: Long): Boolean {
        if (!selected(c, id) || FridaySchedule.suppress(c, id, at) || System.currentTimeMillis() - at !in 0L until 120000L || at < prefs(c).getLong("enabledAt_$id", 0)) return false
        if (prefs(c).getLong("delivered_$id", 0) == at) return false
        return prefs(c).edit().putLong("delivered_$id", at).commit()
    }
    fun notification(c: Context, id: String, friday: Boolean, preview: Boolean = false): Notification {
        val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // Android owns the channel sound and lock-screen behavior: use the ringtone
        // chosen by the user in the phone's notification settings, not a bundled tone.
        nm.createNotificationChannel(NotificationChannel("prayer_due_system_v2", "إشعار أوقات الصلاة", NotificationManager.IMPORTANCE_HIGH).apply {
            enableLights(true)
            enableVibration(true)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        })
        val screenAlert = !preview && selected(c, id) && PhoneScreenAlerts.enabled(c)
        val fullIntent=Intent(c,AdhanScreenActivity::class.java)
            .putExtra("reminderMessage",title(id,friday))
            .putExtra("prayerId",id)
            .putExtra("notificationOnly",true)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val full=PendingIntent.getActivity(c,78150+PrayerTimes.ids.indexOf(id).coerceAtLeast(0),
            fullIntent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val tap=if(screenAlert)full else PendingIntent.getActivity(c,78991,
            Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE)
        val alert=Notification.Builder(c, "prayer_due_system_v2")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(if (preview) "تجربة صوت الإشعار" else title(id, friday))
            .setContentText("أوقات الصلاة في الحويجة")
            .setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setPriority(Notification.PRIORITY_MAX)
            .setAutoCancel(true)
            .setContentIntent(tap)
        // An explicit prayer notification is allowed to wake the phone ONLY
        // when the user opted into that prayer AND enabled screen illumination.
        // It never starts or stops the independent adhan recording.
        if(screenAlert) alert.setFullScreenIntent(full,true)
        return alert.build()
    }
    fun start(c: Context, id: String, friday: Boolean = false, preview: Boolean = false) {
        // Never play a second application-generated tone on top of Android's
        // selected notification sound. Disabled prayers remain silent.
        if (!preview && !selected(c, id)) return
        val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(78100 + PrayerTimes.ids.indexOf(id).coerceAtLeast(0), notification(c, id, friday, preview))
    }
}

class PrayerNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        if (i.action == "REFRESH") { PrayerNotifications.schedule(c); return }
        val id = i.getStringExtra("id") ?: return
        if (PrayerNotifications.claim(c, id, i.getLongExtra("at", 0))) PrayerNotifications.start(c, id, i.getBooleanExtra("friday", false))
        PrayerNotifications.schedule(c)
    }
}

class PrayerNotificationSoundService : Service() {
    private var player: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    override fun onBind(i: Intent?) = null
    override fun onStartCommand(i: Intent?, flags: Int, startId: Int): Int {
        val id = i?.getStringExtra("id") ?: return START_NOT_STICKY
        val preview = i.getBooleanExtra("preview", false)
        if (!preview && !PrayerNotifications.selected(this, id)) { stopSelf(); return START_NOT_STICKY }
        player?.release(); handler.removeCallbacksAndMessages(null)
        startForeground(78100 + PrayerTimes.ids.indexOf(id).coerceAtLeast(0), PrayerNotifications.notification(this, id, i.getBooleanExtra("friday", false), preview))
        try {
            val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
            player = MediaPlayer.create(this, R.raw.prayer_notification, attrs, 0)?.apply {
                val v = PrayerNotifications.settings(this@PrayerNotificationSoundService).optInt("volume", 65).coerceIn(0, 100) / 100f
                setVolume(v, v); setOnCompletionListener { stopSelf() }; start()
            }
        } catch (e: Exception) { android.util.Log.w("PrayerNotice", "Cannot play notification tone", e) }
        handler.postDelayed({ stopSelf() }, 3000)
        return START_NOT_STICKY
    }
    override fun onDestroy() { handler.removeCallbacksAndMessages(null); player?.release(); player = null; stopForeground(STOP_FOREGROUND_DETACH); super.onDestroy() }
}
