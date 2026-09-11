package com.aoqat.calendar

import android.app.*
import android.content.*
import android.graphics.Color
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import org.json.JSONArray

object AlarmScheduler {
    private const val REQUEST_CODE = 45101
    private const val DELAY_MINUTES = 35L
    private const val SUPABASE_URL = "https://ytdvhiijxxaqofduorwm.supabase.co"
    private const val API_KEY = "sb_publishable_dQRoxdwRJDDgWLze1U4ZqA_aaVlKC-1"
    private const val LOCATION = "الحويجة وضواحيها"

    fun scheduleFromDatabase(context: Context) {
        Thread {
            try {
                var date = LocalDate.now()
                var target = targetForDate(date)
                if (target != null && target.isBefore(LocalDateTime.now().plusSeconds(5))) {
                    date = date.plusDays(1)
                    target = targetForDate(date)
                }
                if (target != null) scheduleExact(context, target)
            } catch (_: Exception) { }
        }.start()
    }

    fun scheduleSnooze(context: Context, minutes: Long = 10L) {
        val target = System.currentTimeMillis() + minutes * 60_000L
        scheduleExactMillis(context, target)
    }

    private fun targetForDate(date: LocalDate): LocalDateTime? {
        val isha = fetchIsha(date) ?: return null
        val parts = isha.split(":")
        if (parts.size < 2) return null
        var hour = parts[0].toIntOrNull() ?: return null
        val minute = parts[1].take(2).toIntOrNull() ?: return null
        if (hour < 12) hour += 12
        return date.atTime(hour, minute).plusMinutes(DELAY_MINUTES)
    }

    private fun fetchIsha(date: LocalDate): String? {
        val loc = URLEncoder.encode(LOCATION, "UTF-8")
        val url = URL("$SUPABASE_URL/rest/v1/annual_prayer_times?select=isha&location_name=eq.$loc&gregorian_month=eq.${date.monthValue}&gregorian_day=eq.${date.dayOfMonth}&limit=1")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 8000
            requestMethod = "GET"
            setRequestProperty("apikey", API_KEY)
            setRequestProperty("Authorization", "Bearer $API_KEY")
        }
        return try {
            if (conn.responseCode !in 200..299) return null
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val arr = JSONArray(body)
            if (arr.length() == 0) null else arr.getJSONObject(0).optString("isha").ifBlank { null }
        } finally {
            conn.disconnect()
        }
    }

    private fun scheduleExact(context: Context, target: LocalDateTime) {
        val millis = target.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        scheduleExactMillis(context, millis)
    }

    private fun scheduleExactMillis(context: Context, millis: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java)
        val pending = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) return
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, millis, pending)
    }
}

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        AlarmSoundService.start(context)
        AlarmUi.showFullScreenNotification(context)
        AlarmScheduler.scheduleFromDatabase(context)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        AlarmScheduler.scheduleFromDatabase(context)
    }
}

object AlarmUi {
    const val CHANNEL_ID = "prayer_publish_alarm_v1"
    const val NOTIFICATION_ID = 45101

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
        val channel = NotificationChannel(CHANNEL_ID, "تنبيه نشر مواقيت الصلاة", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "تنبيه تبديل مواقيت اليوم التالي"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 800, 300, 800, 300, 1200)
            setSound(sound, attrs)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        manager.createNotificationChannel(channel)
    }

    fun showFullScreenNotification(context: Context) {
        ensureChannel(context)
        val fullIntent = Intent(context, AlarmActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val fullPending = PendingIntent.getActivity(context, 45102, fullIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val stopIntent = Intent(context, AlarmActionReceiver::class.java).setAction("STOP")
        val snoozeIntent = Intent(context, AlarmActionReceiver::class.java).setAction("SNOOZE")
        val stopPending = PendingIntent.getBroadcast(context, 45103, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val snoozePending = PendingIntent.getBroadcast(context, 45104, snoozeIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("⏰ مواقيت الغد جاهزة")
            .setContentText("تم تبديل التوقيت إلى اليوم التالي. انشر المواقيت.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullPending, true)
            .addAction(0, "غفوة 10 دقائق", snoozePending)
            .addAction(0, "إيقاف التنبيه", stopPending)
            .build()
        (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIFICATION_ID, notification)
    }

    fun dismiss(context: Context) {
        (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(NOTIFICATION_ID)
    }
}

class AlarmActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        when (intent?.action) {
            "SNOOZE" -> {
                AlarmSoundService.stop(context)
                AlarmUi.dismiss(context)
                AlarmScheduler.scheduleSnooze(context, 10)
            }
            else -> {
                AlarmSoundService.stop(context)
                AlarmUi.dismiss(context)
            }
        }
    }
}

class AlarmSoundService : Service() {
    private var player: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var vibrator: Vibrator? = null

    override fun onCreate() {
        super.onCreate()
        AlarmUi.ensureChannel(this)
        val notification = NotificationCompat.Builder(this, AlarmUi.CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("⏰ تنبيه مواقيت الغد")
            .setContentText("انشر مواقيت اليوم التالي")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .build()
        startForeground(AlarmUi.NOTIFICATION_ID + 1, notification)

        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "aoqat:alarm").apply { acquire(15 * 60_000L) }

        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        player = MediaPlayer().apply {
            setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
            setDataSource(this@AlarmSoundService, uri)
            isLooping = true
            prepare()
            start()
        }

        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        val pattern = longArrayOf(0, 800, 300, 800, 300, 1200)
        if (Build.VERSION.SDK_INT >= 26) vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0)) else @Suppress("DEPRECATION") vibrator?.vibrate(pattern, 0)
    }

    override fun onDestroy() {
        player?.stop(); player?.release(); player = null
        vibrator?.cancel(); wakeLock?.release(); wakeLock = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        fun start(context: Context) {
            val i = Intent(context, AlarmSoundService::class.java)
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(i) else context.startService(i)
        }
        fun stop(context: Context) { context.stopService(Intent(context, AlarmSoundService::class.java)) }
    }
}

class AlarmActivity : Activity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(42, 70, 42, 70)
            setBackgroundColor(Color.rgb(8, 31, 43))
        }
        val title = TextView(this).apply {
            text = "⏰ مواقيت الغد جاهزة"
            textSize = 30f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }
        val body = TextView(this).apply {
            text = "تم تبديل التوقيت إلى اليوم التالي\nانشر المواقيت الآن"
            textSize = 20f
            setTextColor(Color.LTGRAY)
            gravity = Gravity.CENTER
            setPadding(0, 30, 0, 50)
        }
        val snooze = Button(this).apply {
            text = "غفوة 10 دقائق"
            textSize = 18f
            setOnClickListener {
                AlarmSoundService.stop(this@AlarmActivity)
                AlarmUi.dismiss(this@AlarmActivity)
                AlarmScheduler.scheduleSnooze(this@AlarmActivity, 10)
                finish()
            }
        }
        val stop = Button(this).apply {
            text = "إيقاف التنبيه"
            textSize = 18f
            setOnClickListener {
                AlarmSoundService.stop(this@AlarmActivity)
                AlarmUi.dismiss(this@AlarmActivity)
                finish()
            }
        }
        root.addView(title, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(body, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(snooze, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(stop, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        setContentView(root)
    }
}
