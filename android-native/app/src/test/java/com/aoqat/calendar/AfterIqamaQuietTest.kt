package com.aoqat.calendar
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.json.JSONObject
import android.app.AlarmManager
import android.app.NotificationManager
import android.app.Application
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
@RunWith(RobolectricTestRunner::class)
class AfterIqamaQuietTest {
    private fun settings()=JSONObject("""{"enabled":true,"afterIqamaSilent":{"enabled":true,"minutes":{"asr":7,"fajr":3}}}""")
    @Test fun sevenMinutesBeginAtConfiguredAsrIqama() {
        val times=AfterIqamaQuiet.window(settings(),"asr",1000000L,25)!!
        assertEquals(2500000L,times.first);assertEquals(2920000L,times.second)
        assertNull(AfterIqamaQuiet.window(settings(),"maghrib",1000000L,10))
    }
    @Test fun quietSwitchIsIndependentOfAdhanAudioMaster() {
        val s=settings().put("enabled",false)
        val win=AfterIqamaQuiet.window(s,"asr",1000000L,25)!!
        assertEquals(2500000L,win.first)
        assertEquals(2920000L,win.second)
        s.getJSONObject("afterIqamaSilent").put("enabled",false)
        assertNull(AfterIqamaQuiet.window(s,"asr",1000000L,25))
    }
    @Test fun zeroMinuteDurationAndUnknownPrayerNeverMutePhone() {
        val s=settings()
        assertNull(AfterIqamaQuiet.window(s,"maghrib",1000000L,5))
        assertNull(AfterIqamaQuiet.window(s,"unknown",1000000L,5))
    }
    @Test @Config(sdk = [34]) fun nativeNotificationZeroStartsSilentWithManualDndAndExactRestoreDeadline() {
        val c=RuntimeEnvironment.getApplication() as Application
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        val audio=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        audio.ringerMode=AudioManager.RINGER_MODE_NORMAL
        c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit()
            .putBoolean("enabled",true).putString("minutes","""{"asr":10}""").commit()
        c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit()
            .putString("settings","""{"enabled":false,"afterIqamaSilent":{"enabled":true,"minutes":{"asr":7}}}""").commit()

        val wallNow=System.currentTimeMillis()
        val tooEarly=wallNow-10*60000L+15000L
        val state=c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE)
        state.edit().putBoolean("active",true).putString("prayerId","asr")
            .putLong("prayerAt",tooEarly).commit()
        AfterIqamaQuiet.onCountdownZero(c,tooEarly)
        assertEquals("No mute before the notification countdown reaches zero",
            AudioManager.RINGER_MODE_NORMAL,audio.ringerMode)

        val prayerAt=wallNow-10*60000L-2000L
        val expectedEnd=prayerAt+17*60000L
        state.edit().putLong("prayerAt",prayerAt).commit()
        // This broadcast is issued natively when the notification's 00:00 phase
        // flips, without MainActivity or the web UI being open.
        IqamaNotificationReceiver().onReceive(c,
            Intent(c,IqamaNotificationReceiver::class.java).setAction("PHASE_BOUNDARY")
                .putExtra("prayerAt",prayerAt))
        assertEquals(AudioManager.RINGER_MODE_SILENT,audio.ringerMode)
        assertEquals(NotificationManager.INTERRUPTION_FILTER_NONE,nm.currentInterruptionFilter)
        val saved=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
        assertEquals(expectedEnd,saved.getLong("end",0L))
        val alarm=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        assertTrue("The exact scheduled restoration must survive app closure",
            shadowOf(alarm).scheduledAlarms.any {
                it.triggerAtTime==expectedEnd &&
                shadowOf(it.operation).savedIntent.action=="RESTORE_SOUND"
            })
        // Even if the receiver is delayed, the original end deadline controls
        // restoration; never add an extra interval from its delivery time.
        saved.edit().putLong("end",System.currentTimeMillis()-1L).commit()
        AdhanReceiver().onReceive(c,Intent(c,AdhanReceiver::class.java).setAction("RESTORE_SOUND"))
        assertEquals(AudioManager.RINGER_MODE_NORMAL,audio.ringerMode)
        assertEquals(NotificationManager.INTERRUPTION_FILTER_NONE,nm.currentInterruptionFilter)
        assertFalse(saved.getBoolean("changed",false))
    }

    @Test @Config(sdk = [34]) fun staleOrMissingCountdownCycleCannotMuteUnrelatedPrayer() {
        val c=RuntimeEnvironment.getApplication() as Application
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        val audio=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audio.ringerMode=AudioManager.RINGER_MODE_NORMAL
        c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit()
            .putString("settings","""{"afterIqamaSilent":{"enabled":true,"minutes":{"asr":10}}}""").commit()
        val prayerAt=System.currentTimeMillis()-10*60000L-2000L
        val state=c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE)
        state.edit().putBoolean("active",true).putString("prayerId","asr")
            .putLong("prayerAt",prayerAt).commit()
        AfterIqamaQuiet.onCountdownZero(c,prayerAt+1L)
        assertEquals(AudioManager.RINGER_MODE_NORMAL,audio.ringerMode)
        state.edit().putBoolean("active",false).commit()
        AfterIqamaQuiet.onCountdownZero(c,prayerAt)
        assertEquals(AudioManager.RINGER_MODE_NORMAL,audio.ringerMode)
    }

}
