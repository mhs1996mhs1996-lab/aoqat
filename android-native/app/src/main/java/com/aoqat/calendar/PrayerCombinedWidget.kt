package com.aoqat.calendar

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import java.time.LocalDate

/** Independent compact combination. Reads the same on-device prayer and iqama schedules. */
class PrayerCombinedWidget:AppWidgetProvider(){
    companion object {
        fun views(c:Context):RemoteViews {
            val v=RemoteViews(c.packageName,R.layout.prayer_combined_widget)
            val now=System.currentTimeMillis()
            val next=PrayerTimes.events(c).firstOrNull{it.at>now}
            val active=if(IqamaNativeScheduler.enabled(c)){
                PrayerTimes.events(c,LocalDate.now().minusDays(1)).lastOrNull{ event->
                    val duration=IqamaNativeScheduler.durations(c,event.id)
                    !FridaySchedule.suppress(c,event.id,event.at) &&
                        now>=event.at && now<event.at+duration.totalMs
                }
            } else null
            val heading=if(next==null)"الصلاة القادمة" else "باقي على صلاة ${PrayerTimes.names[next.id]}"
            WidgetAppearance.decorate(c,v,R.id.widget_combined_card,mapOf(
                R.id.widget_combined_next_label to (heading to 18f),
                R.id.widget_combined_prayer to ((PrayerTimes.names[active?.id ?: next?.id] ?: "") to 19f),
                R.id.widget_combined_before_title to ("باقي على الإقامة" to 16f),
                R.id.widget_combined_after_title to ("مضى على الإقامة" to 16f)
            ),"combined")
            v.setChronometer(R.id.widget_combined_next_counter,
                SystemClock.elapsedRealtime()+((next?.at?:now)-now),"%s",next!=null)
            v.setChronometerCountDown(R.id.widget_combined_next_counter,true)
            if(next==null)v.setTextViewText(R.id.widget_combined_next_counter,"--:--")
            fun stopped(id:Int) {
                v.setChronometer(id,SystemClock.elapsedRealtime(),"%s",false)
                v.setTextViewText(id,"00:00")
            }
            val before=R.id.widget_combined_before_counter
            val after=R.id.widget_combined_after_counter
            if(active==null){ stopped(before); stopped(after) }
            else{
                val boundary=active.at+IqamaNativeScheduler.durations(c,active.id).beforeMs
                if(now<boundary){
                    v.setChronometer(before,SystemClock.elapsedRealtime()+boundary-now,"%s",true)
                    v.setChronometerCountDown(before,true)
                    stopped(after)
                }else{
                    stopped(before)
                    v.setChronometer(after,SystemClock.elapsedRealtime()-(now-boundary),"%s",true)
                    v.setChronometerCountDown(after,false)
                }
            }
            for(id in listOf(R.id.widget_combined_next_counter,
                R.id.widget_combined_before_counter,R.id.widget_combined_after_counter)) {
                WidgetAppearance.decorateCounter(c,v,id,"combined",20f)
            }
            v.setViewVisibility(R.id.widget_combined_prayer,if(active!=null)View.VISIBLE else View.GONE)
            v.setOnClickPendingIntent(R.id.widget_combined_root,PendingIntent.getActivity(c,60540,
                Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){PrayerWidget.update(c)}
    override fun onAppWidgetOptionsChanged(c:Context,m:AppWidgetManager,id:Int,options:android.os.Bundle){PrayerWidget.update(c)}
}
