package com.aoqat.calendar

import android.content.Context
import java.time.LocalDate

/**
 * The ONE optional second line below the next-prayer countdown.
 * Friday has priority over ordinary iqama; all timestamps come from the
 * existing offline prayer table and the user's saved duration settings.
 * No changes to adhan playback, widget state, timers, or network access.
 */
object LockScreenSupplement {
    enum class Kind { IQAMA_WAITING, IQAMA_ELAPSED, FRIDAY_FIRST, FRIDAY_SERMON_WAITING, FRIDAY_SERMON_ELAPSED }

    data class Row(
        val kind: Kind,
        val title: String,
        val clockAt: Long,
        val countDown: Boolean,
        val until: Long
    ) {
        fun elapsedMillis(now: Long): Long =
            (if (countDown) clockAt - now else now - clockAt).coerceAtLeast(0L)
    }

    fun fromFriday(t: FridayCycle.Timing, now: Long): Row? {
        val frame = FridayCycle.frame(t, now) ?: return null
        val kind = when (frame.title) {
            "باقي على أذان الجمعة الأول" -> Kind.FRIDAY_FIRST
            "باقي على الخطبة" -> Kind.FRIDAY_SERMON_WAITING
            else -> Kind.FRIDAY_SERMON_ELAPSED
        }
        return Row(kind, frame.title, frame.base, frame.down, frame.boundary)
    }

    fun fromIqama(i: LockScreenIqama.Display): Row =
        Row(
            if (i.phase == LockScreenIqama.Phase.REMAINING) Kind.IQAMA_WAITING else Kind.IQAMA_ELAPSED,
            i.title, i.threshold, i.phase == LockScreenIqama.Phase.REMAINING,
            if (i.phase == LockScreenIqama.Phase.REMAINING) i.threshold else i.endAt
        )

    fun current(context: Context, now: Long = System.currentTimeMillis()): Row? {
        if (FridaySchedule.enabled(context)) {
            val friday = PrayerTimes.events(context, LocalDate.now().minusDays(1))
                .asSequence().filter { it.friday }
                .mapNotNull { fromFriday(FridaySchedule.timing(context, it.at), now) }
                .firstOrNull()
            if (friday != null) return friday
        }
        return LockScreenIqama.current(context, now)?.let(::fromIqama)
    }

    /** Android alarms refresh only at the actual transition boundaries.
     * Friday phases: start / first adhan / sermon / sermon end.
     * Iqama phases: start / iqama zero / configured after-iqama end.
     */
    fun nextRefreshAt(context: Context, now: Long = System.currentTimeMillis()): Long? {
        val nextIqama = LockScreenIqama.nextRefreshAt(context, now)
        val nextFriday = if (FridaySchedule.enabled(context)) {
            PrayerTimes.events(context, LocalDate.now().minusDays(1))
                .asSequence().filter { it.friday }
                .flatMap {
                    val t = FridaySchedule.timing(context, it.at)
                    sequenceOf(t.start, t.first, t.second, t.end)
                }.filter { it > now }.minOrNull()
        } else null
        return listOfNotNull(nextIqama, nextFriday).minOrNull()
    }
}
