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
 @Before fun cleanAlarmSettings(){PrayerAlarm.prefs(RuntimeEnvironment.getApplication()).edit().clear().commit()}
 @Test fun snoozePersistsAndStopsAtLimit(){val c=RuntimeEnvironment.getApplication();PrayerAlarm.prefs(c).edit().putString("settings","""{"enabled":true,"items":{"fajr":{"enabled":true,"snooze":5,"count":2}}}""").commit();val before=System.currentTimeMillis();PrayerAlarm.snooze(c,"fajr",0);val at=PrayerAlarm.prefs(c).getLong("snooze_fajr",0);assertTrue(at>=before+300000L);assertEquals(1,PrayerAlarm.prefs(c).getInt("snoozeCount_fajr",0));PrayerAlarm.snooze(c,"fajr",2);assertEquals(at,PrayerAlarm.prefs(c).getLong("snooze_fajr",0))}
 @Test fun onceStopsWithoutChangingDailyOrAdhan(){val c=RuntimeEnvironment.getApplication();val ad=c.getSharedPreferences("adhan_schedule",0);ad.edit().putString("sentinel","unchanged").commit();PrayerAlarm.prefs(c).edit().putString("settings","""{"enabled":true,"items":{"fajr":{"enabled":true,"repeat":"once"},"asr":{"enabled":true,"repeat":"daily"}}}""").commit();PrayerAlarm.finish(c,"fajr");assertFalse(PrayerAlarm.item(c,"fajr").optBoolean("enabled"));assertTrue(PrayerAlarm.item(c,"asr").optBoolean("enabled"));assertTrue(PrayerAlarm.settings(c).optBoolean("enabled"));assertEquals("unchanged",ad.getString("sentinel",""))}
 @Test fun claimedAlarmCannotRingTwiceOrWhenDisabled(){val c=RuntimeEnvironment.getApplication();PrayerAlarm.prefs(c).edit().putString("settings","""{"enabled":true,"items":{"fajr":{"enabled":true}}}""").commit();val at=System.currentTimeMillis();assertTrue(PrayerAlarm.claim(c,"fajr",at,0));assertFalse(PrayerAlarm.claim(c,"fajr",at,0));assertFalse(PrayerAlarm.claim(c,"asr",at,0));assertFalse(PrayerAlarm.claim(c,"fajr",at-180000L,0))}
}
