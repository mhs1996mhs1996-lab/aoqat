package com.aoqat.calendar

import android.app.*
import android.content.*
import android.media.*
import android.os.*
import android.view.Gravity
import android.widget.*
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.time.*
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Native last-day-of-month publisher alarm, separate from daily prayer timings.
 * This only mirrors an explicit user-enabled calendar reminder from the web UI.
 */
object CalendarPublishAlarm {
    const val ID=96211
    const val CHANNEL="calendar_publish_alarm_v1"
    private const val REQUEST=96201
    private const val PREF="calendar_publish_alarm_native_v1"
    private fun prefs(c:Context)=c.getSharedPreferences(PREF,Context.MODE_PRIVATE)
    fun enabled(c:Context)=prefs(c).getBoolean("enabled",false)
    fun snoozeUntil(c:Context)=prefs(c).getLong("snoozeUntil",0)
    @Synchronized fun configure(c:Context,json:String){
        val data=try{JSONObject(json)}catch(_:Exception){return}
        val time=data.optString("time","09:00")
        if(!Regex("([01][0-9]|2[0-3]):[0-5][0-9]").matches(time))return
        prefs(c).edit().putBoolean("enabled",data.optBoolean("enabled",false)).putString("time",time)
            .apply{if(!data.optBoolean("enabled",false))remove("snoozeUntil")}.commit()
        schedule(c)
        if(!enabled(c)){c.stopService(Intent(c,CalendarPublishAlarmService::class.java));dismiss(c)}
    }
    @Synchronized fun stop(c:Context){
        prefs(c).edit().remove("snoozeUntil").commit()
        c.stopService(Intent(c,CalendarPublishAlarmService::class.java))
        dismiss(c)
        schedule(c)
    }
    @Synchronized fun snooze(c:Context){
        if(!enabled(c))return
        prefs(c).edit().putLong("snoozeUntil",System.currentTimeMillis()+10*60000L).commit()
        schedule(c)
        c.stopService(Intent(c,CalendarPublishAlarmService::class.java))
        show(c,true)
    }
    fun schedule(c:Context){
        val am=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent=Intent(c,CalendarPublishAlarmReceiver::class.java).setAction("DUE")
        val pi=PendingIntent.getBroadcast(c,REQUEST,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        am.cancel(pi)
        if(!enabled(c))return
        if(Build.VERSION.SDK_INT>=31 && !am.canScheduleExactAlarms())return
        val now=ZonedDateTime.now(ZoneId.of("Asia/Baghdad"))
        val time=try{LocalTime.parse(prefs(c).getString("time","09:00") ?: "09:00")}catch(_:Exception){LocalTime.of(9,0)}
        var day=now.toLocalDate().withDayOfMonth(now.toLocalDate().lengthOfMonth())
        var event=day.atTime(time).atZone(now.zone)
        if(!event.isAfter(now)) {
            day=now.toLocalDate().plusMonths(1).withDayOfMonth(now.toLocalDate().plusMonths(1).lengthOfMonth())
            event=day.atTime(time).atZone(now.zone)
        }
        val snooze=snoozeUntil(c).takeIf{it>System.currentTimeMillis()}
        val at=snooze?:event.toInstant().toEpochMilli()
        val show=PendingIntent.getActivity(c,REQUEST,Intent(c,MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        am.setAlarmClock(AlarmManager.AlarmClockInfo(at,show),pi)
    }
    private fun action(c:Context,name:String):PendingIntent = PendingIntent.getBroadcast(c,
        if(name=="STOP")96212 else 96213,
        Intent(c,CalendarPublishAlarmReceiver::class.java).setAction(name),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun notification(c:Context,snoozed:Boolean):Notification{
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(NotificationChannel(CHANNEL,"منبّه نشر التقويم الشهري",NotificationManager.IMPORTANCE_HIGH).apply{
            setSound(null,null);enableVibration(false);lockscreenVisibility=Notification.VISIBILITY_PUBLIC
        })
        val title="📅 حان نشر تقويم الشهر القادم"
        val at=snoozeUntil(c)
        val state=if(snoozed&&at>System.currentTimeMillis())
            "غفوة حتى "+java.text.SimpleDateFormat("h:mm a",Locale("ar")).format(java.util.Date(at))
            else "منبّه تقويم نهاية الشهر يعمل"
        val stop=action(c,"STOP");val snooze=action(c,"SNOOZE")
        val view=AlarmNotificationControls.view(c,title,state,stop,snooze)
        val show=PendingIntent.getActivity(c,96214,Intent(c,CalendarPublishAlarmActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification=NotificationCompat.Builder(c,CHANNEL)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title).setContentText(state)
            .setCustomContentView(view).setCustomBigContentView(view)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setPriority(NotificationCompat.PRIORITY_MAX).setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setOngoing(true)
            .setAutoCancel(false).setOnlyAlertOnce(true).setContentIntent(show)
            .addAction(android.R.drawable.ic_media_pause,"إيقاف التنبيه",stop)
            .addAction(android.R.drawable.ic_lock_idle_alarm,"غفوة 10 دقائق",snooze)
        if(!snoozed&&PhoneScreenAlerts.enabled(c))notification.setFullScreenIntent(show,true)
        return notification.build()
    }
    fun show(c:Context,snoozed:Boolean){
        if(!enabled(c))return
        (c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(ID,notification(c,snoozed))
    }
    fun dismiss(c:Context){
        (c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(ID)
    }
}

class CalendarPublishAlarmReceiver:BroadcastReceiver(){
    override fun onReceive(c:Context,i:Intent?){
        when(i?.action){
            "STOP"->CalendarPublishAlarm.stop(c)
            "SNOOZE"->CalendarPublishAlarm.snooze(c)
            "DUE"->if(CalendarPublishAlarm.enabled(c)){
                c.getSharedPreferences("calendar_publish_alarm_native_v1",0).edit().remove("snoozeUntil").commit()
                CalendarPublishAlarm.schedule(c)
                ContextCompat.startForegroundService(c,Intent(c,CalendarPublishAlarmService::class.java))
            }
        }
    }
}

class CalendarPublishAlarmService:Service(){
    private var player:MediaPlayer?=null
    private val handler=Handler(Looper.getMainLooper())
    override fun onBind(i:Intent?):IBinder?=null
    override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int{
        if(!CalendarPublishAlarm.enabled(this)){stopSelf();return START_NOT_STICKY}
        startForeground(CalendarPublishAlarm.ID,CalendarPublishAlarm.notification(this,false))
        try {
            val uri=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            val attributes=AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
            player=MediaPlayer().apply{
                setAudioAttributes(attributes)
                setDataSource(this@CalendarPublishAlarmService,uri)
                isLooping=true
                prepare()
                start()
            }
        }catch(e:Exception){
            player?.release()
            player=MediaPlayer.create(this,R.raw.prayer_alarm_fallback)?.apply{isLooping=true;start()}
        }
        handler.postDelayed({stopSelf()},15*60000L)
        return START_NOT_STICKY
    }
    override fun onDestroy(){
        handler.removeCallbacksAndMessages(null)
        try{player?.stop()}catch(_:Exception){}
        player?.release();player=null
        stopForeground(STOP_FOREGROUND_REMOVE)
        if(CalendarPublishAlarm.enabled(this)&&CalendarPublishAlarm.snoozeUntil(this)>System.currentTimeMillis())
            CalendarPublishAlarm.show(this,true)
        else CalendarPublishAlarm.dismiss(this)
        super.onDestroy()
    }
}

class CalendarPublishAlarmActivity:Activity(){
    override fun onCreate(savedInstanceState:Bundle?){
        super.onCreate(savedInstanceState)
        PhoneScreenAlerts.applyWindow(this)
        val panel=LinearLayout(this).apply{
            orientation=LinearLayout.VERTICAL;gravity=Gravity.CENTER
            setPadding(32,48,32,48);setBackgroundColor(0xff0d514d.toInt())
        }
        val title=TextView(this).apply{
            text="📅 حان نشر تقويم الشهر القادم";textSize=25f
            setTextColor(android.graphics.Color.WHITE);gravity=Gravity.CENTER
        }
        panel.addView(title)
        for((label,action) in listOf("غفوة 10 دقائق" to "SNOOZE","إيقاف التنبيه" to "STOP")){
            panel.addView(Button(this).apply{
                text=label;setOnClickListener{
                    CalendarPublishAlarmReceiver().onReceive(this@CalendarPublishAlarmActivity,
                        Intent(this@CalendarPublishAlarmActivity,CalendarPublishAlarmReceiver::class.java).setAction(action))
                    finish()
                }
            })
        }
        setContentView(panel)
    }
}
