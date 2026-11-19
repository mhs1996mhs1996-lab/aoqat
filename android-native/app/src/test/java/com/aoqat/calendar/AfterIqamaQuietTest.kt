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
    @Test fun quietIsIndependentOfElapsedCounterAndCanOutliveIt() {
        val s=JSONObject("""{"afterIqamaSilent":{"enabled":true,"minutes":{"maghrib":12}}}""")
        val prayerAt=1_000_000L
        // The elapsed display can end after 10 minutes; quiet continues
        // to 12 minutes (both from the SAME actual iqama zero point).
        val elapsedDisplay=IqamaCycle.Durations(beforeMinutes=10,afterMinutes=10)
        val window=AfterIqamaQuiet.window(s,"maghrib",prayerAt,elapsedDisplay.beforeMinutes)!!
        assertEquals(prayerAt+10*60000L,window.first)
        assertEquals(prayerAt+22*60000L,window.second)
        assertEquals(prayerAt+20*60000L,prayerAt+elapsedDisplay.totalMs)
        assertTrue(window.second>prayerAt+elapsedDisplay.totalMs)
    }

    @Test fun elapsedDisplayCanOutliveQuietWithoutChangingQuietDuration() {
        val s=JSONObject("""{"afterIqamaSilent":{"enabled":true,"minutes":{"fajr":8}}}""")
        val prayerAt=2_000_000L
        val elapsedDisplay=IqamaCycle.Durations(beforeMinutes=20,afterMinutes=12)
        val window=AfterIqamaQuiet.window(s,"fajr",prayerAt,elapsedDisplay.beforeMinutes)!!
        assertEquals(prayerAt+20*60000L,window.first)
        assertEquals(prayerAt+28*60000L,window.second)
        assertEquals(prayerAt+32*60000L,prayerAt+elapsedDisplay.totalMs)
        assertTrue(window.second<prayerAt+elapsedDisplay.totalMs)
    }

    @Test fun perPrayerZeroQuietDoesNotStopElapsedCounter() {
        val s=JSONObject("""{"afterIqamaSilent":{"enabled":true,"minutes":{"dhuhr":0}}}""")
        assertNull(AfterIqamaQuiet.window(s,"dhuhr",1_000_000L,10))
        val elapsedDisplay=IqamaCycle.Durations(10,10)
        assertEquals(IqamaCycle.Phase.ELAPSED,
            IqamaCycle.frame(10*60000L,elapsedDisplay).phase)
    }
    @Test fun quietSwitchIsIndependentOfAdhanAudioMaster() {
        val s=settings().put("enabled",false)
        val win=AfterIqamaQuiet.window(s,"asr",1000000L,25)!!
        assertEquals(2500000L,win.first)
        assertEquals(2920000L,win.second)
        s.getJSONObject("afterIqamaSilent").put("enabled",false)
        assertNull(AfterIqamaQuiet.window(s,"asr",1000000L,25))
    }
    @Test fun enabledToggleUsesSavedDurationsAndStopsExactlyAtElapsedCounter() {
        val saved=JSONObject("""{"enabled":false,"afterIqamaSilent":{"enabled":true,"minutes":{"maghrib":13}}}""")
        val at=2_000_000L
        val win=AfterIqamaQuiet.window(saved,"maghrib",at,5)!!
        assertEquals(at+5*60_000L,win.first)
        assertEquals("Chosen 13-minute quiet must not be capped by elapsed 12",
            at+18*60_000L,win.second)
        // Turning quiet off must not touch the independent "مضى" display.
        saved.getJSONObject("afterIqamaSilent").put("enabled",false)
        assertNull(AfterIqamaQuiet.window(saved,"maghrib",at,5))
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


    @Test @Config(sdk = [34]) fun twelveMinuteQuietSchedulesExactRestoreEvenWithTenMinuteElapsedCounter() {
        val c=RuntimeEnvironment.getApplication() as Application
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        val audio=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        audio.ringerMode=AudioManager.RINGER_MODE_NORMAL

        val prayerId="asr"
        c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit()
            .putBoolean("enabled",true)
            .putString("minutes","""{"asr":10}""")
            .putString("afterMinutes","""{"asr":10}""")
            .commit()
        c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit()
            .putString("settings","""{"enabled":false,"afterIqamaSilent":{"enabled":true,"minutes":{"asr":12}}}""")
            .commit()

        val prayerAt=System.currentTimeMillis()-10*60000L-2000L
        val expectedQuietEnd=prayerAt+22*60000L
        val expectedElapsedDisplayEnd=prayerAt+20*60000L
        assertEquals(10,IqamaNativeScheduler.durations(c,prayerId).afterMinutes)
        val window=AfterIqamaQuiet.window(AdhanSchedule.settings(c),prayerId,prayerAt,10)!!
        assertEquals(expectedQuietEnd,window.second)
        assertTrue(expectedQuietEnd>expectedElapsedDisplayEnd)

        AfterIqamaQuiet.start(c,prayerId,prayerAt)
        assertEquals(AudioManager.RINGER_MODE_SILENT,audio.ringerMode)
        val p=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
        assertEquals("A 12-minute quiet period must never end at the 10-minute elapsed cap",
            expectedQuietEnd,p.getLong("iqamaEnd",0L))
        assertEquals(expectedQuietEnd,p.getLong("end",0L))

        // The elapsed-countdown service ending must not change the quiet deadline.
        c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE).edit()
            .putLong("prayerAt",prayerAt).putBoolean("active",false).commit()
        AfterIqamaQuiet.onCountdownComplete(c,prayerAt)
        assertEquals(AudioManager.RINGER_MODE_SILENT,audio.ringerMode)
        assertEquals(expectedQuietEnd,p.getLong("end",0L))
        val alarm=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        assertTrue(shadowOf(alarm).scheduledAlarms.any {
            it.triggerAtTime==expectedQuietEnd &&
            shadowOf(it.operation).savedIntent.action=="RESTORE_SOUND"
        })
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

    @Test @Config(sdk = [34]) fun restoresNormalAfterAsrEvenIfIqamaNotificationWasDismissed() {
        val c=RuntimeEnvironment.getApplication() as Application
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        val audio=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        audio.ringerMode=AudioManager.RINGER_MODE_SILENT
        val prayerAt=System.currentTimeMillis()-21*60000L
        c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE).edit()
            .putLong("prayerAt",prayerAt).putBoolean("active",false).commit()
        val previous=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
        previous.edit().putBoolean("changed",true)
            .putInt("previous",AudioManager.RINGER_MODE_NORMAL)
            .putInt("previousFilter",NotificationManager.INTERRUPTION_FILTER_NONE)
            .putBoolean("dndApplied",false)
            .putLong("end",System.currentTimeMillis()-1000)
            .putLong("iqamaEnd",System.currentTimeMillis()-1000).commit()
        // The foreground notification can be dismissed before the final phase
        // alarm. This must never strand the ringer after the elapsed timer.
        AfterIqamaQuiet.onCountdownComplete(c,prayerAt)
        assertEquals(AudioManager.RINGER_MODE_NORMAL,audio.ringerMode)
        assertEquals(NotificationManager.INTERRUPTION_FILTER_NONE,nm.currentInterruptionFilter)
        assertFalse(previous.getBoolean("changed",false))
    }

    @Test @Config(sdk = [34]) fun staleIqamaExpiryNeverStopsAnotherActiveQuietPeriod() {
        val c=RuntimeEnvironment.getApplication() as Application
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        val current=System.currentTimeMillis()
        c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE).edit()
            .putLong("prayerAt",current).putBoolean("active",true).commit()
        val saved=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
        saved.edit().putBoolean("changed",true)
            .putInt("previous",AudioManager.RINGER_MODE_NORMAL)
            .putLong("end",current+600000L).putLong("iqamaEnd",current+600000L).commit()
        AfterIqamaQuiet.onCountdownComplete(c,current-3600000L)
        assertTrue(saved.getBoolean("changed",false))
    }

}
