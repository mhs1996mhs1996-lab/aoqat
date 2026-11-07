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
            // The persistent notification keeps its original appearance and is
            // not affected by the user's independent home-screen widget styling.
            if(notification){
                v.setInt(R.id.prayer_widget_root,"setBackgroundColor",Color.rgb(8,35,47))
                listOf(R.id.widget_prayer,R.id.widget_counter,R.id.widget_date).forEach{v.setTextColor(it,Color.WHITE)}
            }else{
                WidgetAppearance.decorate(c,v,R.id.prayer_widget_root,mapOf(
                    R.id.widget_prayer to ((if(next==null)"افتح التطبيق لتحميل المواقيت" else "${PrayerTimes.names[next.id]} بعد") to 23f),
                    R.id.widget_date to (LocalDate.now().toString() to 15f)
                ),"next")
                WidgetAppearance.decorateCounter(c,v,R.id.widget_counter,"next",32f)
            }
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
    override fun onAppWidgetOptionsChanged(c:Context,m:AppWidgetManager,id:Int,options:Bundle){PrayerWidget.update(c)}
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
            val labels=mutableMapOf<Int,Pair<String,Float>>(R.id.widget_times_header to ("مواقيت الصلاة اليوم" to 19f))
            items.forEach{(prayer,id)->
                val minutes=row?.let{PrayerTimes.minutes(it.optString(prayer),prayer)}
                labels[id]="${PrayerTimes.names[prayer]}     ${minutes?.let(::display) ?: "—"}" to 18f
            }
            WidgetAppearance.decorate(c,v,R.id.widget_times_root,labels,"times")
            v.setOnClickPendingIntent(R.id.widget_times_root,PendingIntent.getActivity(c,60530,
                Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){PrayerWidget.update(c);AdhanSchedule.schedule(c)}
    override fun onAppWidgetOptionsChanged(c:Context,m:AppWidgetManager,id:Int,options:Bundle){PrayerWidget.update(c)}
    override fun onDeleted(c:Context,ids:IntArray){AdhanSchedule.schedule(c)}
}

/**
 * Counts down to the next iqama and, during the existing native cycle,
 * shows the same before/after zero point as the persistent iqama notification.
 */
class IqamaCountdownWidget:AppWidgetProvider(){
    companion object{
        /**
         * Independently calculate the two native phases from saved prayer times.
         * A launcher widget must not depend on an iqama notification appearing;
         * that notification can be blocked by the device or user.
         */
        fun views(c:Context):RemoteViews{
            val v=RemoteViews(c.packageName,R.layout.prayer_iqama_widget)
            val now=System.currentTimeMillis()
            val active=if(IqamaNativeScheduler.enabled(c)){
                PrayerTimes.events(c,LocalDate.now().minusDays(1)).lastOrNull{event->
                    val d=IqamaNativeScheduler.durations(c,event.id)
                    !FridaySchedule.suppress(c,event.id,event.at) &&
                        now>=event.at && now<event.at+d.totalMs
                }
            }else null
            val next=if(active==null)PrayerTimes.events(c).firstOrNull{it.at>now} else null
            val prayerName=PrayerTimes.names[active?.id ?: next?.id] ?: ""
            val caption=when {
                !IqamaNativeScheduler.enabled(c) -> "إعداد الإقامة متوقف"
                active==null && next!=null -> "تبدأ العدادات عند الأذان القادم"
                active==null -> "لا توجد مواقيت محفوظة"
                else -> "الإقامة — ${PrayerTimes.names[active.id]}"
            }
            val titles=mapOf(
                R.id.widget_iqama_prayer to (prayerName to 19f),
                R.id.widget_iqama_before_title to ("باقي على الإقامة" to 19f),
                R.id.widget_iqama_elapsed_title to ("مضى على الإقامة" to 19f),
                R.id.widget_iqama_state to (caption to 13f)
            )
            WidgetAppearance.decorate(c,v,R.id.widget_iqama_root,titles,"iqama")
            val beforeId=R.id.widget_iqama_before_counter
            val elapsedId=R.id.widget_iqama_elapsed_counter
            fun stopped(id:Int) {
                v.setChronometer(id,SystemClock.elapsedRealtime(),"%s",false)
                v.setTextViewText(id,"00:00")
            }
            if(active!=null){
                val threshold=active.at+IqamaNativeScheduler.durations(c,active.id).beforeMs
                if(now<threshold){
                    v.setChronometer(beforeId,SystemClock.elapsedRealtime()+(threshold-now),"%s",true)
                    v.setChronometerCountDown(beforeId,true)
                    stopped(elapsedId)
                }else{
                    stopped(beforeId)
                    v.setChronometer(elapsedId,SystemClock.elapsedRealtime()-(now-threshold),"%s",true)
                    v.setChronometerCountDown(elapsedId,false)
                }
            }else{
                stopped(beforeId)
                stopped(elapsedId)
            }
            WidgetAppearance.decorateCounter(c,v,beforeId,"iqama",29f)
            WidgetAppearance.decorateCounter(c,v,elapsedId,"iqama",29f)
            v.setOnClickPendingIntent(R.id.widget_iqama_root,PendingIntent.getActivity(c,60531,
                Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){PrayerWidget.update(c);AdhanSchedule.schedule(c)}
    override fun onAppWidgetOptionsChanged(c:Context,m:AppWidgetManager,id:Int,options:Bundle){PrayerWidget.update(c)}
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
