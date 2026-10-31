package com.aoqat.calendar

import android.app.Notification
import android.content.Context
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class PhoneScreenAlertsTest {
    private val context:Context get()=RuntimeEnvironment.getApplication()

    @Test fun firstInstallEnablesScreenButUserCanDisableWithoutLosingAlarmSettings() {
        assertTrue("New installation should allow phone illumination",PhoneScreenAlerts.enabled(context))
        val previous="""{"enabled":true,"items":{"asr":{"enabled":true}}}"""
        PrayerAlarm.prefs(context).edit().putString("settings",previous).commit()
        PhoneScreenAlerts.setEnabled(context,false)
        assertFalse(PhoneScreenAlerts.enabled(context))
        assertEquals(previous,PrayerAlarm.settings(context).toString())
        PhoneScreenAlerts.setEnabled(context,true)
        assertTrue(PhoneScreenAlerts.enabled(context))
    }

    @Test fun explicitPrayerNotificationWakesOnlyWhenSelectedAndSwitchOn() {
        val prefs=context.getSharedPreferences("prayer_notifications_v1",Context.MODE_PRIVATE)
        prefs.edit().putString("settings",
            """{"enabled":true,"prayers":{"asr":true,"fajr":false}}""").commit()
        PhoneScreenAlerts.setEnabled(context,true)
        val selected=PrayerNotifications.notification(context,"asr",false)
        assertNotNull("An enabled prayer reminder should have FSI",selected.fullScreenIntent)
        val intent=org.robolectric.Shadows.shadowOf(selected.fullScreenIntent).savedIntent
        assertEquals(AdhanScreenActivity::class.java.name,intent.component!!.className)
        assertTrue(intent.getBooleanExtra("notificationOnly",false))
        assertEquals("asr",intent.getStringExtra("prayerId"))
        assertNull("An unselected prayer must never request full screen",
            PrayerNotifications.notification(context,"fajr",false).fullScreenIntent)
        assertNull("Preview is never a lockscreen interrupt",
            PrayerNotifications.notification(context,"asr",false,preview=true).fullScreenIntent)
        PhoneScreenAlerts.setEnabled(context,false)
        assertNull(PrayerNotifications.notification(context,"asr",false).fullScreenIntent)
        assertTrue("Turning off screen wake must not disable the selected reminder",
            PrayerNotifications.selected(context,"asr"))
        assertEquals("prayer_due_system_v2",selected.channelId)
    }

    @Test fun publishReminderKeepsItsActionsEvenWhenScreenIsOff() {
        val preferences=context.getSharedPreferences("publish_alarm_settings",Context.MODE_PRIVATE)
        preferences.edit().putBoolean("enabled",true).commit()
        PhoneScreenAlerts.setEnabled(context,true)
        val on=AlarmUi.buildAlarmNotification(context)
        assertNotNull(on.fullScreenIntent)
        assertEquals("STOP",org.robolectric.Shadows.shadowOf(on.deleteIntent).savedIntent.action)
        assertEquals(2,on.actions.size)
        PhoneScreenAlerts.setEnabled(context,false)
        val off=AlarmUi.buildAlarmNotification(context)
        assertNull(off.fullScreenIntent)
        assertNotNull(off.contentIntent)
        assertEquals(2,off.actions.size)
        assertTrue(AlarmScheduler.enabled(context))
    }

    @Test fun enabledUserHasStatusWithIndependentAndroidPermissions() {
        PhoneScreenAlerts.setEnabled(context,true)
        val value=PhoneScreenAlerts.status(context)
        assertTrue(value.getBoolean("enabled"))
        assertTrue(value.has("fullScreen"))
        assertTrue(value.has("notifications"))
        assertEquals(android.os.Build.VERSION.SDK_INT>=34,value.getBoolean("requiresGrant"))
    }
}
