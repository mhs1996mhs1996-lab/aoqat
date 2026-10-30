package com.aoqat.calendar

import android.app.AlarmManager
import android.content.Context
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.time.LocalDate

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class AtAdhanQuietTest {
    private val c: Context get()=RuntimeEnvironment.getApplication()
    private fun config(enabled:Boolean=true)=JSONObject(
        """{"enabled":false,"atAdhanSilent":{"enabled":$enabled,"minutes":{"fajr":3,"asr":15,"maghrib":0}}}"""
    )
    @Test fun quietStartsExactlyAtDatabaseAdhanEvenIfAudioOff() {
        val prayerAt=1_000_000L
        val win=AtAdhanQuiet.window(config(),"asr",prayerAt)!!
        assertEquals(prayerAt,win.first)
        assertEquals(prayerAt+15*60_000L,win.second)
        assertNull(AtAdhanQuiet.window(config(),"maghrib",prayerAt))
        assertNull(AtAdhanQuiet.window(config(false),"asr",prayerAt))
        assertNull(AtAdhanQuiet.window(config(),"invalid",prayerAt))
    }
    @Test fun nativeAdhanQuietScheduledWithoutEnablingAdhanAudio() {
        if(android.os.Build.VERSION.SDK_INT>=31)
            org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        val date=LocalDate.now().plusDays(1)
        c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit()
            .putString("rows","""[{"gregorian_month":${date.monthValue},"gregorian_day":${date.dayOfMonth},"asr":"3:22"}]""")
            .commit()
        c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit()
            .putString("settings",config().toString()).commit()
        AdhanSchedule.schedule(c)
        val alarms=shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms
        val quiet=alarms.firstOrNull { shadowOf(it.operation).savedIntent.let { i ->
            i.action=="ADHAN_QUIET" && i.getStringExtra("prayerId")=="asr" } }
        assertNotNull("Quiet at adhan must have an exact native wakeup alarm",quiet)
        val expected=PrayerTimes.events(c,date).first{it.id=="asr" && java.time.Instant.ofEpochMilli(it.at).atZone(java.time.ZoneId.systemDefault()).toLocalDate()==date}.at
        assertEquals(expected,quiet!!.triggerAtTime)
        assertTrue("Sound is still opt-in",alarms.none { shadowOf(it.operation).savedIntent.action=="PLAY" })
    }
}
