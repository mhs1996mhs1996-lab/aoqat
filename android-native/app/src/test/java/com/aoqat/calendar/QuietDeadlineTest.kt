package com.aoqat.calendar

import org.junit.Assert.*
import org.junit.Test

class QuietDeadlineTest {
    private val at=1_000_000L
    @Test fun newIqamaQuietUsesFullUserSelectedSixteenMinutes() {
        val iqama=at+15*60_000L
        val requested=iqama+16*60_000L
        val elapsedEnd=iqama+10*60_000L
        assertEquals(requested,QuietDeadline.merge(requested,elapsedEnd,false))
        assertTrue(QuietDeadline.merge(requested,elapsedEnd,false)>elapsedEnd)
    }
    @Test fun oldTwelveMinuteQuietMustNotCapNewSixteenMinuteRequest() {
        val iqama=at+15*60_000L
        val oldEnd=iqama+12*60_000L
        val newEnd=iqama+16*60_000L
        assertEquals(newEnd,QuietDeadline.merge(newEnd,oldEnd,true))
    }
    @Test fun overlappingQuietCannotPrematurelyRestoreEarlierRequest() {
        val iqama=at+15*60_000L
        val oldEnd=iqama+16*60_000L
        val shorterNewRequest=iqama+10*60_000L
        assertEquals(oldEnd,QuietDeadline.merge(shorterNewRequest,oldEnd,true))
    }
    @Test fun freshCycleNeverInheritsStaleEndAfterRestoration() {
        val newEnd=at+16*60_000L
        assertEquals(newEnd,QuietDeadline.merge(newEnd,at+99*60_000L,false))
    }
}
