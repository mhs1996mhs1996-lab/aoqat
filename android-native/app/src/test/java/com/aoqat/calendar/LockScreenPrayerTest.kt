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

    @Test fun visibleLockScreenChannelKeepsNormalImportanceWithoutSoundOrVibration() {
        val notification=NextPrayerService.lockNotification(c)
        val manager=c.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        val channel=manager.getNotificationChannel(NextPrayerService.LOCK_CHANNEL)
        assertNotNull(channel)
        assertEquals(android.app.NotificationManager.IMPORTANCE_DEFAULT,channel.importance)
        assertNull("The visible notification must not play an audible alert",channel.sound)
        assertFalse(channel.shouldVibrate())
        assertEquals(Notification.VISIBILITY_PUBLIC,channel.lockscreenVisibility)
        assertEquals(Notification.VISIBILITY_PUBLIC,notification.visibility)
        assertTrue("Dedicated v2 channel prevents old low-importance setting from being reused",
            NextPrayerService.LOCK_CHANNEL.endsWith("_v2"))
    }

    @Test fun notificationStatusReportsDisabledWithoutAssumingHonorShowsLockWidget() {
        c.getSharedPreferences("lockscreen_prayer_v1",Context.MODE_PRIVATE).edit().clear().commit()
        val state=org.json.JSONObject(LockScreenPrayer.status(c))
        assertFalse(state.getBoolean("enabled"))
        assertTrue(state.has("notificationsAllowed"))
        assertTrue(state.has("channelAllowed"))
        assertTrue(state.has("notificationActive"))
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
