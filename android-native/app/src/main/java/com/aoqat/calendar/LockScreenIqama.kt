package com.aoqat.calendar

import android.content.Context
import java.time.LocalDate

/**
 * Only reads the existing native iqama preferences and offline prayer events.
 * All boundaries are shared with IqamaNativeScheduler and the original service.
 * Only silent lock-screen display boundaries are scheduled, not adhan alarms.
 */
object LockScreenIqama {
    enum class Phase { REMAINING, ELAPSED }
    data class Display(val prayerId:String, val phase:Phase, val startAt:Long, val threshold:Long, val endAt:Long) {
        fun remaining(now:Long):Long=if(phase==Phase.REMAINING)(threshold-now).coerceAtLeast(0L)
            else (now-threshold).coerceAtLeast(0L)
        val title:String get()=if(phase==Phase.REMAINING)"باقي على الإقامة" else "مضى على الإقامة"
    }
    // Half-open intervals avoid a second competing clock at the zero boundary.
    fun phase(prayerId:String, prayerAt:Long, beforeMs:Long, totalMs:Long, now:Long):Display? {
        if(prayerAt<=0L || prayerId !in PrayerTimes.ids || beforeMs<0L || totalMs<=beforeMs ||
            now<prayerAt || now>=prayerAt+totalMs)return null
        val zero=prayerAt+beforeMs
        return Display(prayerId,if(now<zero)Phase.REMAINING else Phase.ELAPSED,
            prayerAt,zero,prayerAt+totalMs)
    }
    fun current(context:Context,now:Long=System.currentTimeMillis()):Display? {
        // Lock-screen countdown uses saved durations even when the separate
        // foreground iqama notification is turned off.
        return PrayerTimes.events(context,LocalDate.now().minusDays(1))
            .lastOrNull { prayer ->
                val durations=IqamaNativeScheduler.durations(context,prayer.id)
                !FridaySchedule.suppress(context,prayer.id,prayer.at) &&
                    phase(prayer.id,prayer.at,durations.beforeMs,durations.totalMs,now)!=null
            }?.let{p->
                val d=IqamaNativeScheduler.durations(context,p.id)
                phase(p.id,p.at,d.beforeMs,d.totalMs,now)
            }
    }
}
