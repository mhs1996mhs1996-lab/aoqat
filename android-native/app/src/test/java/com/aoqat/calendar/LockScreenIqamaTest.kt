package com.aoqat.calendar

import android.app.Notification
import android.content.Context
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/** Strict phase and end-of-window checks; no new clock or background worker. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk=[34])
class LockScreenIqamaTest {
    private val c:Context get()=RuntimeEnvironment.getApplication()
    private val prayerAt=1_700_000_000_000L
    private val before=10*60_000L
    private val total=20*60_000L
    private fun phase(now:Long)=LockScreenIqama.phase("dhuhr",prayerAt,before,total,now)

    @Test fun countdownStartsAtPrayerAndIsNotShownEarly() {
        assertNull(phase(prayerAt-1))
        val state=phase(prayerAt)!!
        assertEquals(LockScreenIqama.Phase.REMAINING,state.phase)
        assertEquals("باقي على الإقامة",state.title)
        assertEquals(before,state.remaining(prayerAt))
    }
    @Test fun upcomingPrayerAlwaysHasABackgroundAlarm(){
        assertEquals(prayerAt,LockScreenIqama.nextWakeAt(prayerAt-5_000L,null,
            listOf(prayerAt,prayerAt+3600_000L)))
    }
    @Test fun zeroAndFinishHaveIndependentBoundaryAlarms(){
        assertEquals(prayerAt+before,LockScreenIqama.nextWakeAt(prayerAt,phase(prayerAt),emptyList()))
        assertEquals(prayerAt+total,LockScreenIqama.nextWakeAt(prayerAt+before,phase(prayerAt+before),emptyList()))
        assertEquals(prayerAt+3600_000L,LockScreenIqama.nextWakeAt(prayerAt+total,null,listOf(prayerAt+3600_000L)))
    }
    @Test fun zeroSwitchesToElapsedWithNoOverlap() {
        assertEquals(LockScreenIqama.Phase.REMAINING,phase(prayerAt+before-1)!!.phase)
        val atZero=phase(prayerAt+before)!!
        assertEquals(LockScreenIqama.Phase.ELAPSED,atZero.phase)
        assertEquals(0L,atZero.remaining(prayerAt+before))
        assertEquals("مضى على الإقامة",atZero.title)
        assertEquals(60_000L,phase(prayerAt+before+60_000L)!!.remaining(prayerAt+before+60_000L))
    }
    @Test fun postIqamaRowDisappearsPreciselyAtConfiguredEnd() {
        assertNotNull(phase(prayerAt+total-1))
        assertNull(phase(prayerAt+total))
        assertNull(phase(prayerAt+total+1))
        assertNull(LockScreenIqama.phase("dhuhr",prayerAt,0,0,prayerAt))
        assertNull(LockScreenIqama.phase("sunrise",prayerAt,before,total,prayerAt))
    }
    @Test fun lockNotificationRetainsOnePublicSurfaceAndBothRows() {
        val n=NextPrayerService.lockNotification(c)
        assertEquals(R.layout.notification_lock_next,n.contentView.layoutId)
        assertNotNull(n.publicVersion)
        assertEquals(R.layout.notification_lock_next,n.publicVersion.contentView.layoutId)
        assertNull(n.fullScreenIntent)
        assertTrue(n.flags and Notification.FLAG_ONGOING_EVENT != 0)
    }
    @Test fun phaseMathDoesNotDependOnSeparateNotificationToggle(){
        c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit().putBoolean("enabled",false).commit()
        assertEquals(LockScreenIqama.Phase.REMAINING,phase(prayerAt)!!.phase)
        assertEquals(LockScreenIqama.Phase.ELAPSED,phase(prayerAt+before)!!.phase)
    }
    @Test fun lockScreenBoundaryReceiverIsPrivate(){
        val info=c.packageManager.getReceiverInfo(
            android.content.ComponentName(c,LockScreenIqamaBoundaryReceiver::class.java),0)
        assertFalse(info.exported)
    }
}
