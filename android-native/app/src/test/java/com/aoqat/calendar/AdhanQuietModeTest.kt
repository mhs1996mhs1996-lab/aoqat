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
}
