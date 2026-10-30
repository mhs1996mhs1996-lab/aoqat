package com.aoqat.calendar

import android.app.*
import android.content.*
import android.graphics.Color
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
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
import org.json.JSONArray

object AlarmScheduler {
    private const val REQUEST_CODE = 45101
    private const val DELAY_MINUTES = 35L
    private const val SUPABASE_URL = "https://ytdvhiijxxaqofduorwm.supabase.co"
    private const val API_KEY = "sb_publishable_dQRoxdwRJDDgWLze1U4ZqA_aaVlKC-1"
    private const val LOCATION = "الحويجة وضواحيها"

    private fun prefs(c:Context)=c.getSharedPreferences("publish_alarm_settings",Context.MODE_PRIVATE)
    fun enabled(c:Context)=prefs(c).getBoolean("enabled",false)
    fun snoozeMinutes(c:Context)=prefs(c).getInt("snoozeMinutes",10).coerceIn(1,30)
    fun setSnoozeMinutes(c:Context,minutes:Int){prefs(c).edit().putInt("snoozeMinutes",minutes.coerceIn(1,30)).commit()}
    @Synchronized fun migrate(c:Context,legacy:Boolean):Boolean{if(!prefs(c).contains("enabled")){prefs(c).edit().putBoolean("enabled",false).commit()};return enabled(c)}
    @Synchronized fun setEnabled(c:Context,on:Boolean){prefs(c).edit().putBoolean("enabled",on).commit();if(on)scheduleFromDatabase(c)else {prefs(c).edit().remove("snoozeUntil").commit();cancel(c)}}
    @Synchronized fun claim(c:Context,at:Long):Boolean {
        if(!enabled(c)||at<=0||System.currentTimeMillis()-at !in 0 until 120000L||prefs(c).getLong("delivered",0)==at)return false
        return prefs(c).edit().putLong("delivered",at).remove("snoozeUntil").commit()
    }

    @Synchronized fun scheduleFromDatabase(context: Context) {
        if(!enabled(context)){cancel(context);return}
        Thread {
            try {
                var date = LocalDate.now()
                var target = targetForDate(context, date)
                if (target != null && target.isBefore(LocalDateTime.now().plusSeconds(5))) {
                    date = date.plusDays(1)
                    target = targetForDate(context, date)
                }
                if (target != null) scheduleExact(context, target)
            } catch (_: Exception) { }
        }.start()
    }

    @Synchronized fun cancel(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java)
        val pending = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
        if (pending != null) {
            alarmManager.cancel(pending)
            pending.cancel()
        }
        AlarmSoundService.stop(context)
    }

    @Synchronized fun scheduleSnooze(context: Context, minutes: Long = snoozeMinutes(context).toLong()) {
        if(!enabled(context))return
        val until=System.currentTimeMillis()+minutes.coerceIn(1,30)*60_000L
        prefs(context).edit().putLong("snoozeUntil",until).commit()
        scheduleExactMillis(context,until)
    }

    private fun targetForDate(context: Context, date: LocalDate): LocalDateTime? {
        val rows = PrayerTimes.rows(context)
        val isha = (0 until rows.length()).mapNotNull { rows.optJSONObject(it) }.firstOrNull { it.optInt("gregorian_month") == date.monthValue && it.optInt("gregorian_day") == date.dayOfMonth }?.optString("isha")?.takeIf { it.isNotBlank() } ?: return null
        val parts = isha.split(":")
        if (parts.size < 2) return null
        var hour = parts[0].toIntOrNull() ?: return null
        val minute = parts[1].take(2).toIntOrNull() ?: return null
        if (hour < 12) hour += 12
        return date.atTime(hour, minute).plusMinutes(DELAY_MINUTES)
    }

    @Synchronized private fun scheduleExact(context: Context, target: LocalDateTime) {
        val snooze=prefs(context).getLong("snoozeUntil",0)
        scheduleExactMillis(context, if(snooze>System.currentTimeMillis())snooze else target.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
    }

    @Synchronized private fun scheduleExactMillis(context: Context, millis: Long) {
        if(!enabled(context))return
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).putExtra("at",millis)
        val pending = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) return
        val show=PendingIntent.getActivity(context,REQUEST_CODE,Intent(context,MainActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(millis,show),pending)
    }
}

