package com.aoqat.calendar

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class PrayerSoundPolicyTest {
    private val c:Context get()=RuntimeEnvironment.getApplication()
    private val audio:AudioManager get()=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val nm:NotificationManager get()=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    @Before fun reset() {
        c.getSharedPreferences("adhan_settings",0).edit().clear().commit()
        c.getSharedPreferences("prayer_audio_dnd_session_v1",0).edit().clear().commit()
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        if(android.os.Build.VERSION.SDK_INT>=31)
            org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
        audio.ringerMode=AudioManager.RINGER_MODE_NORMAL
    }
    private fun settings() {
        val json="""{"enabled":true,"audibility":{"fajr":{"silent":true,"dnd":true},
            "dhuhr":{"silent":false,"dnd":true},
            "asr":{"silent":true,"dnd":false},
            "maghrib":{"silent":false,"dnd":false},"isha":{"silent":false,"dnd":false}}}"""
        c.getSharedPreferences("adhan_settings",0).edit().putString("settings",json).commit()
    }

    @Test fun fivePrayersHaveIndependentTwoSwitchesAppliedToAdhanAndAlarm() {
        settings()
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        audio.ringerMode=AudioManager.RINGER_MODE_SILENT
        assertTrue(PrayerSoundPolicy.allowed(c,"fajr"))
        assertTrue(PrayerSoundPolicy.allowed(c,"fajr",true))
        assertFalse(PrayerSoundPolicy.allowed(c,"dhuhr"))
        assertFalse(PrayerSoundPolicy.allowed(c,"asr",true))
        assertFalse(PrayerSoundPolicy.allowed(c,"maghrib"))
        assertFalse(PrayerSoundPolicy.allowed(c,"isha",true))
        // Unrelated last-third alarm behaviour is unchanged.
        assertTrue(PrayerSoundPolicy.allowed(c,"third",true))
        audio.ringerMode=AudioManager.RINGER_MODE_NORMAL
        assertTrue(PrayerSoundPolicy.allowed(c,"dhuhr"))
        assertFalse(PrayerSoundPolicy.allowed(c,"asr"))
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
        audio.ringerMode=AudioManager.RINGER_MODE_SILENT
        assertTrue(PrayerSoundPolicy.allowed(c,"asr"))
        assertFalse(PrayerSoundPolicy.allowed(c,"dhuhr",true))
    }

    @Test fun legacySettingsLeaveExistingAlarmAndAdhanChoicesUnchangedUntilMigrated() {
        c.getSharedPreferences("adhan_settings",0).edit()
            .putString("settings","""{"enabled":true,"overrideSilent":false}""").commit()
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        audio.ringerMode=AudioManager.RINGER_MODE_SILENT
        assertFalse(PrayerSoundPolicy.allowed(c,"fajr",false))
        assertTrue(PrayerSoundPolicy.allowed(c,"fajr",true))
    }

    @Test fun optInDndAudioIsTransientAndRestoresScheduledUserFilterAfterBothSounds() {
        settings()
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        audio.ringerMode=AudioManager.RINGER_MODE_NORMAL
        assertTrue(PrayerSoundPolicy.allowed(c,"fajr"))
        assertTrue(PrayerAudioDnd.begin(c,"adhan"))
        assertEquals(NotificationManager.INTERRUPTION_FILTER_ALL,nm.currentInterruptionFilter)
        assertEquals(NotificationManager.INTERRUPTION_FILTER_NONE,PrayerAudioDnd.effectiveDndFilter(c))
        assertTrue(PrayerAudioDnd.begin(c,"prayer-alarm"))
        val alarms=shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms
        assertTrue(alarms.any { shadowOf(it.operation).savedIntent.action==
            "com.aoqat.calendar.RESTORE_DND_AUDIO" })
        PrayerAudioDnd.end(c,"adhan")
        assertEquals(NotificationManager.INTERRUPTION_FILTER_ALL,nm.currentInterruptionFilter)
        PrayerAudioDnd.end(c,"prayer-alarm")
        assertEquals(NotificationManager.INTERRUPTION_FILTER_NONE,nm.currentInterruptionFilter)
        assertFalse(c.getSharedPreferences("prayer_audio_dnd_session_v1",0).getBoolean("active",false))
    }

    @Test fun declinedPolicyPermissionDoesNotChangeManualDnd() {
        settings()
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        shadowOf(nm).setNotificationPolicyAccessGranted(false)
        assertFalse(PrayerAudioDnd.begin(c,"adhan"))
        assertEquals(NotificationManager.INTERRUPTION_FILTER_NONE,nm.currentInterruptionFilter)
    }
}
