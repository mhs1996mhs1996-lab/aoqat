package com.aoqat.calendar

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.widget.RemoteViews
import java.time.LocalDate

/**
 * Two adjacent capsules, matching the app's main countdown strip:
 * next adhan on the right and the active before/after iqama on the left.
 * Uses local prayer times, without changing notifications or alarm logic.
 */
class PrayerCombinedWidget:AppWidgetProvider(){
    companion object {
        fun views(c:Context):RemoteViews {
            val v=RemoteViews(c.packageName,R.layout.prayer_combined_widget)
            val now=System.currentTimeMillis()
            val next=PrayerTimes.events(c).firstOrNull{it.at>now}
            val active=if(IqamaNativeScheduler.enabled(c)){
                PrayerTimes.events(c,LocalDate.now().minusDays(1)).lastOrNull{event->
                    val duration=IqamaNativeScheduler.durations(c,event.id)
                    !FridaySchedule.suppress(c,event.id,event.at) &&
                        now>=event.at && now<event.at+duration.totalMs
                }
            }else null
            val nextText=if(next==null) "الأذان القادم" else "أذان ${PrayerTimes.names[next.id]} بعد"
            val boundary=active?.let{it.at+IqamaNativeScheduler.durations(c,it.id).beforeMs}
            val afterIqama=boundary!=null && now>=boundary
            val iqamaText=if(afterIqama)"مضى على الإقامة" else "باقي على الإقامة"
            WidgetAppearance.decorate(c,v,R.id.widget_combined_card,mapOf(
                R.id.widget_combined_next_label to (nextText to 14f),
                R.id.widget_combined_iqama_title to (iqamaText to 14f)
            ),"combined")
            v.setChronometer(R.id.widget_combined_next_counter,
                SystemClock.elapsedRealtime()+((next?.at?:now)-now),"%s",next!=null)
            v.setChronometerCountDown(R.id.widget_combined_next_counter,true)
            if(next==null)v.setTextViewText(R.id.widget_combined_next_counter,"--:--")
            val iqamaCounter=R.id.widget_combined_iqama_counter
            if(boundary==null) {
                v.setChronometer(iqamaCounter,SystemClock.elapsedRealtime(),"%s",false)
                v.setTextViewText(iqamaCounter,"00:00")
            }else if(now<boundary){
                v.setChronometer(iqamaCounter,SystemClock.elapsedRealtime()+boundary-now,"%s",true)
                v.setChronometerCountDown(iqamaCounter,true)
            }else{
                v.setChronometer(iqamaCounter,SystemClock.elapsedRealtime()-(now-boundary),"%s",true)
                v.setChronometerCountDown(iqamaCounter,false)
            }
            WidgetAppearance.decorateCounter(c,v,R.id.widget_combined_next_counter,"combined",15f)
            WidgetAppearance.decorateCounter(c,v,iqamaCounter,"combined",15f)
            v.setOnClickPendingIntent(R.id.widget_combined_root,PendingIntent.getActivity(c,60540,
                Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){PrayerWidget.update(c)}
    override fun onAppWidgetOptionsChanged(c:Context,m:AppWidgetManager,id:Int,options:android.os.Bundle){PrayerWidget.update(c)}
}
