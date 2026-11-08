package com.aoqat.calendar

import android.app.Notification
import android.content.Context
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/** This option is an Android notification, not an unsupported Honor lock-screen widget. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk=[34])
class LockScreenPrayerTest {
    private val c:Context get()=RuntimeEnvironment.getApplication()

    @Test fun remainsDisabledUntilTheUserExplicitlyOptsIn() {
        c.getSharedPreferences("lockscreen_prayer_v1",Context.MODE_PRIVATE).edit().clear().commit()
        assertFalse(LockScreenPrayer.enabled(c))
    }

    @Test fun nativeCountdownIsSilentPublicOngoingAndHasNoFullScreenTakeover() {
        val notification=NextPrayerService.lockNotification(c)
        assertEquals(NextPrayerService.LOCK_CHANNEL,notification.channelId)
        assertEquals(Notification.VISIBILITY_PUBLIC,notification.visibility)
        assertEquals(Notification.CATEGORY_STATUS,notification.category)
        assertTrue(notification.flags and Notification.FLAG_ONGOING_EVENT != 0)
        assertNotNull(notification.contentIntent)
        assertNull(notification.fullScreenIntent)
    }
}
