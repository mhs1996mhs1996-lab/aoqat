package com.aoqat.calendar
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.json.JSONObject
import java.time.*
@RunWith(RobolectricTestRunner::class)
class PrayerAlarmTest {
 @Test fun independentMasterAndDaysGateDelivery(){val s=JSONObject("""{"enabled":true,"items":{"asr":{"enabled":true,"repeat":"days","days":[3]}}}""");val at=LocalDate.of(2026,10,7).atTime(15,16).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();assertTrue(PrayerAlarm.allowed(s,"asr",at));s.put("enabled",false);assertFalse(PrayerAlarm.allowed(s,"asr",at));}
 @Test fun midnightThirdUsesNextDayFajr(){val c=RuntimeEnvironment.getApplication();c.getSharedPreferences("iqama_schedule",0).edit().putString("rows","""[{"gregorian_month":10,"gregorian_day":7,"maghrib":"5:44"},{"gregorian_month":10,"gregorian_day":8,"fajr":"4:50"}]""").commit();val e=PrayerAlarm.events(c,LocalDate.of(2026,10,7));val m=e.first{it.id=="maghrib"}.at;val f=e.first{it.id=="fajr"}.at;assertEquals(m+(f-m)*2/3,e.first{it.id=="third"}.at);}
}