object IqamaNativeScheduler {
    private const val BASE_REQUEST = 46000
    private const val REFRESH_REQUEST = 45999
    private val prayers = listOf("fajr" to 20L, "dhuhr" to 10L, "asr" to 10L, "maghrib" to 10L, "isha" to 10L)
    private fun prefs(context: Context) = context.getSharedPreferences("iqama_schedule", Context.MODE_PRIVATE)
    fun enabled(context: Context) = prefs(context).getBoolean("enabled", false)
    fun durations(context: Context, prayerId: String): IqamaCycle.Durations {
        fun read(key: String, fallback: Int): Int {
            val values = try { org.json.JSONObject(prefs(context).getString(key, "{}")) } catch (_: Exception) { org.json.JSONObject() }
            return IqamaCycle.minutes(values.optInt(prayerId, fallback), fallback)
        }
        return IqamaCycle.Durations(read("minutes", if (prayerId == "fajr") 20 else 10), read("afterMinutes", 10))
    }

    fun configure(context: Context, enabled: Boolean, minutes: String, afterMinutes: String = "{}") {
        val settings = try { org.json.JSONObject(minutes) } catch (_: Exception) { org.json.JSONObject() }
        val after = try { org.json.JSONObject(afterMinutes) } catch (_: Exception) { org.json.JSONObject() }
        prefs(context).edit().putBoolean("enabled", enabled).putString("minutes", settings.toString())
            .putString("afterMinutes", after.toString()).commit()
        AdhanSchedule.schedule(context)
        CommunityReminders.refresh(context)
        if (!PrayerAlarmAudio.running) PrayerAlarmAudio.restore(context)
        PrayerAlarm.schedule(context)
        if (!enabled) {
            cancel(context)
            IqamaPersistentNotification.hide(context)
        } else {
            val state = context.getSharedPreferences("iqama_service_state", Context.MODE_PRIVATE)
            val prayerId = state.getString("prayerId", "") ?: ""
            if (state.getBoolean("active", false)) {
                if (prayerId.isBlank()) IqamaPersistentNotification.hide(context)
                else IqamaPersistentNotification.startCycle(context, state.getLong("prayerAt", 0L), prayerId)
            }
            schedule(context)
        }
    }

    // Cached alarms are restored synchronously, including from boot receivers.
    // Network access only refreshes the cache; a prayer alarm never needs the network.
    fun schedule(context: Context) {
        if (!enabled(context)) return
        scheduleCached(context)
        Thread { refresh(context) }.start()
    }

    fun refresh(context: Context) {
        OfflinePrayerSync.install(context)
        OfflinePrayerSync.refresh(context)
        scheduleCached(context)
        AdhanSchedule.schedule(context)
        PrayerAlarm.schedule(context)
        PrayerWidget.update(context)
    }

    @Synchronized fun scheduleCached(context: Context, recoverActive: Boolean = true) {
        if (!enabled(context)) return
        val rows = PrayerTimes.rows(context)
        val today = LocalDate.now()
        val now = System.currentTimeMillis()
        for (offset in 0L..7L) {
            val date = today.plusDays(offset)
            val row = (0 until rows.length()).map { rows.getJSONObject(it) }.firstOrNull {
                it.optInt("gregorian_month") == date.monthValue && it.optInt("gregorian_day") == date.dayOfMonth
            } ?: continue
            prayers.forEachIndexed { index, prayer ->
                val time = PrayerTimes.minutes(row.optString(prayer.first), prayer.first) ?: return@forEachIndexed
                val hour = time / 60; val minute = time % 60
                val prayerAt = date.atTime(hour, minute).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                if(FridaySchedule.suppress(context,prayer.first,prayerAt)){
                    cancelAlarm(context,BASE_REQUEST+date.dayOfYear*10+index,Intent(context,IqamaNotificationReceiver::class.java).setAction("NATIVE_START"));return@forEachIndexed
                }
                val endAt = prayerAt + durations(context, prayer.first).totalMs
                val request = BASE_REQUEST + date.dayOfYear * 10 + index
                val intent = Intent(context, IqamaNotificationReceiver::class.java).setAction("NATIVE_START")
                    .putExtra("prayerAt", prayerAt).putExtra("prayerId", prayer.first)
                if (prayerAt > now || (recoverActive && endAt > now)) {
                    // Recover an ongoing cycle after reboot, upgrade or a permission grant.
                    setAlarm(context, request, intent, maxOf(prayerAt, now + 1000L))
                } else cancelAlarm(context, request, intent)
            }
        }
        val nextDay = today.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        setAlarm(context, REFRESH_REQUEST, Intent(context, IqamaNotificationReceiver::class.java).setAction("REFRESH"), nextDay)
    }

