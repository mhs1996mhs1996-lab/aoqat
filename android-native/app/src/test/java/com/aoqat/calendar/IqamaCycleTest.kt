package com.aoqat.calendar

import org.junit.Assert.*
import org.junit.Test

class IqamaCycleTest {
    @Test fun beginsAtTenMinutesAndCountsDown() {
        assertEquals(IqamaCycle.Phase.REMAINING, IqamaCycle.frame(0).phase)
        assertEquals("10:00", IqamaCycle.frame(0).clock())
        assertEquals("09:59", IqamaCycle.frame(1000).clock())
        assertEquals("00:01", IqamaCycle.frame(599999).clock())
    }
    @Test fun switchesAtExactIqamaBoundary() {
        assertEquals(IqamaCycle.Phase.ELAPSED, IqamaCycle.frame(600000).phase)
        assertEquals("00:00", IqamaCycle.frame(600000).clock())
        assertEquals("00:01", IqamaCycle.frame(601000).clock())
    }
    @Test fun finishesAtTwentyMinutesAndNeverRunsPastIt() {
        assertEquals("09:59", IqamaCycle.frame(1199999).clock())
        for (age in listOf(1200000L, 1201000L, 39L * 60000L, 86400000L)) {
            assertEquals(IqamaCycle.Phase.FINISHED, IqamaCycle.frame(age).phase)
            assertEquals("10:00", IqamaCycle.frame(age).clock())
        }
    }
    @Test fun noNegativeOrOversizedValueAcrossEntireCycle() {
        for (age in -1000L..1201000L step 17) {
            val frame = IqamaCycle.frame(age)
            assertTrue(frame.seconds in 0L..600L)
            assertFalse(frame.clock().contains("-"))
        }
    }
    @Test fun lateAlarmRecoversCorrectPhaseWithoutRestarting() {
        assertEquals("05:00", IqamaCycle.frame(300000).clock())
        assertEquals("05:47", IqamaCycle.frame(947000).clock())
        assertEquals(IqamaCycle.Phase.FINISHED, IqamaCycle.frame(39 * 60000L).phase)
    }
    @Test fun monotonicAnchorPreservesPhaseAcrossSleepAndWallClockChanges() {
        val anchor = 4000000L
        assertEquals("10:00", IqamaCycle.frame(anchor - anchor).clock())
        assertEquals("05:00", IqamaCycle.frame(anchor + 300000 - anchor).clock())
        assertEquals("05:00", IqamaCycle.frame(anchor + 900000 - anchor).clock())
        assertEquals(IqamaCycle.Phase.FINISHED, IqamaCycle.frame(anchor + 1200000 - anchor).phase)
    }
}
