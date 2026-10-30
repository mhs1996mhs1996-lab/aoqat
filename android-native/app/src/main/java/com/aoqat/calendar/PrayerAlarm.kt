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
    fun configure(c:Context,json:String){val s=try{JSONObject(json)}catch(_:Exception){return};val old=settings(c);val now=System.currentTimeMillis();val edit=prefs(c).edit().putString("settings",s.toString())
        ids.forEach{id->if(s.optBoolean("enabled")&&s.optJSONObject("items")?.optJSONObject(id)?.optBoolean("enabled")==true&&(!old.optBoolean("enabled")||old.optJSONObject("items")?.optJSONObject(id)?.optBoolean("enabled")!=true))edit.putLong("enabledAt_$id",now)};edit.commit();
        ids.forEach{if(!s.optBoolean("enabled")||s.optJSONObject("items")?.optJSONObject(it)?.optBoolean("enabled")!=true){cancel(c,71000+ids.indexOf(it));prefs(c).edit().remove("snooze_$it").apply()}}
        if(!s.optBoolean("enabled")||s.optJSONObject("items")?.optJSONObject(prefs(c).getString("activeId",""))?.optBoolean("enabled")!=true)c.stopService(Intent(c,PrayerAlarmService::class.java))
        schedule(c);Thread{IqamaNativeScheduler.refresh(c)}.start()
    }
    private fun pi(c:Context,slot:Int,intent:Intent,flags:Int=PendingIntent.FLAG_UPDATE_CURRENT)=PendingIntent.getBroadcast(c,slot,intent,flags or PendingIntent.FLAG_IMMUTABLE)
    private fun cancel(c:Context,slot:Int){val p=pi(c,slot,Intent(c,PrayerAlarmReceiver::class.java).setAction("RING"),PendingIntent.FLAG_NO_CREATE)?:return;(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(p);p.cancel()}
    private fun alarm(c:Context,slot:Int,id:String,at:Long,count:Int=0,triggerAt:Long=at){val am=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager;if(Build.VERSION.SDK_INT>=31&&!am.canScheduleExactAlarms())return
        val p=pi(c,slot,Intent(c,PrayerAlarmReceiver::class.java).setAction("RING").putExtra("id",id).putExtra("at",at).putExtra("count",count))
        val show=PendingIntent.getActivity(c,slot,Intent(c,MainActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        am.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAt,show),p)
    }
    fun pending(c:Context,e:PrayerTimes.Prayer,now:Long):Boolean = e.at>now || (now-e.at in 0L..120000L && e.at>=prefs(c).getLong("enabledAt_${e.id}",0) && prefs(c).getLong("delivered_${e.id}",0)!=e.at)
    @Synchronized fun release(c:Context,id:String,at:Long){if(prefs(c).getLong("delivered_$id",0)==at)prefs(c).edit().remove("delivered_$id").putLong("retryAt_$id",System.currentTimeMillis()+5000).commit()}
    @Synchronized fun schedule(c:Context){val s=settings(c);val now=System.currentTimeMillis();for(i in 0..79)cancel(c,70000+i);cancel(c,70990)
        if(!s.optBoolean("enabled"))return
        val first=mutableSetOf<String>();var slot=0
        events(c).filter{!FridaySchedule.suppress(c,it.id,it.at)&&pending(c,it,now)&&allowed(s,it.id,it.at)}.forEach{e->if(item(c,e.id).optString("repeat")!="once"||first.add(e.id)){if(slot<80)alarm(c,70000+slot++,e.id,e.at,triggerAt=maxOf(e.at,now+100,prefs(c).getLong("retryAt_${e.id}",0)))}}
        ids.forEach{id->val at=prefs(c).getLong("snooze_$id",0);if(at>0&&!FridaySchedule.suppress(c,id,at)&&pending(c,PrayerTimes.Prayer(id,at,false),now)&&item(c,id).optBoolean("enabled"))alarm(c,71000+ids.indexOf(id),id,at,prefs(c).getInt("snoozeCount_$id",1),maxOf(at,now+100,prefs(c).getLong("retryAt_$id",0)))}
        alarm(c,70990,"refresh",LocalDate.now().plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli())
    }
    @Synchronized fun claim(c:Context,id:String,at:Long,count:Int):Boolean {val s=settings(c);if(FridaySchedule.suppress(c,id,at)||id !in ids||!allowed(s,id,at)||System.currentTimeMillis()-at !in 0L..120000L||at<prefs(c).getLong("enabledAt_$id",0))return false;val k="delivered_$id";if(prefs(c).getLong(k,0)==at)return false;prefs(c).edit().putLong(k,at).remove("retryAt_$id").commit();return true}
    fun finish(c:Context,id:String){val s=settings(c);val p=s.optJSONObject("items")?.optJSONObject(id)?:return;if(p.optString("repeat")=="once"){if(p.optBoolean("deleteAfter"))s.getJSONObject("items").put(id,JSONObject().put("enabled",false))else p.put("enabled",false);prefs(c).edit().putString("settings",s.toString()).commit();schedule(c)}}
    fun snooze(c:Context,id:String,count:Int):Boolean{
        if(!settings(c).optBoolean("enabled")||id !in ids||!item(c,id).optBoolean("enabled"))return false
        val p=item(c,id)
        if(count>=p.optInt("count",3).coerceIn(0,10))return false
        val at=System.currentTimeMillis()+p.optInt("snooze",10).coerceIn(1,30)*60000L
        prefs(c).edit().putLong("snooze_$id",at).putInt("snoozeCount_$id",count+1).commit()
        alarm(c,71000+ids.indexOf(id),id,at,count+1)
        return true
    }
    fun start(c:Context,id:String,count:Int=0,preview:Boolean=false){ContextCompat.startForegroundService(c,Intent(c,PrayerAlarmService::class.java).putExtra("id",id).putExtra("count",count).putExtra("preview",preview))}
}
class PrayerAlarmReceiver:BroadcastReceiver(){override fun onReceive(c:Context,i:Intent){val id=i.getStringExtra("id")?:return;if(id=="refresh"){val pending=goAsync();Thread{try{IqamaNativeScheduler.refresh(c);PrayerAlarm.schedule(c)}finally{pending.finish()}}.start();return};val count=i.getIntExtra("count",0);if(PrayerAlarm.claim(c,id,i.getLongExtra("at",0),count)){try{PrayerAlarm.start(c,id,count)}catch(e:Exception){PrayerAlarm.release(c,id,i.getLongExtra("at",0));android.util.Log.e("PrayerAlarm","Cannot start alarm: $id",e)};PrayerAlarm.schedule(c)}}}
class PrayerAlarmActionReceiver:BroadcastReceiver(){override fun onReceive(c:Context,i:Intent){
    val id=i.getStringExtra("id")?:return
    if(id !in PrayerAlarm.ids)return
    val preview=i.getBooleanExtra("preview",false)
    val snoozed=!preview&&i.action=="SNOOZE"&&PrayerAlarm.snooze(c,id,i.getIntExtra("count",0))
    if(!preview&&!snoozed)PrayerAlarm.finish(c,id)
    c.stopService(Intent(c,PrayerAlarmService::class.java))
}}
class PrayerAlarmService:Service(){
    private var player:MediaPlayer?=null
    private val handler=Handler(Looper.getMainLooper())
    private var wake:PowerManager.WakeLock?=null
    private var focus:AudioFocusRequest?=null
    private var ringingId=""
    private var ringingCount=0
    private var ringingPreview=false
    private var hardwareHandled=false
    // Android does not expose KEYCODE_POWER to ordinary apps. The registered
    // screen-off broadcast is the closest supported equivalent while ringing.
    private val screenOff=object:BroadcastReceiver(){
        override fun onReceive(c:Context,i:Intent){
            if(i.action!=Intent.ACTION_SCREEN_OFF||ringingId.isBlank()||hardwareHandled)return
            hardwareHandled=true
            PrayerAlarmActionReceiver().onReceive(this@PrayerAlarmService,
                Intent(this@PrayerAlarmService,PrayerAlarmActionReceiver::class.java)
                    .setAction("SNOOZE").putExtra("id",ringingId)
                    .putExtra("count",ringingCount).putExtra("preview",ringingPreview))
        }
    }
    override fun onCreate(){
        super.onCreate()
        if(Build.VERSION.SDK_INT>=33)registerReceiver(screenOff,IntentFilter(Intent.ACTION_SCREEN_OFF),RECEIVER_NOT_EXPORTED)
        else @Suppress("DEPRECATION") registerReceiver(screenOff,IntentFilter(Intent.ACTION_SCREEN_OFF))
    }
    override fun onBind(i:Intent?)=null
    override fun onStartCommand(i:Intent?,flags:Int,startId:Int):Int{val id=i?.getStringExtra("id")?:return START_NOT_STICKY;if(id !in PrayerAlarm.ids){stopSelf();return START_NOT_STICKY};player?.release();handler.removeCallbacksAndMessages(null)
        PrayerAlarm.prefs(this).edit().putString("activeId",id).apply();val p=PrayerAlarm.item(this,id);val preview=i.getBooleanExtra("preview",false);if(!preview)PrayerAlarm.prefs(this).edit().remove("snooze_$id").apply();val count=i.getIntExtra("count",0);ringingId=id;ringingCount=count;ringingPreview=preview;hardwareHandled=false;val nm=getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        val channel=NotificationChannel("prayer_alarm_v1","منبّه الصلاة",NotificationManager.IMPORTANCE_HIGH).apply{setSound(null,null);lockscreenVisibility=Notification.VISIBILITY_PUBLIC};nm.createNotificationChannel(channel)
        fun action(name:String)=PendingIntent.getBroadcast(this,72000+PrayerAlarm.ids.indexOf(id)*2+(if(name=="SNOOZE")1 else 0),Intent(this,PrayerAlarmActionReceiver::class.java).setAction(name).putExtra("id",id).putExtra("count",count).putExtra("preview",preview),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val show=PendingIntent.getActivity(this,73000,Intent(this,PrayerAlarmActivity::class.java).putExtra("id",id).putExtra("count",count).putExtra("preview",preview),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification=Notification.Builder(this,"prayer_alarm_v1").setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(if(preview || id=="third")p.optString("label",PrayerAlarm.names[id]) else PrayerNotifications.title(id,id=="dhuhr"&&LocalDate.now().dayOfWeek==DayOfWeek.FRIDAY)).setContentText(if(preview)"تجربة النغمة" else p.optString("label",PrayerAlarm.names[id])).setCategory(Notification.CATEGORY_ALARM).setVisibility(Notification.VISIBILITY_PUBLIC).setOngoing(true).setContentIntent(show).addAction(Notification.Action.Builder(null,"إيقاف",action("STOP")).build())
        if(!preview&&count<p.optInt("count",3))notification.addAction(Notification.Action.Builder(null,"غفوة",action("SNOOZE")).build())
        if(!preview)notification.setFullScreenIntent(show,true)
        startForeground(73100,notification.build());val duration=if(preview)5000L else p.optInt("duration",5).coerceIn(1,30)*60000L
        wake?.let{if(it.isHeld)it.release()};wake=(getSystemService(POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"aoqat:prayerAlarm").apply{acquire(duration+10000)}
        val attrs=AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
        val am=getSystemService(AUDIO_SERVICE) as AudioManager;PrayerAlarmAudio.ensureAudible(this);focus?.let{am.abandonAudioFocusRequest(it)};focus=AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(attrs).setOnAudioFocusChangeListener{}.build();am.requestAudioFocus(focus!!)
        fun play(uri:Uri){player=MediaPlayer().apply{setAudioAttributes(attrs);setDataSource(this@PrayerAlarmService,uri);isLooping=true;prepare();start()}}
        val tone=p.optJSONObject("tone");try{val uri=when(tone?.optString("kind")){"custom"->Uri.fromFile(java.io.File(filesDir,"prayer-alarm-$id"));"system"->Uri.parse(tone.optString("value"));"soft"->RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);else->RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)};play(uri)}catch(_:Exception){try{player?.release();play(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))}catch(e:Exception){player?.release();player=MediaPlayer.create(this,R.raw.prayer_alarm_fallback,attrs,0)?.apply{isLooping=true;start()};if(player==null){android.util.Log.e("PrayerAlarm","No playable alarm tone",e);stopSelf();return START_NOT_STICKY}}}
        sendBroadcast(Intent("com.aoqat.calendar.PRAYER_ALARM_ACTIVE").setPackage(packageName).putExtra("active",true))
        handler.postDelayed({if(!preview)PrayerAlarm.finish(this,id);stopSelf()},duration);return START_NOT_STICKY
    }
    override fun onDestroy(){ringingId="";hardwareHandled=true;try{unregisterReceiver(screenOff)}catch(_:Exception){};PrayerAlarmAudio.restore(this);PrayerAlarm.prefs(this).edit().remove("activeId").apply();handler.removeCallbacksAndMessages(null);player?.release();player=null;focus?.let{(getSystemService(AUDIO_SERVICE) as AudioManager).abandonAudioFocusRequest(it)};wake?.let{if(it.isHeld)it.release()};sendBroadcast(Intent("com.aoqat.calendar.PRAYER_ALARM_ACTIVE").setPackage(packageName).putExtra("active",false));stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy()}
}
class PrayerAlarmActivity:Activity(){
    private val receiver=object:BroadcastReceiver(){
        override fun onReceive(c:Context,i:Intent){if(!i.getBooleanExtra("active",true))finish()}
    }
    private var prayerId=""
    private var snoozeCount=0
    private var preview=false
    private var actionTaken=false
    private fun decide(action:String){
        if(actionTaken)return
        actionTaken=true
        sendBroadcast(Intent(this,PrayerAlarmActionReceiver::class.java)
            .setAction(action).putExtra("id",prayerId).putExtra("count",snoozeCount)
            .putExtra("preview",preview))
        finish()
    }
    override fun onCreate(b:Bundle?){
        super.onCreate(b)
        if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);setTurnScreenOn(true)}
        else window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        prayerId=intent.getStringExtra("id")?:run{finish();return}
        snoozeCount=intent.getIntExtra("count",0)
        preview=intent.getBooleanExtra("preview",false)
        if(!preview&&!PrayerAlarm.settings(this).optBoolean("enabled")){finish();return}
        val bg=android.graphics.drawable.GradientDrawable(
            android.graphics.drawable.GradientDrawable.Orientation.TL_BR,
            intArrayOf(0xff718b9c.toInt(),0xff286a98.toInt(),0xff887a84.toInt()))
        val panel=LinearLayout(this).apply{
            orientation=LinearLayout.VERTICAL
            gravity=Gravity.CENTER_HORIZONTAL
            setPadding(32,48,32,35)
            background=bg
        }
        val now=java.time.ZonedDateTime.now()
        val fmt=java.time.format.DateTimeFormatter.ofPattern("h:mm",java.util.Locale("ar"))
        val clock=TextView(this).apply{
            text=now.format(fmt);textSize=78f;gravity=Gravity.CENTER
            setTextColor(0xffe3fff7.toInt())
        }
        panel.addView(clock,LinearLayout.LayoutParams(-1,0,1.1f))
        panel.addView(TextView(this).apply{
            text=now.format(java.time.format.DateTimeFormatter.ofPattern("EEEE، d MMMM",java.util.Locale("ar")))
            textSize=20f;gravity=Gravity.CENTER;setTextColor(android.graphics.Color.WHITE)
        })
        val label=if(prayerId=="third")PrayerAlarm.names[prayerId]?:"الصلاة" else PrayerTimes.names[prayerId]?:"الصلاة"
        panel.addView(TextView(this).apply{
            text="حان موعد أذان $label لمدينة الحويجة"
            textSize=26f;gravity=Gravity.CENTER;setTextColor(android.graphics.Color.WHITE)
            setPadding(0,36,0,28)
        },LinearLayout.LayoutParams(-1,0,1f))
        val snoozeMin=PrayerAlarm.item(this,prayerId).optInt("snooze",10).coerceIn(1,30)
        panel.addView(Button(this).apply{
            text="التذكير بعد $snoozeMin دقائق"
            textSize=18f
            isEnabled=!preview&&snoozeCount<PrayerAlarm.item(this@PrayerAlarmActivity,prayerId).optInt("count",3)
            setOnClickListener{decide("SNOOZE")}
        },LinearLayout.LayoutParams(-1,-2))
        panel.addView(TextView(this).apply{
            text="اسحب لإيقاف المنبه"
            textSize=20f;gravity=Gravity.CENTER;setTextColor(android.graphics.Color.WHITE)
            setPadding(0,25,0,12)
        },LinearLayout.LayoutParams(-1,0,0.7f))
        val stop=Button(this).apply{
            text="◯  اسحب للإيقاف"
            textSize=20f
            setOnClickListener{decide("STOP")}
        }
        var downX=0f
        stop.setOnTouchListener{_,event->
            when(event.actionMasked){
                android.view.MotionEvent.ACTION_DOWN->{downX=event.x;true}
                android.view.MotionEvent.ACTION_UP->{
                    if(kotlin.math.abs(event.x-downX)>70)decide("STOP") else stop.performClick()
                    true
                }
                else->true
            }
        }
        panel.addView(stop,LinearLayout.LayoutParams(-1,-2))
        setContentView(panel)
        ContextCompat.registerReceiver(this,receiver,IntentFilter("com.aoqat.calendar.PRAYER_ALARM_ACTIVE"),ContextCompat.RECEIVER_NOT_EXPORTED)
    }
    override fun dispatchKeyEvent(event:android.view.KeyEvent):Boolean{
        if(event.keyCode==android.view.KeyEvent.KEYCODE_VOLUME_UP ||
           event.keyCode==android.view.KeyEvent.KEYCODE_VOLUME_DOWN){
            if(event.action==android.view.KeyEvent.ACTION_DOWN && event.repeatCount==0)
                decide("SNOOZE")
            return true // Consume DOWN and UP; never change phone volume while ringing.
        }
        return super.dispatchKeyEvent(event)
    }
    override fun onKeyDown(code:Int,event:android.view.KeyEvent):Boolean{
        if(code==android.view.KeyEvent.KEYCODE_VOLUME_UP||code==android.view.KeyEvent.KEYCODE_VOLUME_DOWN){
            if(event.repeatCount==0)decide("SNOOZE")
            return true
        }
        return super.onKeyDown(code,event)
    }
    override fun onDestroy(){try{unregisterReceiver(receiver)}catch(_:Exception){};super.onDestroy()}
}
