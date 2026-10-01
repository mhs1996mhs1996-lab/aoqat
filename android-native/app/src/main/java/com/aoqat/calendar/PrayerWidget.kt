package com.aoqat.calendar
import android.app.*
import android.appwidget.*
import android.content.*
import android.os.*
import android.graphics.Color
import android.widget.RemoteViews
import java.time.*

class PrayerWidget: AppWidgetProvider(){
    companion object{
        fun exists(c:Context)=AppWidgetManager.getInstance(c).getAppWidgetIds(ComponentName(c,PrayerWidget::class.java)).isNotEmpty()
        fun views(c:Context, notification:Boolean=false):RemoteViews{
            val v=RemoteViews(c.packageName,if(notification) R.layout.prayer_next_notification else R.layout.prayer_widget)
            val next=PrayerTimes.events(c).firstOrNull{it.at>System.currentTimeMillis()}
            v.setTextViewText(R.id.widget_prayer,if(next==null)"افتح التطبيق لتحميل المواقيت" else "${PrayerTimes.names[next.id]} بعد")
            v.setChronometer(R.id.widget_counter,SystemClock.elapsedRealtime()+((next?.at?:System.currentTimeMillis())-System.currentTimeMillis()),"%s",next!=null)
            v.setChronometerCountDown(R.id.widget_counter,true)
            v.setTextViewText(R.id.widget_date,LocalDate.now().toString())
            val style=if(notification)"dark" else AdhanSchedule.settings(c).optString("widget","transparent")
            v.setInt(R.id.prayer_widget_root,"setBackgroundColor",when(style){"light"->Color.rgb(255,249,228);"dark"->Color.rgb(8,35,47);else->Color.TRANSPARENT})
            val color=if(style=="light")Color.rgb(8,35,47)else Color.WHITE
            listOf(R.id.widget_prayer,R.id.widget_counter,R.id.widget_date).forEach{v.setTextColor(it,color)}
            v.setOnClickPendingIntent(R.id.prayer_widget_root,PendingIntent.getActivity(c,60500,Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
        fun update(c:Context){val am=AppWidgetManager.getInstance(c);val ids=am.getAppWidgetIds(ComponentName(c,PrayerWidget::class.java));if(ids.isNotEmpty())am.updateAppWidget(ids,views(c))}
    }
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){update(c);AdhanSchedule.schedule(c);Thread{IqamaNativeScheduler.refresh(c)}.start()}
    override fun onDeleted(c:Context,ids:IntArray){AdhanSchedule.schedule(c)}
}
class NextPrayerService:Service(){
    companion object{fun start(c:Context){if(AdhanSchedule.settings(c).optBoolean("persistent"))try{androidx.core.content.ContextCompat.startForegroundService(c,Intent(c,NextPrayerService::class.java))}catch(e:Exception){android.util.Log.w("NextPrayer","Cannot start background notification",e)}}}
    override fun onBind(i:Intent?) : IBinder?=null
    override fun onStartCommand(i:Intent?,flags:Int,startId:Int):Int{
        if(!AdhanSchedule.settings(this).optBoolean("persistent")){stopSelf();return START_NOT_STICKY}
        val nm=getSystemService(NOTIFICATION_SERVICE) as NotificationManager;nm.createNotificationChannel(NotificationChannel("next_prayer","الصلاة القادمة",NotificationManager.IMPORTANCE_LOW).apply{setSound(null,null)})
        val views=PrayerWidget.views(this,true)
        val n=Notification.Builder(this,"next_prayer").setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle("الصلاة القادمة").setCustomContentView(views).setCustomBigContentView(views).setPublicVersion(Notification.Builder(this,"next_prayer").setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setCustomContentView(views).build()).setVisibility(Notification.VISIBILITY_PUBLIC).setOngoing(true).setOnlyAlertOnce(true).setContentIntent(PendingIntent.getActivity(this,60501,Intent(this,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE)).build()
        startForeground(60502,n);return START_STICKY
    }
    override fun onDestroy(){stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy()}
}
