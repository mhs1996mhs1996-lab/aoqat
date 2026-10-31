package com.aoqat.calendar

import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class AdhanQuietModeTest {
    private val context:Context get()=RuntimeEnvironment.getApplication()
    @org.junit.Before fun allowExactAlarms() {
        if(android.os.Build.VERSION.SDK_INT>=31)
            org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
    }

    @Test fun adhanAndIqamaShareOneRestorableSilentMode() {
        val nm=context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        val am=context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        am.ringerMode=AudioManager.RINGER_MODE_VIBRATE
        val now=System.currentTimeMillis()
        AdhanPlaybackService.activateQuiet(context, now+60000L)
        assertEquals(AudioManager.RINGER_MODE_SILENT,am.ringerMode)
        AdhanPlaybackService.activateQuiet(context, now+180000L)
        assertTrue(context.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE).getLong("end",0)>=now+180000L)
        AdhanPlaybackService.restoreRinger(context)
        assertEquals(AudioManager.RINGER_MODE_VIBRATE,am.ringerMode)
        assertFalse(context.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE).getBoolean("changed",false))
    }

    @Test fun deniedPolicyPermissionCannotSilentlySaveAFalseSuccess() {
        val nm=context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(false)
        val am=context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        am.ringerMode=AudioManager.RINGER_MODE_NORMAL
        AdhanPlaybackService.activateQuiet(context,System.currentTimeMillis()+60000L)
        assertEquals(AudioManager.RINGER_MODE_NORMAL,am.ringerMode)
        assertFalse(context.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE).getBoolean("changed",false))
    }
    @Test fun preexistingSilentNeverClaimsOwnershipOrResetsUsersSoundMode() {
        val nm=context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        val am=context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        am.ringerMode=AudioManager.RINGER_MODE_SILENT
        val now=System.currentTimeMillis()
        assertTrue(AdhanPlaybackService.activateQuiet(context,now+600000L,now))
        assertEquals(AudioManager.RINGER_MODE_SILENT,am.ringerMode)
        assertFalse(context.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE).getBoolean("changed",false))
        assertEquals("already_silent",AdhanPlaybackService.quietStatus(context).getString("lastResult"))
        AdhanPlaybackService.restoreRinger(context)
        assertEquals(AudioManager.RINGER_MODE_SILENT,am.ringerMode)
    }

    @Test fun appOwnedSilentRecordsStartAndRestoresPreviousVibrate() {
        val nm=context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        val am=context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        am.ringerMode=AudioManager.RINGER_MODE_VIBRATE
        val now=System.currentTimeMillis()
        val expectedStart=now-65000L
        val deadline=now+180000L
        assertTrue(AdhanPlaybackService.activateQuiet(context,deadline,expectedStart))
        val state=AdhanPlaybackService.quietStatus(context)
        assertEquals("applied",state.getString("lastResult"))
        assertEquals(expectedStart,state.getLong("scheduledStart"))
        assertEquals(deadline,state.getLong("deadline"))
        assertTrue(state.getBoolean("appOwnsQuiet"))
        AdhanPlaybackService.restoreRinger(context)
        assertEquals(AudioManager.RINGER_MODE_VIBRATE,am.ringerMode)
        val restored=AdhanPlaybackService.quietStatus(context)
        assertEquals("restored",restored.getString("lastResult"))
        assertEquals(expectedStart,restored.getLong("scheduledStart"))
    }

    @Test fun missingExactAlarmPermissionNeverSilencesWithoutRecovery() {
        if(android.os.Build.VERSION.SDK_INT<31)return
        org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(false)
        val nm=context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        val am=context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        am.ringerMode=AudioManager.RINGER_MODE_NORMAL
        assertFalse(AdhanPlaybackService.activateQuiet(context,System.currentTimeMillis()+60000L))
        assertEquals(AudioManager.RINGER_MODE_NORMAL,am.ringerMode)
        assertEquals("exact_alarm_missing",AdhanPlaybackService.quietStatus(context).getString("lastResult"))
        assertFalse(AdhanPlaybackService.quietStatus(context).getBoolean("appOwnsQuiet"))
    }

    @Test fun manualDndDoesNotBlockAfterIqamaRingerQuietAndRestoresOriginalDnd() {
        val nm=context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        val am=context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        // Recreate the user's precise combination: DND enabled manually, ringer
        // still in normal mode. The app should ONLY mute the ringer for iqama.
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        am.ringerMode=AudioManager.RINGER_MODE_NORMAL
        assertEquals(NotificationManager.INTERRUPTION_FILTER_NONE,nm.currentInterruptionFilter)
        val now=System.currentTimeMillis()
        assertTrue(AdhanPlaybackService.activateQuiet(context,now+120000L,now))
        assertEquals(AudioManager.RINGER_MODE_SILENT,am.ringerMode)
        assertTrue(AdhanPlaybackService.quietStatus(context).getBoolean("appOwnsQuiet"))
        assertEquals("applied",AdhanPlaybackService.quietStatus(context).getString("lastResult"))
        assertEquals(NotificationManager.INTERRUPTION_FILTER_NONE,nm.currentInterruptionFilter)
        AdhanPlaybackService.restoreRinger(context)
        assertEquals(AudioManager.RINGER_MODE_NORMAL,am.ringerMode)
        assertEquals("Manually enabled DND remains enabled after restoring normal ringer",
            NotificationManager.INTERRUPTION_FILTER_NONE,nm.currentInterruptionFilter)
        assertFalse(AdhanPlaybackService.quietStatus(context).getBoolean("appOwnsQuiet"))
    }

    @Test fun manualDndWithPreexistingSilentMustNotResetUserState() {
        val nm=context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        val am=context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        am.ringerMode=AudioManager.RINGER_MODE_SILENT
        assertTrue(AdhanPlaybackService.activateQuiet(context,System.currentTimeMillis()+60000L))
        assertEquals("already_silent",AdhanPlaybackService.quietStatus(context).getString("lastResult"))
        assertFalse(AdhanPlaybackService.quietStatus(context).getBoolean("appOwnsQuiet"))
        AdhanPlaybackService.restoreRinger(context)
        assertEquals(AudioManager.RINGER_MODE_SILENT,am.ringerMode)
        assertEquals(NotificationManager.INTERRUPTION_FILTER_NONE,nm.currentInterruptionFilter)
    }

}
