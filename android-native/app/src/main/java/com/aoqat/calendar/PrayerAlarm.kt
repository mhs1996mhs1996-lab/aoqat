package com.aoqat.calendar

import android.app.*
import android.content.*
import android.media.*
import android.net.Uri
import android.os.*
import android.view.Gravity
import android.view.WindowManager
import android.widget.*
import androidx.core.content.ContextCompat
import org.json.*
import java.time.*

/** Independent alarm settings, pending intents and audio; no adhan/iqama preferences are changed. */
object PrayerAlarm {
    val ids=PrayerTimes.ids+"third"
    val names=PrayerTimes.names+mapOf("third" to "ثلث الليل الأخير")
    fun prefs(c:Context)=c.getSharedPreferences("prayer_alarm_v1",Context.MODE_PRIVATE)
    fun settings(c:Context):JSONObject=try{JSONObject(prefs(c).getString("settings","{}"))}catch(_:Exception){JSONObject()}
    fun item(c:Context,id:String)=settings(c).optJSONObject("items")?.optJSONObject(id)?:JSONObject()
    fun allowed(s:JSONObject,id:String,at:Long):Boolean {
        val p=s.optJSONObject("items")?.optJSONObject(id)?:return false
        if(!s.optBoolean("enabled")||!p.optBoolean("enabled"))return false
        if(p.optString("repeat")!="days")return true
        val day=Instant.ofEpochMilli(at).atZone(ZoneId.systemDefault()).dayOfWeek.value%7
        val days=p.optJSONArray("days")?:JSONArray();return (0 until days.length()).any{days.optInt(it,-1)==day}
    }
    fun events(c:Context,today:LocalDate=LocalDate.now()):List<PrayerTimes.Prayer>{
        val normal=PrayerTimes.events(c,today.minusDays(1));val out=normal.toMutableList()
        normal.filter{it.id=="maghrib"}.forEach{m->normal.firstOrNull{it.id=="fajr"&&Instant.ofEpochMilli(it.at).atZone(ZoneId.systemDefault()).toLocalDate()==Instant.ofEpochMilli(m.at).atZone(ZoneId.systemDefault()).toLocalDate().plusDays(1)}?.let{f->out.add(PrayerTimes.Prayer("third",m.at+(f.at-m.at)*2/3,false))}}
        return out.sortedBy{it.at}
    }
    fun configure(c:Context,json:String){val s=try{JSONObject(json)}catch(_:Exception){return};prefs(c).edit().putString("settings",s.toString()).commit();
        ids.forEach{if(!s.optBoolean("enabled")||s.optJSONObject("items")?.optJSONObject(it)?.optBoolean("enabled")!=true){cancel(c,71000+ids.indexOf(it));prefs(c).edit().remove("snooze_$it").apply()}}
        if(!s.optBoolean("enabled")||s.optJSONObject("items")?.optJSONObject(prefs(c).getString("activeId",""))?.optBoolean("enabled")!=true)c.stopService(Intent(c,PrayerAlarmService::class.java))
        schedule(c);Thread{IqamaNativeScheduler.refresh(c)}.start()
    }
    private fun pi(c:Context,slot:Int,intent:Intent,flags:Int=PendingIntent.FLAG_UPDATE_CURRENT)=PendingIntent.getBroadcast(c,slot,intent,flags or PendingIntent.FLAG_IMMUTABLE)
    private fun cancel(c:Context,slot:Int){val p=pi(c,slot,Intent(c,PrayerAlarmReceiver::class.java).setAction("RING"),PendingIntent.FLAG_NO_CREATE)?:return;(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(p);p.cancel()}
    private fun alarm(c:Context,slot:Int,id:String,at:Long,count:Int=0){val am=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager;if(Build.VERSION.SDK_INT>=31&&!am.canScheduleExactAlarms())return
        val p=pi(c,slot,Intent(c,PrayerAlarmReceiver::class.java).setAction("RING").putExtra("id",id).putExtra("at",at).putExtra("count",count))
        val show=PendingIntent.getActivity(c,slot,Intent(c,MainActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        am.setAlarmClock(AlarmManager.AlarmClockInfo(at,show),p)
    }
    @Synchronized fun schedule(c:Context){val s=settings(c);val now=System.currentTimeMillis();for(i in 0..79)cancel(c,70000+i);cancel(c,70990)
        if(!s.optBoolean("enabled"))return
        val first=mutableSetOf<String>();var slot=0
        events(c).filter{it.at>now&&allowed(s,it.id,it.at)}.forEach{e->if(item(c,e.id).optString("repeat")!="once"||first.add(e.id)){if(slot<80)alarm(c,70000+slot++,e.id,e.at)}}
        ids.forEach{id->val at=prefs(c).getLong("snooze_$id",0);if(at>now&&item(c,id).optBoolean("enabled"))alarm(c,71000+ids.indexOf(id),id,at,prefs(c).getInt("snoozeCount_$id",1))}
        alarm(c,70990,"refresh",LocalDate.now().plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli())
    }
    @Synchronized fun claim(c:Context,id:String,at:Long,count:Int):Boolean {val s=settings(c);if(id !in ids||!allowed(s,id,at)||System.currentTimeMillis()-at !in 0L..120000L)return false;val k="delivered_$id";if(prefs(c).getLong(k,0)==at)return false;prefs(c).edit().putLong(k,at).remove("snooze_$id").commit();return true}
    fun finish(c:Context,id:String){val s=settings(c);val p=s.optJSONObject("items")?.optJSONObject(id)?:return;if(p.optString("repeat")=="once"){if(p.optBoolean("deleteAfter"))s.getJSONObject("items").put(id,JSONObject().put("enabled",false))else p.put("enabled",false);prefs(c).edit().putString("settings",s.toString()).commit();schedule(c)}}
    fun snooze(c:Context,id:String,count:Int){val p=item(c,id);if(count>=p.optInt("count",3).coerceIn(0,10))return;val at=System.currentTimeMillis()+p.optInt("snooze",10).coerceIn(1,30)*60000L;prefs(c).edit().putLong("snooze_$id",at).putInt("snoozeCount_$id",count+1).commit();alarm(c,71000+ids.indexOf(id),id,at,count+1)}
    fun start(c:Context,id:String,count:Int=0,preview:Boolean=false){ContextCompat.startForegroundService(c,Intent(c,PrayerAlarmService::class.java).putExtra("id",id).putExtra("count",count).putExtra("preview",preview))}
}
class PrayerAlarmReceiver:BroadcastReceiver(){override fun onReceive(c:Context,i:Intent){val id=i.getStringExtra("id")?:return;if(id=="refresh"){val pending=goAsync();Thread{try{IqamaNativeScheduler.refresh(c);PrayerAlarm.schedule(c)}finally{pending.finish()}}.start();return};val count=i.getIntExtra("count",0);if(PrayerAlarm.claim(c,id,i.getLongExtra("at",0),count)){try{PrayerAlarm.start(c,id,count)}catch(_:Exception){};PrayerAlarm.schedule(c)}}}
class PrayerAlarmActionReceiver:BroadcastReceiver(){override fun onReceive(c:Context,i:Intent){val id=i.getStringExtra("id")?:return;if(i.action=="SNOOZE")PrayerAlarm.snooze(c,id,i.getIntExtra("count",0))else if(!i.getBooleanExtra("preview",false))PrayerAlarm.finish(c,id);c.stopService(Intent(c,PrayerAlarmService::class.java))}}
class PrayerAlarmService:Service(){private var player:MediaPlayer?=null;private val handler=Handler(Looper.getMainLooper());private var wake:PowerManager.WakeLock?=null;private var focus:AudioFocusRequest?=null
    override fun onBind(i:Intent?)=null
    override fun onStartCommand(i:Intent?,flags:Int,startId:Int):Int{val id=i?.getStringExtra("id")?:return START_NOT_STICKY;if(id !in PrayerAlarm.ids){stopSelf();return START_NOT_STICKY};player?.release();handler.removeCallbacksAndMessages(null)
        PrayerAlarm.prefs(this).edit().putString("activeId",id).apply();val p=PrayerAlarm.item(this,id);val preview=i.getBooleanExtra("preview",false);val count=i.getIntExtra("count",0);val nm=getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        val channel=NotificationChannel("prayer_alarm_v1","منبّه الصلاة",NotificationManager.IMPORTANCE_HIGH).apply{setSound(null,null);lockscreenVisibility=Notification.VISIBILITY_PUBLIC};nm.createNotificationChannel(channel)
        fun action(name:String)=PendingIntent.getBroadcast(this,72000+PrayerAlarm.ids.indexOf(id)*2+(if(name=="SNOOZE")1 else 0),Intent(this,PrayerAlarmActionReceiver::class.java).setAction(name).putExtra("id",id).putExtra("count",count).putExtra("preview",preview),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val show=PendingIntent.getActivity(this,73000,Intent(this,PrayerAlarmActivity::class.java).putExtra("id",id).putExtra("count",count).putExtra("preview",preview),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification=Notification.Builder(this,"prayer_alarm_v1").setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(p.optString("label",PrayerAlarm.names[id])).setContentText(if(preview)"تجربة النغمة" else "منبّه الصلاة").setCategory(Notification.CATEGORY_ALARM).setVisibility(Notification.VISIBILITY_PUBLIC).setOngoing(true).setContentIntent(show).addAction(Notification.Action.Builder(null,"إيقاف",action("STOP")).build())
        if(!preview&&count<p.optInt("count",3))notification.addAction(Notification.Action.Builder(null,"غفوة",action("SNOOZE")).build())
        if(!preview)notification.setFullScreenIntent(show,true)
        startForeground(73100,notification.build());val duration=if(preview)5000L else p.optInt("duration",5).coerceIn(1,30)*60000L
        wake?.let{if(it.isHeld)it.release()};wake=(getSystemService(POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"aoqat:prayerAlarm").apply{acquire(duration+10000)}
        val attrs=AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
        val am=getSystemService(AUDIO_SERVICE) as AudioManager;focus?.let{am.abandonAudioFocusRequest(it)};focus=AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(attrs).setOnAudioFocusChangeListener{}.build();am.requestAudioFocus(focus!!)
        fun play(uri:Uri){player=MediaPlayer().apply{setAudioAttributes(attrs);setDataSource(this@PrayerAlarmService,uri);isLooping=true;prepare();start()}}
        val tone=p.optJSONObject("tone");try{val uri=when(tone?.optString("kind")){"custom"->Uri.fromFile(java.io.File(filesDir,"prayer-alarm-$id"));"system"->Uri.parse(tone.optString("value"));"soft"->RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);else->RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)};play(uri)}catch(_:Exception){try{player?.release();play(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))}catch(_:Exception){stopSelf()}}
        sendBroadcast(Intent("com.aoqat.calendar.PRAYER_ALARM_ACTIVE").setPackage(packageName).putExtra("active",true))
        handler.postDelayed({if(!preview)PrayerAlarm.finish(this,id);stopSelf()},duration);return START_NOT_STICKY
    }
    override fun onDestroy(){PrayerAlarm.prefs(this).edit().remove("activeId").apply();handler.removeCallbacksAndMessages(null);player?.release();player=null;focus?.let{(getSystemService(AUDIO_SERVICE) as AudioManager).abandonAudioFocusRequest(it)};wake?.let{if(it.isHeld)it.release()};sendBroadcast(Intent("com.aoqat.calendar.PRAYER_ALARM_ACTIVE").setPackage(packageName).putExtra("active",false));stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy()}
}
class PrayerAlarmActivity:Activity(){private val receiver=object:BroadcastReceiver(){override fun onReceive(c:Context,i:Intent){if(!i.getBooleanExtra("active",true))finish()}}
    override fun onCreate(b:Bundle?){super.onCreate(b);if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);setTurnScreenOn(true)}else{window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)};val id=intent.getStringExtra("id")?:run{finish();return};val count=intent.getIntExtra("count",0);val preview=intent.getBooleanExtra("preview",false);val layout=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;gravity=Gravity.CENTER;setPadding(30,30,30,30);setBackgroundColor(0xfffff9ed.toInt())};layout.addView(TextView(this).apply{text=PrayerAlarm.item(this@PrayerAlarmActivity,id).optString("label",PrayerAlarm.names[id]);textSize=34f;gravity=Gravity.CENTER});
        for((label,action)in listOf("إيقاف" to "STOP","غفوة" to "SNOOZE")){layout.addView(Button(this).apply{text=label;textSize=25f;isEnabled=action!="SNOOZE"||!preview&&count<PrayerAlarm.item(this@PrayerAlarmActivity,id).optInt("count",3);setOnClickListener{sendBroadcast(Intent(this@PrayerAlarmActivity,PrayerAlarmActionReceiver::class.java).setAction(action).putExtra("id",id).putExtra("count",count).putExtra("preview",preview));finish()}})};setContentView(layout);ContextCompat.registerReceiver(this,receiver,IntentFilter("com.aoqat.calendar.PRAYER_ALARM_ACTIVE"),ContextCompat.RECEIVER_NOT_EXPORTED)}
    override fun onDestroy(){try{unregisterReceiver(receiver)}catch(_:Exception){};super.onDestroy()}
}
