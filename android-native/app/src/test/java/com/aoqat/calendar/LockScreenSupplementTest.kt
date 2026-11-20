package com.aoqat.calendar

import org.junit.Assert.*
import org.junit.Test

/** Boundary tests use fixed times; they cannot play audio or modify user settings. */
class LockScreenSupplementTest {
    private val second = 1_700_000_000_000L
    private val timing = FridayCycle.Timing(second, reminder = 15, sermon = 35)

    @Test fun fridayFirstCallStartsOnlyAtConfiguredReminderBoundary() {
        assertNull(LockScreenSupplement.fromFriday(timing, timing.start - 1))
        val early = LockScreenSupplement.fromFriday(timing, timing.start)!!
        assertEquals(LockScreenSupplement.Kind.FRIDAY_FIRST, early.kind)
        assertEquals("باقي على أذان الجمعة الأول", early.title)
        assertTrue(early.countDown)
        assertEquals(timing.first - timing.start, early.elapsedMillis(timing.start))
        assertEquals(timing.first, early.until)
    }

    @Test fun fridayFirstCallReplacedBySermonThenElapsedAtExactBoundaries() {
        assertEquals(LockScreenSupplement.Kind.FRIDAY_FIRST,
            LockScreenSupplement.fromFriday(timing, timing.first - 1)!!.kind)
        val before = LockScreenSupplement.fromFriday(timing, timing.first)!!
        assertEquals(LockScreenSupplement.Kind.FRIDAY_SERMON_WAITING, before.kind)
        assertEquals("باقي على الخطبة", before.title)
        assertTrue(before.countDown)
        assertEquals(timing.second, before.until)
        val elapsed = LockScreenSupplement.fromFriday(timing, timing.second)!!
        assertEquals(LockScreenSupplement.Kind.FRIDAY_SERMON_ELAPSED, elapsed.kind)
        assertEquals("مضى على الخطبة", elapsed.title)
        assertFalse(elapsed.countDown)
        assertEquals(0L, elapsed.elapsedMillis(timing.second))
        assertEquals(10_000L, elapsed.elapsedMillis(timing.second+10_000L))
        assertEquals(timing.end, elapsed.until)
        assertNotNull(LockScreenSupplement.fromFriday(timing,timing.end-1))
        assertNull(LockScreenSupplement.fromFriday(timing,timing.end))
    }

    @Test fun iqamaRemainingAndElapsedMapToTheSameSupplementaryLine() {
        val at=1_700_001_000_000L
        val before=10*60_000L
        val total=20*60_000L
        val waiting=LockScreenIqama.phase("asr",at,before,total,at)!!
        val first=LockScreenSupplement.fromIqama(waiting)
        assertEquals(LockScreenSupplement.Kind.IQAMA_WAITING,first.kind)
        assertEquals("باقي على الإقامة",first.title)
        assertTrue(first.countDown)
        assertEquals(at+before,first.until)
        val elapsed=LockScreenIqama.phase("asr",at,before,total,at+before)!!
        val second=LockScreenSupplement.fromIqama(elapsed)
        assertEquals(LockScreenSupplement.Kind.IQAMA_ELAPSED,second.kind)
        assertEquals("مضى على الإقامة",second.title)
        assertFalse(second.countDown)
        assertEquals(at+total,second.until)
        assertNull(LockScreenIqama.phase("asr",at,before,total,at+total))
    }

    @Test fun availableFridayPhasesNeverProduceTwoRows() {
        for (time in listOf(timing.start,timing.first,timing.second,timing.end-1)) {
            val row=LockScreenSupplement.fromFriday(timing,time)
            assertNotNull(row)
            assertEquals(time<timing.second,row!!.countDown)
        }
    }
}
