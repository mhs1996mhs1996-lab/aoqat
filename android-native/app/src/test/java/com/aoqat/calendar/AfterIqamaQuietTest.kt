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
    @Test fun quietDurationStaysIndependentWhenElapsedCounterEndsEarlier() {
        val s=JSONObject("""{"afterIqamaSilent":{"enabled":true,"minutes":{"maghrib":30}}}""")
        val start=1000000L
        val win=AfterIqamaQuiet.window(s,"maghrib",start,10,5)!!
        assertEquals(start+10*60000L,win.first)
        assertEquals("User selected 30-minute quiet duration",start+40*60000L,win.second)
    }
    @Test fun quietSwitchIsIndependentOfAdhanAudioMaster() {
        val s=settings().put("enabled",false)
        val win=AfterIqamaQuiet.window(s,"asr",1000000L,25)!!
        assertEquals(2500000L,win.first)
        assertEquals(2920000L,win.second)
        s.getJSONObject("afterIqamaSilent").put("enabled",false)
        assertNull(AfterIqamaQuiet.window(s,"asr",1000000L,25))
    }
    @Test fun enabledToggleUsesSavedQuietDurationIndependentOfElapsedCounter() {
        val saved=JSONObject("""{"enabled":false,"afterIqamaSilent":{"enabled":true,"minutes":{"maghrib":13}}}""")
        val at=2_000_000L
        val win=AfterIqamaQuiet.window(saved,"maghrib",at,5,12)!!
        assertEquals(at+5*60_000L,win.first)
        assertEquals(at+18*60_000L,win.second)
        // The quiet period may outlive the elapsed display, by user choice.
        saved.getJSONObject("afterIqamaSilent").put("enabled",false)
        assertNull(AfterIqamaQuiet.window(saved,"maghrib",at,5,12))
    }
    @Test fun tenMinuteElapsedAndTwelveMinuteQuietHaveIndependentEndPoints() {
        val prayerAt=1_000_000L
        val settings=JSONObject("""{"afterIqamaSilent":{"enabled":true,"minutes":{"asr":12}}}""")
        val start=prayerAt+10*60000L
        val quiet=AfterIqamaQuiet.window(settings,"asr",prayerAt,10,10)!!
        assertEquals("Quiet starts at the Iqama zero point",start,quiet.first)
        assertEquals("Quiet ends twelve minutes later, not ten",start+12*60000L,quiet.second)
        val ten=prayerAt+20*60000L
        assertTrue("Phone must remain quiet after the ten-minute elapsed counter ends",ten<quiet.second)
        val elapsed=IqamaCycle.Durations(beforeMinutes=10,afterMinutes=10)
        assertEquals(IqamaCycle.Phase.FINISHED,IqamaCycle.frame(20*60000L,elapsed).phase)
        assertEquals(IqamaCycle.Phase.ELAPSED,IqamaCycle.frame(19*60000L,elapsed).phase)
        settings.getJSONObject("afterIqamaSilent").getJSONObject("minutes").put("asr",7)
        val short=AfterIqamaQuiet.window(settings,"asr",prayerAt,10,10)!!
        assertEquals(start+7*60000L,short.second)
    }
    @Test fun eachPrayerQuietDurationDoesNotChangeElapsedCounter() {
        for(id in PrayerTimes.ids) {
            val at=1_000_000L
            val s=JSONObject().put("afterIqamaSilent",
                JSONObject().put("enabled",true).put("minutes",JSONObject().put(id,12)))
            val w=AfterIqamaQuiet.window(s,id,at,10,10)!!
            assertEquals(at+10*60000L,w.first)
            assertEquals(at+22*60000L,w.second)
            assertEquals(IqamaCycle.Phase.FINISHED,
                IqamaCycle.frame(20*60000L,IqamaCycle.Durations(10,10)).phase)
        }
    }

    @Test fun userChosenRemainingElapsedAndQuietAreThreeIndependentValuesForEveryPrayer() {
        val c=RuntimeEnvironment.getApplication() as Application
        val before=JSONObject("""{"fajr":18,"dhuhr":14,"asr":8,"maghrib":23,"isha":6}""")
        val elapsed=JSONObject("""{"fajr":16,"dhuhr":12,"asr":19,"maghrib":7,"isha":15}""")
        val quiet=JSONObject("""{"fajr":22,"dhuhr":5,"asr":13,"maghrib":9,"isha":20}""")
        c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit()
            .putString("minutes",before.toString())
            .putString("afterMinutes",elapsed.toString()).commit()
        val settings=JSONObject().put("afterIqamaSilent",JSONObject()
            .put("enabled",true).put("minutes",quiet))
        val prayerAt=5_000_000L
        for (id in PrayerTimes.ids) {
            val b=before.getInt(id)
            val e=elapsed.getInt(id)
            val q=quiet.getInt(id)
            val saved=IqamaNativeScheduler.durations(c,id)
            assertEquals("Custom remaining minutes for $id",b,saved.beforeMinutes)
            assertEquals("Custom elapsed minutes for $id",e,saved.afterMinutes)
            val quietWindow=AfterIqamaQuiet.window(
                settings,id,prayerAt,saved.beforeMinutes,saved.afterMinutes)!!
            assertEquals("Quiet starts at custom remaining countdown zero for $id",
                prayerAt+b*60_000L,quietWindow.first)
            assertEquals("Quiet ends after its own $q minutes for $id",
                prayerAt+(b+q)*60_000L,quietWindow.second)
            assertEquals("Elapsed countdown ends after its own $e minutes for $id",
                IqamaCycle.Phase.FINISHED,
                IqamaCycle.frame((b+e)*60_000L,saved).phase)
            assertEquals("Elapsed countdown still visible just before custom end for $id",
                IqamaCycle.Phase.ELAPSED,
                IqamaCycle.frame((b+e)*60_000L-1,saved).phase)
        }
        // An edit to remaining should not override separately saved elapsed or quiet.
        before.put("asr",17)
        c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit()
            .putString("minutes",before.toString()).commit()
        val updated=IqamaNativeScheduler.durations(c,"asr")
        assertEquals(17,updated.beforeMinutes)
        assertEquals(19,updated.afterMinutes)
        assertEquals(prayerAt+(17+13)*60_000L,
            AfterIqamaQuiet.window(settings,"asr",prayerAt,updated.beforeMinutes,updated.afterMinutes)!!.second)
    }

    @Test fun untouchedElapsedCountdownUsesTenMinuteDefaultButNotAsQuietCap() {
        val c=RuntimeEnvironment.getApplication() as Application
        val prefs=c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE)
        // A new user who has not touched "مضى على الإقامة" gets 10.
        prefs.edit().putString("afterMinutes","{}")
            .putString("minutes","""{"asr":12}""").commit()
        val duration=IqamaNativeScheduler.durations(c,"asr")
        assertEquals(12,duration.beforeMinutes)
        assertEquals(10,duration.afterMinutes)
        val quiet=JSONObject("""{"afterIqamaSilent":{"enabled":true,"minutes":{"asr":15}}}""")
        val w=AfterIqamaQuiet.window(quiet,"asr",5_000_000L,duration.beforeMinutes,duration.afterMinutes)!!
        assertEquals(5_000_000L+12*60_000L,w.first)
        assertEquals(5_000_000L+27*60_000L,w.second)
        // User then edits elapsed to 25: restore after exactly 15, not 10 or 25.
        prefs.edit().putString("afterMinutes","""{"asr":25}""").commit()
        val changed=IqamaNativeScheduler.durations(c,"asr")
        assertEquals(25,changed.afterMinutes)
        assertEquals(12,changed.beforeMinutes)
        assertEquals(w,AfterIqamaQuiet.window(quiet,"asr",5_000_000L,changed.beforeMinutes,changed.afterMinutes))
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


    @Test @Config(sdk = [34]) fun staleTwelveMinuteRestoreMustWaitForSixteenMinuteSavedChoice() {
        val c=RuntimeEnvironment.getApplication() as Application
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        val audio=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audio.ringerMode=AudioManager.RINGER_MODE_SILENT

        // Example: Isha 18:21, Iqama +15 = 18:36, elapsed +12 = 18:48,
        // owner-selected quiet +16 = 18:52. Set now at the stale 12-minute
        // recovery, where the new exact restore is still FOUR minutes away.
        val now=System.currentTimeMillis()
        val prayerAt=now-27*60_000L
        val expectedEnd=prayerAt+(15+16)*60_000L
        assertTrue(expectedEnd>now)
        val state=c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE)
        state.edit().putLong("prayerAt",prayerAt).putString("prayerId","isha")
            .putBoolean("active",false).commit()
        c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit()
            .putString("minutes","""{"isha":15}""")
            .putString("afterMinutes","""{"isha":12}""").commit()
        c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit()
            .putString("settings","""{"afterIqamaSilent":{"enabled":true,"minutes":{"isha":16}}}""").commit()
        val saved=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
        saved.edit().putBoolean("changed",true)
            .putInt("previous",AudioManager.RINGER_MODE_NORMAL)
            .putLong("iqamaEnd",now-1000L).putLong("end",now-1000L).commit()

        // Simulate a delayed/old RESTORE_SOUND alarm (without opening UI).
        AdhanPlaybackService.restoreRingerIfExpired(c)
        assertEquals("Old restore alarm cannot cut 16-minute quiet short",
            AudioManager.RINGER_MODE_SILENT,audio.ringerMode)
        assertEquals(expectedEnd,saved.getLong("end",0L))
        assertEquals(expectedEnd,saved.getLong("iqamaEnd",0L))
        assertEquals(prayerAt,saved.getLong("iqamaPrayerAt",0L))
        val am=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        assertTrue("Exact restoration is rescheduled at 18:52 equivalent",
            shadowOf(am).scheduledAlarms.any {
                it.triggerAtTime==expectedEnd &&
                shadowOf(it.operation).savedIntent.action=="RESTORE_SOUND"
            })
        // Elapsed notification completing at 12 minutes is NOT a quiet exit.
        AfterIqamaQuiet.onCountdownComplete(c,prayerAt)
        assertEquals(AudioManager.RINGER_MODE_SILENT,audio.ringerMode)
        assertEquals(expectedEnd,saved.getLong("end",0L))
    }

    @Test @Config(sdk = [34]) fun shorteningActiveQuietDurationRestoresAtNewSelectedDeadline() {
        val c=RuntimeEnvironment.getApplication() as Application
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        val audio=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audio.ringerMode=AudioManager.RINGER_MODE_SILENT

        val now=System.currentTimeMillis()
        val prayerAt=now-24*60_000L // 15 minutes remaining + 9 elapsed
        c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE).edit()
            .putLong("prayerAt",prayerAt).putString("prayerId","isha")
            .putBoolean("active",true).commit()
        c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit()
            .putString("minutes","""{"isha":15}""")
            .putString("afterMinutes","""{"isha":12}""").commit()
        c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit()
            .putString("settings","""{"afterIqamaSilent":{"enabled":true,"minutes":{"isha":7}}}""").commit()
        val saved=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
        saved.edit().putBoolean("changed",true)
            .putInt("previous",AudioManager.RINGER_MODE_NORMAL)
            .putLong("end",prayerAt+31*60_000L)
            .putLong("iqamaEnd",prayerAt+31*60_000L)
            .putLong("iqamaPrayerAt",prayerAt)
            .putString("iqamaPrayerId","isha").commit()
        AdhanPlaybackService.restoreRingerIfExpired(c)
        assertEquals("Owner shortened to 7 minutes; restore must not wait for old 16",
            AudioManager.RINGER_MODE_NORMAL,audio.ringerMode)
        assertFalse(saved.getBoolean("changed",false))
    }

    @Test @Config(sdk = [34]) fun unrelatedPrayerMustNotInheritAnotherQuietDeadline() {
        val c=RuntimeEnvironment.getApplication() as Application
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        shadowOf(nm).setNotificationPolicyAccessGranted(true)
        org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        val now=System.currentTimeMillis()
        val prayerAt=now-27*60_000L
        c.getSharedPreferences("iqama_service_state",Context.MODE_PRIVATE).edit()
            .putLong("prayerAt",prayerAt).putString("prayerId","isha").commit()
        c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit()
            .putString("minutes","""{"isha":15}""").commit()
        c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit()
            .putString("settings","""{"afterIqamaSilent":{"enabled":true,"minutes":{"isha":16}}}""").commit()
        val saved=c.getSharedPreferences("adhan_ringer",Context.MODE_PRIVATE)
        saved.edit().putBoolean("changed",true)
            .putLong("iqamaPrayerAt",prayerAt-86_400_000L)
            .putString("iqamaPrayerId","isha")
            .putLong("end",now+60_000L)
            .putLong("iqamaEnd",now+60_000L).commit()
        AfterIqamaQuiet.reconcileOwnedDeadline(c)
        assertEquals("Unrelated cycle cannot extend old ringtone ownership",
            now+60_000L,saved.getLong("end",0L))
    }

}
