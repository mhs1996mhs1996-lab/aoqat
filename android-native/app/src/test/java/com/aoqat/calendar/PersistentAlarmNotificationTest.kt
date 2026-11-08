package com.aoqat.calendar

import android.app.*
import android.content.*
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28])
class PersistentAlarmNotificationTest {
    private val c:Context get()=RuntimeEnvironment.getApplication()

    @Test fun publishingShowsCompactButtonsWhileRingingAndDuringSnooze(){
        c.getSharedPreferences("publish_alarm_settings",0).edit().clear().putBoolean("enabled",true).commit()
        PhoneScreenAlerts.setEnabled(c,true)
        val ringing=AlarmUi.buildAlarmNotification(c)
        assertEquals(2,ringing.actions.size)
        assertNull("Use native notification rather than a separate custom card",ringing.contentView)
        assertNotNull(ringing.fullScreenIntent)
        AlarmScheduler.scheduleSnooze(c,10)
        val snoozed=AlarmUi.buildAlarmNotification(c,true)
        assertNull("Waiting reminder must stay a native notification",snoozed.contentView)
        assertEquals(1,snoozed.actions.size)
        assertEquals("إيقاف التنبيه",snoozed.actions[0].title.toString())
        assertNull("Snooze must never restart fullscreen alarm",snoozed.fullScreenIntent)
        assertTrue((snoozed.flags and Notification.FLAG_ONGOING_EVENT)!=0)
        val at=AlarmScheduler.snoozeUntil(c)
        assertTrue(at-System.currentTimeMillis() in 599000L..600500L)
        AlarmScheduler.clearSnooze(c)
        assertEquals(0L,AlarmScheduler.snoozeUntil(c))
    }

    @Test fun prayerRetainsOriginalSettingsAndStopClearsOnlyTheSnooze(){
        PrayerAlarm.prefs(c).edit().clear().putString("settings",
            """{"enabled":true,"items":{"asr":{"enabled":true,"count":3,"snooze":10}}}""").commit()
        assertTrue(PrayerAlarm.snooze(c,"asr",0))
        val before=PrayerAlarm.prefs(c).getLong("snooze_asr",0)
        PrayerAlarmNotice.showSnoozed(c,"asr")
        assertTrue(before>System.currentTimeMillis())
        PrayerAlarm.cancelSnooze(c,"asr")
        assertEquals(0L,PrayerAlarm.prefs(c).getLong("snooze_asr",0))
        assertTrue(PrayerAlarm.item(c,"asr").optBoolean("enabled"))
    }

    @Test fun nativeCalendarPublishingHasOneUserEnabledAlarmAndDurableSnoozeCard(){
        CalendarPublishAlarm.configure(c,"""{"enabled":true,"time":"19:30"}""")
        assertTrue(CalendarPublishAlarm.enabled(c))
        PhoneScreenAlerts.setEnabled(c,true)
        val ringing=CalendarPublishAlarm.notification(c,false)
        assertNotNull(ringing.fullScreenIntent)
        assertNotNull(ringing.contentView)
        assertEquals(2,ringing.actions.size)
        CalendarPublishAlarm.snooze(c)
        assertTrue(CalendarPublishAlarm.snoozeUntil(c)-System.currentTimeMillis() in 599000L..600500L)
        val waiting=CalendarPublishAlarm.notification(c,true)
        assertNull(waiting.fullScreenIntent)
        assertEquals(2,waiting.actions.size)
        assertTrue((waiting.flags and Notification.FLAG_ONGOING_EVENT)!=0)
        CalendarPublishAlarm.stop(c)
        assertTrue(CalendarPublishAlarm.enabled(c))
        assertEquals(0L,CalendarPublishAlarm.snoozeUntil(c))
        CalendarPublishAlarm.configure(c,"""{"enabled":false,"time":"19:30"}""")
        assertFalse(CalendarPublishAlarm.enabled(c))
    }
}
