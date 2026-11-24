package com.aoqat.calendar

import org.junit.Assert.*
import org.junit.Test

class LockScreenBoundaryRetentionTest {
    @Test fun recalculationCannotSkipAnOverdueZeroOrEnd() {
        assertEquals(1000L,LockScreenIqamaBoundaryReceiver.earliestBoundary(9000L,1000L))
        assertEquals(1000L,LockScreenIqamaBoundaryReceiver.earliestBoundary(null,1000L))
    }
    @Test fun anEarlierNewPhaseBoundaryIsNotDelayed() {
        assertEquals(1000L,LockScreenIqamaBoundaryReceiver.earliestBoundary(1000L,9000L))
    }
    @Test fun firstScheduleDoesNotRequireAnExistingAlarm() {
        assertEquals(9000L,LockScreenIqamaBoundaryReceiver.earliestBoundary(9000L,0L))
        assertNull(LockScreenIqamaBoundaryReceiver.earliestBoundary(null,0L))
    }
}
