package com.aoqat.calendar

import android.content.Context
import android.os.SystemClock
import java.time.LocalDate
import java.util.Locale

/**
 * Read-only second clock for the SAME lock-screen prayer notification.
 * Uses the database prayer time and the user's existing before/after durations.
 * Never enables the separate iqama notification, alters silent mode or reschedules adhan.
 */
object LockIqamaCountdown {
    data class State(
        val prayerId:String,
        val phase:IqamaCycle.Phase,
        val label:String,
        val baseRealtime:Long,
        val countDown:Boolean,
        val seconds:Long
    ) {
        fun clock():String=String.format(Locale.US,"%02d:%02d",seconds/60L,seconds%60L)
    }
    fun at(prayerId:String,prayerAt:Long,now:Long,realtime:Long,
           duration:IqamaCycle.Durations):State? {
        if(prayerId !in listOf("fajr","dhuhr","asr","maghrib","isha"))return null
        val age=now-prayerAt
        val display=IqamaCycle.display(realtime-age,realtime,duration)?:return null
        val frame=IqamaCycle.frame(age,duration)
        val label=if(display.phase==IqamaCycle.Phase.REMAINING)
            "باقي على الإقامة" else "مضى على الإقامة"
        return State(prayerId,display.phase,label,display.baseRealtime,display.countDown,frame.seconds)
    }

    private fun eligible(c:Context):List<PrayerTimes.Prayer> =
        PrayerTimes.events(c,LocalDate.now().minusDays(1)).filter {
            it.id!="sunrise" && !FridaySchedule.suppress(c,it.id,it.at)
        }

    fun active(c:Context,now:Long=System.currentTimeMillis(),
               realtime:Long=SystemClock.elapsedRealtime()):State? {
        return eligible(c).asReversed().mapNotNull { p ->
            at(p.id,p.at,now,realtime,IqamaNativeScheduler.durations(c,p.id))
        }.firstOrNull()
    }

    /** Next exact zero/expiry; app keeps ONE lock notification and one boundary alarm. */
    fun nextBoundary(c:Context,now:Long=System.currentTimeMillis()):Long? =
        eligible(c).flatMap { p ->
            val duration=IqamaNativeScheduler.durations(c,p.id)
            listOf(p.at+duration.beforeMs,p.at+duration.totalMs)
        }.filter { it>now }.minOrNull()
}
