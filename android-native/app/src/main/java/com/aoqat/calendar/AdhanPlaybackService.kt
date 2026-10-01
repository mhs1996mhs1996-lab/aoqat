package com.aoqat.calendar

import android.app.*
import android.content.*
import android.hardware.*
import android.media.*
import android.os.*
import android.view.Gravity
import android.widget.*
import org.json.JSONObject
import java.io.File

class AdhanPlaybackService : Service(), SensorEventListener {
    companion object {
        @Volatile var running=false
            private set
        fun restoreVolume(c: Context) {
            val p=c.getSharedPreferences("adhan_audio_volume",Context.MODE_PRIVATE)
            if(!p.contains("previous"))return
            val am=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            try { if(am.getStreamVolume(AudioManager.STREAM_ALARM)==p.getInt("applied",-1))am.setStreamVolume(AudioManager.STREAM_ALARM,p.getInt("previous",0),0) } catch(_:SecurityException) { }
            p.edit().clear().commit()
        }
        fun restoreRinger(c: Context) {
            val p=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
            if(!p.getBoolean("changed",false))return
            val am=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            try { if(am.ringerMode==AudioManager.RINGER_MODE_SILENT) am.ringerMode=p.getInt("previous",AudioManager.RINGER_MODE_NORMAL) } catch (_: SecurityException) { }
            p.edit().clear().commit()
        }
        fun restoreRingerIfExpired(c: Context) {
            val p=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
            val end=p.getLong("end",0)
            if(end>0 && end<=System.currentTimeMillis())restoreRinger(c)
            else if(end>0)AdhanSchedule.alarm(c,60403,"RESTORE_SOUND",end)
        }
    }
    private var player: MediaPlayer?=null
    private var focus: AudioFocusRequest?=null
    private var previousVolume:Int?=null
    private var appliedVolume:Int?=null
    private var wake: PowerManager.WakeLock?=null
    private var vibrator: Vibrator?=null
    private lateinit var sensors: SensorManager
    private val handler=Handler(Looper.getMainLooper())
    private var config=JSONObject()
    private var started=0L
    private var flipArmed=false
    private var successful=false
    private var preview=false
    override fun onBind(intent: Intent?): IBinder?=null
    override fun onCreate(){super.onCreate();restoreVolume(this);running=true;sensors=getSystemService(SENSOR_SERVICE) as SensorManager}
    override fun onStartCommand(intent: Intent?,flags:Int,startId:Int):Int {
        if(intent?.action=="STOP"){stopSelf();return START_NOT_STICKY}
        cleanup()
        successful=false
        flipArmed=false
        config=if(intent?.hasExtra("settings")==true)try{JSONObject(intent.getStringExtra("settings")?:"{}")}catch(_:Exception){JSONObject()} else AdhanSchedule.settings(this)
        preview=intent?.getBooleanExtra("preview",false)==true
        val prayer=intent?.getStringExtra("prayerId")?:"fajr"
        val mode=if(preview)"sound" else config.optJSONObject("modes")?.optString(if(intent?.getBooleanExtra("friday",false)==true)"friday" else prayer,"sound")?:"sound"
        if(!preview && (!config.optBoolean("enabled") || mode=="silent")){stopSelf();return START_NOT_STICKY}
        val nm=getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(NotificationChannel("adhan_playback","الأذان",NotificationManager.IMPORTANCE_HIGH).apply{setSound(null,null);enableVibration(false)})
        val stop=PendingIntent.getService(this,60410,Intent(this,AdhanPlaybackService::class.java).setAction("STOP"),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val builder=Notification.Builder(this,"adhan_playback").setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(if(preview)"تجربة صوت الأذان" else "حان أذان ${PrayerTimes.names[prayer]?:"الصلاة"}").setContentText("اضغط إيقاف لإنهاء الأذان").setOngoing(true).setVisibility(Notification.VISIBILITY_PUBLIC).addAction(Notification.Action.Builder(null,"إيقاف",stop).build()).setContentIntent(PendingIntent.getActivity(this,60411,Intent(this,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE))
        if(config.optBoolean("screen")&&!preview){val show=PendingIntent.getActivity(this,60412,Intent(this,AdhanScreenActivity::class.java).putExtra("prayerId",prayer),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT);builder.setFullScreenIntent(show,true)}
        startForeground(60400,builder.build())
        wake=(getSystemService(POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"aoqat:adhan").apply{acquire(10*60*1000L)}
        started=SystemClock.elapsedRealtime()
        if(config.optBoolean("flip"))sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.let{sensors.registerListener(this,it,SensorManager.SENSOR_DELAY_NORMAL)}
        val am=getSystemService(AUDIO_SERVICE) as AudioManager
        val override=config.optBoolean("overrideSilent")
        if(!preview && !override && am.ringerMode!=AudioManager.RINGER_MODE_NORMAL){if(mode=="vibrate"||config.optBoolean("vibrate"))vibrate();handler.postDelayed({stopSelf()},4000);return START_NOT_STICKY}
        if(mode=="vibrate"||config.optBoolean("vibrate"))vibrate()
        if(mode=="vibrate"){handler.postDelayed({stopSelf()},4000);return START_NOT_STICKY}
        try {
            val attrs=AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
            focus=AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attrs).setOnAudioFocusChangeListener{change->if(change==AudioManager.AUDIOFOCUS_LOSS || change==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT)stopSelf()}.build()
            if(am.requestAudioFocus(focus!!)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){stopSelf();return START_NOT_STICKY}
            previousVolume=am.getStreamVolume(AudioManager.STREAM_ALARM)
            appliedVolume=am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            getSharedPreferences("adhan_audio_volume",MODE_PRIVATE).edit().putInt("previous",previousVolume!!).putInt("applied",appliedVolume!!).commit()
            am.setStreamVolume(AudioManager.STREAM_ALARM,appliedVolume!!,0)
            player=MediaPlayer().apply{
                setAudioAttributes(attrs)
                if(config.optString("sound","1")=="custom")setDataSource(File(filesDir,"custom-adhan").absolutePath)
                else {val id=config.optString("sound","1").takeIf{it in listOf("1","2","3","4")}?:"1";val suffix=if(config.optBoolean("partial"))"-short" else "";assets.openFd("www/assets/audio/adhan-$id$suffix.mp3").use{setDataSource(it.fileDescriptor,it.startOffset,it.length)}}
                val v=config.optInt("volume",80).coerceIn(0,100)/100f;setVolume(v,v)
                setOnCompletionListener{successful=true;stopSelf()};setOnErrorListener{_,_,_->Toast.makeText(this@AdhanPlaybackService,"تعذر تشغيل الصوت المختار؛ اختر ملفًا صوتيًا صالحًا",Toast.LENGTH_LONG).show();stopSelf();true};prepare();start()
            }
            if(config.optString("sound")=="custom" && config.optBoolean("partial"))handler.postDelayed({successful=true;stopSelf()},config.optInt("customEnd",35).coerceIn(1,180)*1000L)
            handler.postDelayed({stopSelf()},9*60*1000L)
        }catch(e:Exception){android.util.Log.e("Adhan","Audio playback failed",e);Toast.makeText(this,"تعذر تشغيل الأذان؛ جرّب اختيار صوت آخر",Toast.LENGTH_LONG).show();stopSelf()}
        return START_NOT_STICKY
    }
    private fun vibrate(){vibrator=getSystemService(VIBRATOR_SERVICE) as Vibrator;val p=when(config.optString("pattern")){"long"->longArrayOf(0,1000);"pulse"->longArrayOf(0,250,150,250,150,250);else->longArrayOf(0,250)};vibrator?.vibrate(VibrationEffect.createWaveform(p,-1))}
    private fun cleanup(){
        restoreVolume(this)
        previousVolume=null;appliedVolume=null
        handler.removeCallbacksAndMessages(null);sensors.unregisterListener(this);player?.release();player=null;vibrator?.cancel();focus?.let{(getSystemService(AUDIO_SERVICE) as AudioManager).abandonAudioFocusRequest(it)};focus=null;if(wake?.isHeld==true)wake?.release();wake=null}
    override fun onDestroy(){cleanup();running=false;if(successful&&!preview){val duration=config.optInt("afterSilent",0).coerceIn(0,60);val nm=getSystemService(NOTIFICATION_SERVICE) as NotificationManager;if(duration>0&&nm.isNotificationPolicyAccessGranted){val am=getSystemService(AUDIO_SERVICE) as AudioManager;val p=getSharedPreferences("adhan_ringer",MODE_PRIVATE);val old=if(p.getBoolean("changed",false))p.getInt("previous",2) else am.ringerMode;val end=System.currentTimeMillis()+duration*60000L;try{am.ringerMode=AudioManager.RINGER_MODE_SILENT;p.edit().putBoolean("changed",true).putInt("previous",old).putLong("end",end).commit();AdhanSchedule.alarm(this,60403,"RESTORE_SOUND",end)}catch(_:SecurityException){}}};sendBroadcast(Intent("com.aoqat.calendar.ADHAN_STOPPED").setPackage(packageName));stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy()}
    override fun onSensorChanged(e:SensorEvent){if(e.values[2]>-5)flipArmed=true;if(flipArmed && e.values[2]<-7 && SystemClock.elapsedRealtime()-started>1500)stopSelf()}
    override fun onAccuracyChanged(s:Sensor?,a:Int){}
}
class AdhanScreenActivity: Activity(){
    private val stopped=object:BroadcastReceiver(){override fun onReceive(c:Context,i:Intent){finish()}}
    override fun onCreate(b:Bundle?){super.onCreate(b);if(Build.VERSION.SDK_INT>=27){setShowWhenLocked(true);setTurnScreenOn(true)}else window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);val layout=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;gravity=Gravity.CENTER;setPadding(30,30,30,30);setBackgroundColor(android.graphics.Color.rgb(8,40,50))};layout.addView(TextView(this).apply{text=intent.getStringExtra("reminderMessage")?:"حان أذان ${PrayerTimes.names[intent.getStringExtra("prayerId")]?:"الصلاة"}";textSize=30f;setTextColor(android.graphics.Color.WHITE);gravity=Gravity.CENTER});layout.addView(Button(this).apply{text=if(intent.hasExtra("reminderMessage"))"إغلاق" else "إيقاف الأذان";setOnClickListener{if(!intent.hasExtra("reminderMessage"))stopService(Intent(this@AdhanScreenActivity,AdhanPlaybackService::class.java));finish()}});setContentView(layout);if(intent.hasExtra("reminderMessage"))android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({if(!isFinishing)finish()},30000);if(Build.VERSION.SDK_INT>=33)registerReceiver(stopped,IntentFilter("com.aoqat.calendar.ADHAN_STOPPED"),RECEIVER_NOT_EXPORTED)else @Suppress("DEPRECATION") registerReceiver(stopped,IntentFilter("com.aoqat.calendar.ADHAN_STOPPED"))}
    override fun onKeyDown(code:Int,event:android.view.KeyEvent):Boolean {if(code in listOf(android.view.KeyEvent.KEYCODE_VOLUME_UP,android.view.KeyEvent.KEYCODE_VOLUME_DOWN,android.view.KeyEvent.KEYCODE_MEDIA_STOP)){stopService(Intent(this,AdhanPlaybackService::class.java));finish();return true};return super.onKeyDown(code,event)}
    @Deprecated("Deprecated in Java") override fun onBackPressed(){stopService(Intent(this,AdhanPlaybackService::class.java));super.onBackPressed()}
    override fun onDestroy(){unregisterReceiver(stopped);super.onDestroy()}
}
