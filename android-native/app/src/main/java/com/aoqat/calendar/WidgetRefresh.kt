package com.aoqat.calendar

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import java.time.LocalDate

/**
 * Widget-only phase refresh. No changes to adhan, notification or iqama alarms.
 * Live chronometers count independently between boundary updates.
 */
object WidgetRefresh {
    const val ACTION="com.aoqat.calendar.WIDGET_REFRESH"
    private const val REQUEST=60593
    fun schedule(c:Context) {
        val manager=AppWidgetManager.getInstance(c)
        val installed=listOf(PrayerWidget::class.java,
            FivePrayerWidget::class.java,FivePrayerCompactWidget::class.java,
            FivePrayerFeaturedWidget::class.java,PrayerCombinedWidget::class.java,
            IqamaCountdownWidget::class.java).any {
            manager.getAppWidgetIds(ComponentName(c,it)).isNotEmpty()
        }
        val am=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pending=PendingIntent.getBroadcast(c,REQUEST,
            Intent(c,WidgetRefreshReceiver::class.java).setAction(ACTION),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        am.cancel(pending)
        if(!installed)return
        val now=System.currentTimeMillis()
        val next=PrayerTimes.events(c,LocalDate.now().minusDays(1)).asSequence()
            .filterNot{FridaySchedule.suppress(c,it.id,it.at)}
            .flatMap{event->
                val durations=IqamaNativeScheduler.durations(c,event.id)
                sequenceOf(event.at,event.at+durations.beforeMs,event.at+durations.totalMs)
            }
            .filter{it>now+250L}
            .minOrNull() ?: return
        val at=next+300L
        if(Build.VERSION.SDK_INT<31 || am.canScheduleExactAlarms())
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending)
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending)
    }
}
class WidgetRefreshReceiver:BroadcastReceiver(){
    override fun onReceive(c:Context,i:Intent?) {
        if(i?.action==WidgetRefresh.ACTION)PrayerWidget.update(c)
    }
}
