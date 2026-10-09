package com.aoqat.calendar

import android.app.*
import android.content.*
import android.media.AudioManager
import android.os.*
import org.json.JSONObject
import java.time.*

object FridaySchedule {
    fun config(c: Context): JSONObject = AdhanSchedule.settings(c).optJSONObject("friday") ?: JSONObject()
    fun enabled(c: Context) = config(c).optBoolean("enabled")
    fun suppress(c: Context,id: String,at: Long) = enabled(c) && id == "dhuhr" && Instant.ofEpochMilli(at).atZone(ZoneId.systemDefault()).dayOfWeek == DayOfWeek.FRIDAY
    fun timing(c: Context,at: Long): FridayCycle.Timing { val f=config(c);return FridayCycle.Timing(at,f.optInt("reminder",15),f.optInt("sermon",35)) }
    private fun pi(c: Context,id: Int,action: String,at: Long=0) = PendingIntent.getBroadcast(c,id,Intent(c,FridayReceiver::class.java).setAction(action).putExtra("at",at),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    private fun alarm(c: Context,id: Int,action: String,time: Long,at: Long) {
        val am=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if(Build.VERSION.SDK_INT>=31&&!am.canScheduleExactAlarms())return
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,time,pi(c,id,action,at))
    }
    @Synchronized fun schedule(c: Context) {
        val am=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        for(i in 0..59)am.cancel(pi(c,76000+i,"FRAME"))
        for(i in 0..9){am.cancel(pi(c,76100+i,"QUIET"));am.cancel(pi(c,76200+i,"END"))}
        for(i in 0..19){val id=76300+i;val p=PendingIntent.getBroadcast(c,id,Intent(c,AdhanReceiver::class.java).setAction("PLAY"),PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE);if(p!=null){am.cancel(p);p.cancel()}}
        restoreIfExpired(c)
        if(!enabled(c)){c.stopService(Intent(c,FridayNotificationService::class.java));restore(c);return}
        val now=System.currentTimeMillis();val f=config(c)
        val iq=c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE)
        if(iq.getBoolean("active",false)&&suppress(c,iq.getString("prayerId","")?:"",iq.getLong("prayerAt",0)))IqamaPersistentNotification.hide(c)
        val pa=PrayerAlarm.prefs(c);if(pa.getString("activeId","")=="dhuhr"&&LocalDate.now().dayOfWeek==DayOfWeek.FRIDAY)c.stopService(Intent(c,PrayerAlarmService::class.java))
        val activeQuiet=PrayerTimes.events(c).filter{it.friday}.firstOrNull{val t=timing(c,it.at);val before=if(f.optString("quietTiming")=="custom")f.optInt("quietBefore",15).coerceIn(0,180)else 15;now>=t.first-before*60000L&&now<t.end}
        if(activeQuiet==null||!f.optBoolean("quiet",true))restore(c)else quiet(c,activeQuiet.at)
        PrayerTimes.events(c).filter{it.friday}.forEachIndexed{index,p->
            val t=timing(c,p.at)
            if(t.end<=now)return@forEachIndexed
            // Exact phase alarms also recover a running phase after reboot or an edit.
            listOf(t.start,t.first,t.second).forEachIndexed{phase,time->if(time>now)alarm(c,76000+index*4+phase,"FRAME",time,p.at)}
            if(FridayCycle.frame(t,now)!=null)alarm(c,76000+index*4+3,"FRAME",now+100,p.at)
            alarm(c,76200+index,"END",t.end,p.at)
            val before=if(f.optString("quietTiming")=="custom")f.optInt("quietBefore",15).coerceIn(0,180) else 15
            if(f.optBoolean("quiet",true))alarm(c,76100+index,"QUIET",maxOf(t.first-before*60000L,now+100),p.at)
            for((n,id,time,key) in listOf(Adhan(0,"fridayFirst",t.first,"firstSound"),Adhan(1,"fridaySecond",t.second,"secondSound"))){
                val event=PrayerTimes.Prayer(id,time,true)
                if(f.optBoolean(key,true)&&time>now)AdhanSchedule.alarm(c,76300+index*2+n,"PLAY",time,event)
            }
        }
        if(!f.optBoolean("quiet",true))restore(c)
    }
    private data class Adhan(val n: Int,val id: String,val time: Long,val key: String)
    fun start(c: Context,at: Long){if(!enabled(c)||FridayCycle.frame(timing(c,at),System.currentTimeMillis())==null)return;IqamaPersistentNotification.ensureChannel(c);c.startForegroundService(Intent(c,FridayNotificationService::class.java).putExtra("at",at))}
    fun quiet(c: Context,at: Long){
        val f=config(c);val t=timing(c,at);if(!enabled(c)||!f.optBoolean("quiet",true)||System.currentTimeMillis()>=t.end)return
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager;if(!nm.isNotificationPolicyAccessGranted)return
        val am=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager;val p=c.getSharedPreferences("friday_quiet",Context.MODE_PRIVATE)
        try {
            if(!p.getBoolean("active",false))p.edit().putInt("ringer",am.ringerMode).putInt("filter",nm.currentInterruptionFilter).putBoolean("active",true).commit()
            // Restore our previous application before changing between the two modes.
            if(p.getString("mode","")!=f.optString("quietMode","silent")) { restore(c);p.edit().putInt("ringer",am.ringerMode).putInt("filter",nm.currentInterruptionFilter).putBoolean("active",true).commit() }
            val dnd=f.optString("quietMode")=="dnd"
            if(dnd)nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALARMS) else am.ringerMode=AudioManager.RINGER_MODE_SILENT
            p.edit().putString("mode",if(dnd)"dnd" else "silent").putLong("end",t.end).commit()
        }catch(_:SecurityException){restore(c)}
    }
    fun restoreIfExpired(c: Context){val p=c.getSharedPreferences("friday_quiet",Context.MODE_PRIVATE);if(p.getBoolean("active",false)&&p.getLong("end",0)<=System.currentTimeMillis())restore(c)}
    fun restore(c: Context){val p=c.getSharedPreferences("friday_quiet",Context.MODE_PRIVATE);if(!p.getBoolean("active",false))return
        val am=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager;val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        try {if(p.getString("mode","")=="dnd"){if(nm.isNotificationPolicyAccessGranted&&nm.currentInterruptionFilter==NotificationManager.INTERRUPTION_FILTER_ALARMS)nm.setInterruptionFilter(p.getInt("filter",NotificationManager.INTERRUPTION_FILTER_ALL))}else if(am.ringerMode==AudioManager.RINGER_MODE_SILENT)am.ringerMode=p.getInt("ringer",AudioManager.RINGER_MODE_NORMAL);p.edit().clear().commit()}catch(_:SecurityException){}
    }
}
class FridayReceiver: BroadcastReceiver(){override fun onReceive(c: Context,i: Intent){val at=i.getLongExtra("at",0);when(i.action){"FRAME"->FridaySchedule.start(c,at);"QUIET"->FridaySchedule.quiet(c,at);"END"->{val saved=c.getSharedPreferences("friday_cycle",Context.MODE_PRIVATE).getLong("at",0);if(saved==at)c.stopService(Intent(c,FridayNotificationService::class.java));FridaySchedule.restoreIfExpired(c)}}}}
class FridayNotificationService: Service(){
    private val handler=Handler(Looper.getMainLooper());private var at=0L;private var wake: PowerManager.WakeLock?=null
    private val update=Runnable{reconcile()}
    private val screen=object:BroadcastReceiver(){override fun onReceive(c:Context,i:Intent){reconcile()}}
    override fun onBind(i:Intent?)=null
    override fun onCreate(){super.onCreate();val f=IntentFilter().apply{addAction(Intent.ACTION_SCREEN_ON);addAction(Intent.ACTION_SCREEN_OFF)};if(Build.VERSION.SDK_INT>=33)registerReceiver(screen,f,RECEIVER_NOT_EXPORTED)else @Suppress("DEPRECATION") registerReceiver(screen,f)}
    private fun reconcile(){val now=System.currentTimeMillis();val frame=if(FridaySchedule.enabled(this))FridayCycle.frame(FridaySchedule.timing(this,at),now) else null
        if(frame==null){stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();return}
        val display=IqamaCycle.Display(if(frame.down)IqamaCycle.Phase.REMAINING else IqamaCycle.Phase.ELAPSED,SystemClock.elapsedRealtime()+frame.base-now,frame.down,SystemClock.elapsedRealtime()+frame.boundary-now)
        startForeground(IqamaPersistentNotification.NOTIFICATION_ID,IqamaNotificationRenderer.build(this,display,frame.title))
        handler.removeCallbacks(update);handler.postDelayed(update,(frame.boundary-now).coerceAtLeast(1))
    }
    override fun onStartCommand(i:Intent?,flags:Int,id:Int):Int{val p=getSharedPreferences("friday_cycle",MODE_PRIVATE);at=i?.getLongExtra("at",0)?.takeIf{it>0}?:p.getLong("at",0);p.edit().putLong("at",at).commit();val t=FridaySchedule.timing(this,at)
        wake?.let{if(it.isHeld)it.release()};if(t.end>System.currentTimeMillis())wake=(getSystemService(POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"aoqat:friday").apply{acquire((t.end-System.currentTimeMillis()).coerceAtLeast(1)+5000)}
        reconcile();return START_STICKY}
    override fun onDestroy(){handler.removeCallbacks(update);unregisterReceiver(screen);wake?.let{if(it.isHeld)it.release()};stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy()}
}