    private fun setAlarm(context: Context, request: Int, intent: Intent, at: Long) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = PendingIntent.getBroadcast(context, request, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()) {
            if (intent.action == "NATIVE_START") {
                // User-enabled prayer reminders must wake the device and grant the
                // receiver permission to start the countdown service while backgrounded.
                val show = PendingIntent.getActivity(context, request,
                    Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                am.setAlarmClock(AlarmManager.AlarmClockInfo(at, show), pi)
            } else am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        } else {
            // An inexact alarm is not a valid replacement for a prayer deadline:
            // it can be delayed and cannot authorize a background foreground service.
            android.util.Log.w("IqamaScheduler", "Exact alarm access required; reschedule on permission grant")
        }
    }

    private fun cancelAlarm(context: Context, request: Int, intent: Intent) {
        val pi = PendingIntent.getBroadcast(context, request, intent, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE) ?: return
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pi)
        pi.cancel()
    }

    private fun cancel(context: Context) {
        cancelAlarm(context, REFRESH_REQUEST, Intent(context, IqamaNotificationReceiver::class.java).setAction("REFRESH"))
        for (day in 1..366) for (index in prayers.indices) {
            cancelAlarm(context, BASE_REQUEST + day * 10 + index, Intent(context, IqamaNotificationReceiver::class.java).setAction("NATIVE_START"))
        }
    }
}

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if(!AlarmScheduler.claim(context,intent?.getLongExtra("at",0)?:0))return
        AlarmSoundService.start(context)
        AlarmUi.showFullScreenNotification(context)
        try {
            context.startActivity(Intent(context, AlarmActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            })
        } catch (_: Exception) { }
        AlarmScheduler.scheduleFromDatabase(context)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED || intent?.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            AlarmScheduler.scheduleFromDatabase(context)
        }
        OfflinePrayerSync.install(context)
        IqamaNativeScheduler.scheduleCached(context)
        AdhanSchedule.schedule(context)
        PrayerAlarm.schedule(context)
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED) AdhanPlaybackService.restoreVolume(context)
        AdhanPlaybackService.restoreRingerIfExpired(context)
        PrayerWidget.update(context)
        if (AdhanSchedule.settings(context).optBoolean("persistent")) NextPrayerService.start(context)
        val pending = goAsync()
        Thread { try { IqamaNativeScheduler.refresh(context);CommunityReminders.refreshNow(context) } finally { pending.finish() } }.start()
    }
}

object AlarmUi {
    const val CHANNEL_ID = "prayer_publish_alarm_screen_v3"
    const val NOTIFICATION_ID = 45101

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val channel = NotificationChannel(CHANNEL_ID, "تنبيه نشر مواقيت الصلاة", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "منبه نشر مواقيت اليوم التالي"
            enableVibration(false)
            setSound(null, null)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        manager.createNotificationChannel(channel)
    }

