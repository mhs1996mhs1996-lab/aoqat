package com.aoqat.calendar

import org.junit.Assert.*
import org.junit.Test

class LockIqamaCountdownTest {
    private val duration=IqamaCycle.Durations(beforeMinutes=10,afterMinutes=10)
    private val prayerAt=1_000_000L
    private val monotonic=5_000_000L

    @Test fun waitingBeforePrayerNeverShowsAnIqamaRow() {
        assertNull(LockIqamaCountdown.at("dhuhr",prayerAt,prayerAt-1L,monotonic,duration))
        assertNull(LockIqamaCountdown.at("sunrise",prayerAt,prayerAt+1000L,monotonic,duration))
    }
    @Test fun beforeIqamaCountsDownToOriginalZeroPoint() {
        val s=LockIqamaCountdown.at("dhuhr",prayerAt,prayerAt+599_000L,monotonic,duration)!!
        assertEquals("باقي على الإقامة",s.label)
        assertEquals("00:01",s.clock())
        assertTrue(s.countDown)
        assertEquals(monotonic+1000L,s.baseRealtime)
    }
    @Test fun atZeroSwitchesToCountUpWithoutNegativeNumbers() {
        val s=LockIqamaCountdown.at("dhuhr",prayerAt,prayerAt+600_000L,monotonic,duration)!!
        assertEquals("مضى على الإقامة",s.label)
        assertEquals("00:00",s.clock())
        assertFalse(s.countDown)
        assertEquals(monotonic,s.baseRealtime)
        val later=LockIqamaCountdown.at("dhuhr",prayerAt,prayerAt+660_000L,monotonic+60_000L,duration)!!
        assertEquals("01:00",later.clock())
        assertEquals(s.baseRealtime,later.baseRealtime)
    }
    @Test fun afterExpiryOnlyIqamaRowGoesAway() {
        assertNotNull(LockIqamaCountdown.at("dhuhr",prayerAt,prayerAt+1_199_999L,monotonic,duration))
        assertNull(LockIqamaCountdown.at("dhuhr",prayerAt,prayerAt+1_200_000L,monotonic,duration))
    }
    @Test fun userSpecifiedFiveAndThirtyMinuteLimitsAreHonored() {
        val custom=IqamaCycle.Durations(5,30)
        val at=LockIqamaCountdown.at("asr",prayerAt,prayerAt+300_000L,monotonic,custom)!!
        assertEquals("مضى على الإقامة",at.label)
        assertFalse(at.countDown)
        assertNull(LockIqamaCountdown.at("asr",prayerAt,prayerAt+2_100_000L,monotonic,custom))
    }
}
