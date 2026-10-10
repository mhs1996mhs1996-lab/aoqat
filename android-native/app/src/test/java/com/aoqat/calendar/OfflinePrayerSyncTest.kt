package com.aoqat.calendar

import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.time.LocalDate

@RunWith(RobolectricTestRunner::class)
class OfflinePrayerSyncTest {
    private val context: Context get()=RuntimeEnvironment.getApplication()
    private fun row(date: LocalDate)=JSONObject().put("gregorian_month",date.monthValue).put("gregorian_day",date.dayOfMonth)
        .put("fajr","4:50").put("sunrise","6:09").put("dhuhr","11:56").put("asr","3:13").put("maghrib","5:40").put("isha","7:00")
    @Test fun eightDaysCrossMonthsAndYears() {
        val dates=OfflinePrayerSync.window(LocalDate.of(2026,12,29))
        assertEquals(8,dates.size);assertEquals(LocalDate.of(2027,1,5),dates.last())
        assertTrue(OfflinePrayerSync.complete(JSONArray(dates.map {row(it)}),dates))
        assertFalse(OfflinePrayerSync.complete(JSONArray(dates.dropLast(1).map {row(it)}),dates))
    }
    @Test fun packagedAnnualDatabaseIsReadyOnFirstOfflineLaunch() {
        val rows=PrayerTimes.rows(context)
        assertEquals(365,rows.length());assertTrue(OfflinePrayerSync.complete(rows,OfflinePrayerSync.window()))
    }
    @Test fun incompleteRefreshDoesNotDestroySavedRowsOrAdvanceSyncTime() {
        val prefs=context.getSharedPreferences("iqama_schedule",0)
        val old=JSONArray().put(row(LocalDate.now())).toString()
        prefs.edit().putString("rows",old).putLong("offlineSyncAt",0).commit()
        assertFalse(OfflinePrayerSync.refresh(context){JSONArray().put(row(LocalDate.now()))})
        assertEquals(old,prefs.getString("rows",null));assertEquals(0,prefs.getLong("offlineSyncAt",0))
        assertFalse(OfflinePrayerSync.refresh(context){throw java.io.IOException("offline")})
        assertEquals(old,prefs.getString("rows",null))
    }
    @Test fun fullRefreshKeepsPreferencesAndDoesNotRepeatWithinSevenDays() {
        val prefs=context.getSharedPreferences("iqama_schedule",0)
        prefs.edit().putLong("offlineSyncAt",0).putString("minutes","{\"fajr\":25}").commit()
        assertTrue(OfflinePrayerSync.refresh(context){JSONArray(OfflinePrayerSync.window().map {row(it)})})
        assertEquals("{\"fajr\":25}",prefs.getString("minutes",null));assertFalse(OfflinePrayerSync.due(context))
        assertTrue(OfflinePrayerSync.refresh(context){throw AssertionError("Fresh cache fetched twice")})
    }
    @Test fun jobsPersistAndRequireConnectivity() {
        OfflinePrayerSync.install(context)
        val scheduler=context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
        val job=scheduler.getPendingJob(OfflinePrayerSync.PERIODIC_JOB)!!
        assertTrue(job.isPersisted);assertTrue(job.isPeriodic);assertEquals(JobInfo.NETWORK_TYPE_ANY,job.networkType)
    }
}