    fun buildAlarmNotification(context: Context): Notification {
        ensureChannel(context)

        val fullIntent = Intent(context, AlarmActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val fullPending = PendingIntent.getActivity(context, 45102, fullIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        val stopIntent = Intent(context, AlarmActionReceiver::class.java).setAction("STOP")
        val snoozeIntent = Intent(context, AlarmActionReceiver::class.java).setAction("SNOOZE")
        val stopPending = PendingIntent.getBroadcast(context, 45103, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val snoozePending = PendingIntent.getBroadcast(context, 45104, snoozeIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("⏰ مواقيت الغد جاهزة")
            .setContentText("اضغط إيقاف التنبيه أو غفوة ${AlarmScheduler.snoozeMinutes(context)} دقائق")
            .setStyle(NotificationCompat.BigTextStyle().bigText("تم تبديل التوقيت إلى اليوم التالي. اختر إيقاف التنبيه أو غفوة ${AlarmScheduler.snoozeMinutes(context)} دقائق."))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setDeleteIntent(stopPending)
            .setContentIntent(fullPending)
            .setFullScreenIntent(fullPending, true)
            .addAction(android.R.drawable.ic_lock_idle_alarm, "غفوة ${AlarmScheduler.snoozeMinutes(context)} دقائق", snoozePending)
            .addAction(android.R.drawable.ic_media_pause, "إيقاف التنبيه", stopPending)
            .build()
    }

    fun showFullScreenNotification(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildAlarmNotification(context))
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
                AlarmScheduler.scheduleSnooze(context)
            }
            else -> {
                AlarmSoundService.stop(context)
                AlarmUi.dismiss(context)
            }
        }
    }
}

class AlarmSoundService : Service() {
    private var ringing=false
    private var screenHandled=false
    private var adjustedAlarmVolume=false
    private val screenOff=object:BroadcastReceiver(){override fun onReceive(c:Context,i:Intent){
        if(i.action==Intent.ACTION_SCREEN_OFF&&ringing&&!screenHandled&&AlarmScheduler.enabled(c)){
            screenHandled=true
            AlarmActionReceiver().onReceive(this@AlarmSoundService,
                Intent(this@AlarmSoundService,AlarmActionReceiver::class.java).setAction("SNOOZE"))
        }
    }}
    override fun onCreate(){super.onCreate();if(Build.VERSION.SDK_INT>=33)registerReceiver(screenOff,IntentFilter(Intent.ACTION_SCREEN_OFF),RECEIVER_NOT_EXPORTED)else @Suppress("DEPRECATION") registerReceiver(screenOff,IntentFilter(Intent.ACTION_SCREEN_OFF))}
    private var player: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var vibrator: Vibrator? = null
    private val stopHandler = Handler(Looper.getMainLooper())
    private val safetyStop = Runnable { stopSelf() }

    override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
        if(!AlarmScheduler.enabled(this)||intent?.action=="STOP"){stopSelf();return START_NOT_STICKY}
        if(player!=null)return START_NOT_STICKY
        AlarmUi.ensureChannel(this)
        startForeground(AlarmUi.NOTIFICATION_ID, AlarmUi.buildAlarmNotification(this))
        ringing=true
        screenHandled=false
        if(!PrayerAlarmAudio.running){
            PrayerAlarmAudio.ensureAudible(this)
            adjustedAlarmVolume=true
        }
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "aoqat:alarm").apply { acquire(15 * 60_000L) }

        val attrs=AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
        try {
            val uri=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: throw IllegalStateException("No system alarm tone")
            player=MediaPlayer().apply{
                setAudioAttributes(attrs)
                setDataSource(this@AlarmSoundService,uri)
                isLooping=true
                prepare()
                start()
            }
        } catch(e:Exception) {
            android.util.Log.w("PublishAlarm","System alarm tone failed, using bundled offline sound",e)
            try{player?.release()}catch(_:Exception){}
            player=MediaPlayer.create(this,R.raw.prayer_alarm_fallback,attrs,0)?.apply{
                isLooping=true
                start()
            }
            if(player==null)android.util.Log.e("PublishAlarm","Unable to play bundled fallback alarm")
        }

        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        val pattern = longArrayOf(0, 800, 300, 800, 300, 1200)
        if (Build.VERSION.SDK_INT >= 26) {
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(pattern, 0)
        }

