package com.aoqat.calendar

import org.junit.Assert.*
import org.junit.Test

class IqamaCycleTest {
    @Test fun allConfiguredDurationsUseOneIqamaBoundaryWithoutNegativeValues() {
        for (before in listOf(5,10,15,20,25,30)) for (after in listOf(5,10,15,20,25,30)) {
            val durations = IqamaCycle.Durations(before,after)
            val anchor = 4_000_000L
            assertEquals("%02d:00".format(before), IqamaCycle.frame(0,durations).clock())
            assertEquals("00:01", IqamaCycle.frame(durations.beforeMs-1,durations).clock())
            assertEquals("00:00", IqamaCycle.frame(durations.beforeMs,durations).clock())
            assertEquals(IqamaCycle.Phase.ELAPSED, IqamaCycle.frame(durations.beforeMs,durations).phase)
            assertEquals(anchor+durations.beforeMs,IqamaCycle.display(anchor,anchor,durations)!!.baseRealtime)
            assertEquals(anchor+durations.beforeMs,IqamaCycle.display(anchor,anchor+durations.beforeMs,durations)!!.baseRealtime)
            assertNull(IqamaCycle.display(anchor,anchor+durations.totalMs,durations))
            for (age in 0L..durations.totalMs step 1000L) {
                val frame=IqamaCycle.frame(age,durations)
                assertTrue(frame.seconds>=0)
                assertFalse(frame.clock().contains("-"))
            }
        }
    }
    @Test fun displayHasOneZeroPointAndAbsoluteBoundaries() {
        val anchor = 4_000_000L
        val remaining = IqamaCycle.display(anchor, anchor + 91_000L)!!
        val later = IqamaCycle.display(anchor, anchor + 529_000L)!!
        assertEquals(remaining.baseRealtime, later.baseRealtime)
        assertTrue(later.countDown)
        assertEquals(anchor + 600_000L, later.nextBoundary)
        val elapsed = IqamaCycle.display(anchor, anchor + 947_000L)!!
        assertEquals(remaining.baseRealtime, elapsed.baseRealtime)
        assertFalse(elapsed.countDown)
        assertEquals(anchor + 1_200_000L, elapsed.nextBoundary)
        assertNull(IqamaCycle.display(anchor, anchor - 1L))
        assertNull(IqamaCycle.display(anchor, anchor + 1_200_000L))
        assertNull(IqamaCycle.display(anchor, anchor + 39 * 60_000L))
    }
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
