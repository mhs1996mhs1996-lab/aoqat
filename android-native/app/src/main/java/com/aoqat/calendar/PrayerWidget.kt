package com.aoqat.calendar

import android.app.*
import android.appwidget.*
import android.content.*
import android.graphics.Color
import android.os.*
import android.widget.RemoteViews
import java.time.*
import java.util.Locale

/**
 * The three independent home-screen widgets share only existing, locally stored
 * prayer/iqama data. Notification layout and alarm delivery are never changed.
 */
class PrayerWidget:AppWidgetProvider(){
    companion object{
        private fun ids(c:Context,provider:Class<*>):IntArray =
            AppWidgetManager.getInstance(c).getAppWidgetIds(ComponentName(c,provider))
        fun exists(c:Context):Boolean = listOf(
            PrayerWidget::class.java, FivePrayerWidget::class.java, IqamaCountdownWidget::class.java
        ).any{ids(c,it).isNotEmpty()}

        fun views(c:Context,notification:Boolean=false):RemoteViews{
            val v=RemoteViews(c.packageName,if(notification) R.layout.prayer_next_notification else R.layout.prayer_widget)
            val now=System.currentTimeMillis()
            val next=PrayerTimes.events(c).firstOrNull{it.at>now}
            v.setTextViewText(R.id.widget_prayer,if(next==null)"افتح التطبيق لتحميل المواقيت" else "${PrayerTimes.names[next.id]} بعد")
            v.setChronometer(R.id.widget_counter,SystemClock.elapsedRealtime()+((next?.at?:now)-now),"%s",next!=null)
            v.setChronometerCountDown(R.id.widget_counter,true)
            if(next==null)v.setTextViewText(R.id.widget_counter,"--:--")
            v.setTextViewText(R.id.widget_date,LocalDate.now().toString())
            // Home-screen card always stays transparent and white, regardless of
            // a saved legacy light/dark preference. Notification keeps its old dark style.
            v.setInt(R.id.prayer_widget_root,"setBackgroundColor",if(notification) Color.rgb(8,35,47) else Color.TRANSPARENT)
            listOf(R.id.widget_prayer,R.id.widget_counter,R.id.widget_date).forEach{v.setTextColor(it,Color.WHITE)}
            v.setOnClickPendingIntent(R.id.prayer_widget_root,PendingIntent.getActivity(c,60500,
                Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }

        fun update(c:Context){
            val manager=AppWidgetManager.getInstance(c)
            ids(c,PrayerWidget::class.java).takeIf{it.isNotEmpty()}?.let{manager.updateAppWidget(it,views(c))}
            ids(c,FivePrayerWidget::class.java).takeIf{it.isNotEmpty()}?.let{manager.updateAppWidget(it,FivePrayerWidget.views(c))}
            ids(c,IqamaCountdownWidget::class.java).takeIf{it.isNotEmpty()}?.let{manager.updateAppWidget(it,IqamaCountdownWidget.views(c))}
        }
    }
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){update(c);AdhanSchedule.schedule(c);Thread{IqamaNativeScheduler.refresh(c)}.start()}
    override fun onDeleted(c:Context,ids:IntArray){AdhanSchedule.schedule(c)}
}

/** Today's five prayers, taken from the project's chosen cached time table. */
class FivePrayerWidget:AppWidgetProvider(){
    companion object{
        private fun display(minutes:Int):String{
            val hour=minutes/60
            return String.format(Locale.US,"%d:%02d %s",if(hour%12==0)12 else hour%12,
                minutes%60,if(hour<12)"ص" else "م")
        }
        fun views(c:Context):RemoteViews{
            val v=RemoteViews(c.packageName,R.layout.prayer_times_widget)
            val today=LocalDate.now()
            val rows=PrayerTimes.rows(c)
            val row=(0 until rows.length()).mapNotNull{rows.optJSONObject(it)}.firstOrNull{
                it.optInt("gregorian_month")==today.monthValue && it.optInt("gregorian_day")==today.dayOfMonth}
            val items=listOf("fajr" to R.id.widget_times_fajr, "dhuhr" to R.id.widget_times_dhuhr,
                "asr" to R.id.widget_times_asr, "maghrib" to R.id.widget_times_maghrib,
                "isha" to R.id.widget_times_isha)
            items.forEach{(prayer,id)->
                val minutes=row?.let{PrayerTimes.minutes(it.optString(prayer),prayer)}
                v.setTextViewText(id,"${PrayerTimes.names[prayer]}     ${minutes?.let(::display) ?: "—"}")
            }
            v.setTextViewText(R.id.widget_times_header,"مواقيت الصلاة اليوم")
            v.setInt(R.id.widget_times_root,"setBackgroundColor",Color.TRANSPARENT)
            v.setOnClickPendingIntent(R.id.widget_times_root,PendingIntent.getActivity(c,60530,
                Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){PrayerWidget.update(c);AdhanSchedule.schedule(c)}
    override fun onDeleted(c:Context,ids:IntArray){AdhanSchedule.schedule(c)}
}

/**
 * Counts down to the next iqama and, during the existing native cycle,
 * shows the same before/after zero point as the persistent iqama notification.
 */
class IqamaCountdownWidget:AppWidgetProvider(){
    companion object{
        fun views(c:Context):RemoteViews{
            val v=RemoteViews(c.packageName,R.layout.prayer_iqama_widget)
            v.setInt(R.id.widget_iqama_root,"setBackgroundColor",Color.TRANSPARENT)
            val now=System.currentTimeMillis()
            var caption="الإقامة غير مفعّلة"
            var prayer=""
            var deadline:Long?=null
            var countDown=true
            if(IqamaNativeScheduler.enabled(c)){
                val prefs=c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE)
                val activeId=prefs.getString("prayerId","") ?: ""
                val prayerAt=prefs.getLong("prayerAt",0L)
                val before=if(activeId in PrayerTimes.ids)IqamaNativeScheduler.durations(c,activeId).beforeMs else 0L
                val end=if(activeId in PrayerTimes.ids)IqamaNativeScheduler.durations(c,activeId).totalMs else 0L
                if(prefs.getBoolean("active",false) && prayerAt>0L && now in prayerAt until (prayerAt+end)){
                    prayer=PrayerTimes.names[activeId] ?: ""
                    if(now<prayerAt+before){
                        caption="باقي على الإقامة"
                        deadline=prayerAt+before
                    }else{
                        caption="مضى على الإقامة"
                        deadline=prayerAt+before
                        countDown=false
                    }
                }else{
                    val upcoming=PrayerTimes.events(c).firstOrNull{it.at>now}
                    if(upcoming!=null){
                        caption="الإقامة القادمة"
                        prayer=PrayerTimes.names[upcoming.id] ?: ""
                        deadline=upcoming.at+IqamaNativeScheduler.durations(c,upcoming.id).beforeMs
                    }else caption="لا توجد مواقيت محفوظة"
                }
            }
            v.setTextViewText(R.id.widget_iqama_title,caption)
            v.setTextViewText(R.id.widget_iqama_prayer,prayer)
            if(deadline!=null){
                v.setChronometer(R.id.widget_iqama_counter,
                    SystemClock.elapsedRealtime()+(deadline-now),"%s",true)
                v.setChronometerCountDown(R.id.widget_iqama_counter,countDown)
            }else{
                v.setChronometer(R.id.widget_iqama_counter,SystemClock.elapsedRealtime(),"%s",false)
                v.setTextViewText(R.id.widget_iqama_counter,"--:--")
            }
            v.setOnClickPendingIntent(R.id.widget_iqama_root,PendingIntent.getActivity(c,60531,
                Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){PrayerWidget.update(c);AdhanSchedule.schedule(c)}
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