        // حماية احتياطية حتى لا يبقى الصوت يعمل بلا نهاية إذا منع النظام ظهور الواجهة.
        stopHandler.postDelayed(safetyStop, 15 * 60_000L)
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        ringing=false
        screenHandled=true
        try{unregisterReceiver(screenOff)}catch(_:Exception){}
        stopHandler.removeCallbacks(safetyStop)
        try { player?.stop() } catch (_: Exception) { }
        player?.release(); player = null
        vibrator?.cancel()
        if (wakeLock?.isHeld == true) wakeLock?.release()
        wakeLock = null
        if(adjustedAlarmVolume){
            adjustedAlarmVolume=false
            PrayerAlarmAudio.restore(this)
        }
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE) else @Suppress("DEPRECATION") stopForeground(true)
        AlarmUi.dismiss(this)
        sendBroadcast(Intent(STOPPED).setPackage(packageName))
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val STOPPED="com.aoqat.calendar.PUBLISH_ALARM_STOPPED"
        fun start(context: Context) {
            if(!AlarmScheduler.enabled(context))return
            val i = Intent(context, AlarmSoundService::class.java)
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(i) else context.startService(i)
        }

        fun stop(context: Context) {
            context.sendBroadcast(Intent(STOPPED).setPackage(context.packageName))
            context.stopService(Intent(context, AlarmSoundService::class.java))
            AlarmUi.dismiss(context)
        }
    }
}

class AlarmActivity : Activity() {
    private var snoozed=false
    private fun snooze(){if(snoozed||!AlarmScheduler.enabled(this))return;snoozed=true;AlarmActionReceiver().onReceive(this,Intent(this,AlarmActionReceiver::class.java).setAction("SNOOZE"));finish()}
    override fun onKeyDown(code:Int,event:android.view.KeyEvent):Boolean{
        if(code==android.view.KeyEvent.KEYCODE_VOLUME_UP||code==android.view.KeyEvent.KEYCODE_VOLUME_DOWN){snooze();return true}
        return super.onKeyDown(code,event)
    }
    override fun dispatchKeyEvent(event:android.view.KeyEvent):Boolean{
        if(event.keyCode==android.view.KeyEvent.KEYCODE_VOLUME_UP||
           event.keyCode==android.view.KeyEvent.KEYCODE_VOLUME_DOWN){
            if(event.action==android.view.KeyEvent.ACTION_DOWN&&event.repeatCount==0)snooze()
            return true
        }
        return super.dispatchKeyEvent(event)
    }
    private val stopped=object:BroadcastReceiver(){override fun onReceive(c:Context,i:Intent){finish()}}
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)

        if(Build.VERSION.SDK_INT>=33)registerReceiver(stopped,IntentFilter(AlarmSoundService.STOPPED),RECEIVER_NOT_EXPORTED)else @Suppress("DEPRECATION") registerReceiver(stopped,IntentFilter(AlarmSoundService.STOPPED))
        if(!AlarmScheduler.enabled(this)){finish();return}

        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(42, 70, 42, 70)
            background=android.graphics.drawable.GradientDrawable(android.graphics.drawable.GradientDrawable.Orientation.TL_BR,intArrayOf(0xff083130.toInt(),0xff0e4c42.toInt(),0xff052024.toInt()))
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
            text = "غفوة ${AlarmScheduler.snoozeMinutes(this@AlarmActivity)} دقائق"
            textSize = 18f
            setOnClickListener { snooze() }
        }
        val stop = Button(this).apply {
            text = "إيقاف التنبيه"
            textSize = 18f
            setOnClickListener {
                AlarmSoundService.stop(this@AlarmActivity)
                finish()
            }
        }
        root.addView(android.widget.TextClock(this).apply{
            format12Hour="h:mm";format24Hour="HH:mm";textSize=80f;gravity=Gravity.CENTER
            setTextColor(0xfff9f1d5.toInt());setPadding(0,0,0,32)
        },ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(TextView(this).apply{
            text=java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("EEEE، d MMMM",java.util.Locale("ar")))
            textSize=20f;gravity=Gravity.CENTER;setTextColor(Color.WHITE);setPadding(0,0,0,36)
        },ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(title, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(body, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(snooze, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        root.addView(stop, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        setContentView(root)
    }
    @Deprecated("Deprecated in Java") override fun onBackPressed(){AlarmSoundService.stop(this);super.onBackPressed()}
    override fun onDestroy(){unregisterReceiver(stopped);super.onDestroy()}
}


