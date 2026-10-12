package com.aoqat.calendar

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.time.LocalDate

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class PrayerTimeChoiceTest {
    private val c:Context get()=RuntimeEnvironment.getApplication()
    private fun row()=JSONObject("{\"gregorian_month\":1,\"gregorian_day\":1,\"fajr\":\"4:55\",\"sunrise\":\"6:10\",\"dhuhr\":\"11:56\",\"asr\":\"3:13\",\"maghrib\":\"5:40\",\"isha\":\"7:00\"}")
    @Test fun customOffsetsDoNotMutateRawDatabaseAndReachEveryNativeEvent(){
        c.getSharedPreferences("iqama_schedule",0).edit().putString("rows",JSONArray().put(row()).toString()).commit()
        c.getSharedPreferences("prayer_time_choice_v1",0).edit().putString("settings","{\"mode\":\"custom\",\"offsets\":{\"fajr\":-1,\"asr\":5,\"dhuhr\":4}}").commit()
        val effective=PrayerTimes.rows(c);val r=(0 until effective.length()).map{effective.getJSONObject(it)}.first{it.optInt("gregorian_month")==1&&it.optInt("gregorian_day")==1}
        assertEquals("4:54",r.getString("fajr"));assertEquals("3:18",r.getString("asr"));assertEquals("12:00",r.getString("dhuhr"));assertEquals("6:10",r.getString("sunrise"))
        val raw=OfflinePrayerSync.rows(c);val original=(0 until raw.length()).map{raw.getJSONObject(it)}.first{it.optInt("gregorian_month")==1&&it.optInt("gregorian_day")==1}
        assertEquals("4:55",original.getString("fajr"));assertEquals("3:13",original.getString("asr"))
        val events=PrayerTimes.events(c,LocalDate.of(2027,1,1));assertEquals(18,java.time.Instant.ofEpochMilli(events.first{it.id=="asr"}.at).atZone(java.time.ZoneId.systemDefault()).minute)
        c.getSharedPreferences("prayer_time_choice_v1",0).edit().putString("settings","{}").commit()
        assertEquals("3:13",PrayerTimes.rows(c).let{rows->(0 until rows.length()).map{rows.getJSONObject(it)}.first{it.optInt("gregorian_month")==1&&it.optInt("gregorian_day")==1}.getString("asr"))
    }
    @Test fun boundsMinuteCarryAndStableCachedSnapshot(){
        val normalized=PrayerTimeChoice.normalize(JSONObject("{\"mode\":\"custom\",\"offsets\":{\"fajr\":-40,\"asr\":40,\"isha\":41}}"))
        assertEquals(0,normalized.getJSONObject("offsets").getInt("isha"))
        val changed=PrayerTimeChoice.apply(JSONArray().put(row().put("fajr","5:00").put("asr","3:55")),normalized).getJSONObject(0)
        assertEquals("4:20",changed.getString("fajr"));assertEquals("4:35",changed.getString("asr"))
        val before=OfflinePrayerSync.rows(c);assertSame(before,OfflinePrayerSync.rows(c))
        c.getSharedPreferences("iqama_schedule",0).edit().putString("rows",JSONArray().put(row().put("fajr","5:11")).toString()).commit()
        val after=OfflinePrayerSync.rows(c);assertNotSame(before,after)
    }
}
