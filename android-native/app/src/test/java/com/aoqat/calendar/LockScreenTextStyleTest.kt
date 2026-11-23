package com.aoqat.calendar

import android.content.Context
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[34])
class LockScreenTextStyleTest {
    private val c:Context get()=RuntimeEnvironment.getApplication()

    @Test fun sixNamedStatesAreValidatedAndUnknownStatesRejected(){
        for(state in arrayOf("prayer","iqama_wait","iqama_elapsed",
                             "friday_first","sermon_wait","sermon_elapsed"))
            assertTrue(LockScreenTextStyle.validState(state))
        assertFalse(LockScreenTextStyle.validState("ota"))
        assertFalse(LockScreenTextStyle.configure(c,"ota",17,19,2))
        assertFalse(LockScreenTextStyle.configure(c,"prayer",80,20,2))
        assertFalse(LockScreenTextStyle.configure(c,"prayer",18,17,12))
    }

    @Test fun preferencesPersistWithoutErasingOtherPrayerOrQuranData(){
        val other=c.getSharedPreferences("test_preserve_user_data",Context.MODE_PRIVATE)
        other.edit().putString("prayer_settings","kept").commit()
        assertTrue(LockScreenTextStyle.configure(c,"prayer",19,21,2))
        assertTrue(LockScreenTextStyle.configure(c,"iqama_elapsed",14,15,3))
        val prayer=LockScreenTextStyle.read(c,"prayer")
        val iqama=LockScreenTextStyle.read(c,"iqama_elapsed")
        assertEquals(19,prayer.getInt("title"))
        assertEquals(21,prayer.getInt("clock"))
        assertEquals(2,prayer.getInt("color"))
        assertEquals(14,iqama.getInt("title"))
        assertEquals(15,iqama.getInt("clock"))
        assertEquals(3,iqama.getInt("color"))
        assertEquals("kept",other.getString("prayer_settings",""))
        // An untouched Friday countdown still uses its previous native typography.
        assertEquals(15,LockScreenTextStyle.read(c,"friday_first").getInt("title"))
    }

    @Test fun changingFontDoesNotReplaceSilentOngoingNotificationChannel(){
        assertTrue(LockScreenTextStyle.configure(c,"prayer",18,18,2))
        val n=NextPrayerService.lockNotification(c)
        assertEquals(NextPrayerService.LOCK_CHANNEL,n.channelId)
        assertNull(n.fullScreenIntent)
        assertNotNull(n.contentView)
    }
}
