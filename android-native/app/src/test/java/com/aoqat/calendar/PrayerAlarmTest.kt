package com.aoqat.calendar
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.json.JSONObject
import java.time.*
import android.app.AlarmManager
import android.content.Context
import android.media.AudioManager
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
@RunWith(RobolectricTestRunner::class)
class PrayerAlarmTest {
 @Test fun independentMasterAndDaysGateDelivery(){val s=JSONObject("""{"enabled":true,"items":{"asr":{"enabled":true,"repeat":"days","days":[3]}}}""");val at=LocalDate.of(2026,10,7).atTime(15,16).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();assertTrue(PrayerAlarm.allowed(s,"asr",at));s.put("enabled",false);assertFalse(PrayerAlarm.allowed(s,"asr",at));}
 @Test fun midnightThirdUsesNextDayFajr(){val c=RuntimeEnvironment.getApplication();c.getSharedPreferences("iqama_schedule",0).edit().putString("rows","""[{"gregorian_month":10,"gregorian_day":7,"maghrib":"5:44"},{"gregorian_month":10,"gregorian_day":8,"fajr":"4:50"}]""").commit();val e=PrayerAlarm.events(c,LocalDate.of(2026,10,7));val m=e.first{it.id=="maghrib"&&Instant.ofEpochMilli(it.at).atZone(ZoneId.systemDefault()).toLocalDate()==LocalDate.of(2026,10,7)}.at;val f=e.first{it.id=="fajr"&&Instant.ofEpochMilli(it.at).atZone(ZoneId.systemDefault()).toLocalDate()==LocalDate.of(2026,10,8)}.at;assertEquals(m+(f-m)*2/3,e.first{it.id=="third"}.at);}
 @Before fun cleanAlarmSettings(){PrayerAlarm.prefs(RuntimeEnvironment.getApplication()).edit().clear().commit()}
 @Test fun snoozePersistsAndStopsAtLimit(){val c=RuntimeEnvironment.getApplication();PrayerAlarm.prefs(c).edit().putString("settings","""{"enabled":true,"items":{"fajr":{"enabled":true,"snooze":5,"count":2}}}""").commit();val before=System.currentTimeMillis();PrayerAlarm.snooze(c,"fajr",0);val at=PrayerAlarm.prefs(c).getLong("snooze_fajr",0);assertTrue(at>=before+300000L);assertEquals(1,PrayerAlarm.prefs(c).getInt("snoozeCount_fajr",0));PrayerAlarm.snooze(c,"fajr",2);assertEquals(at,PrayerAlarm.prefs(c).getLong("snooze_fajr",0))}
 @Test fun onceStopsWithoutChangingDailyOrAdhan(){val c=RuntimeEnvironment.getApplication();val ad=c.getSharedPreferences("adhan_schedule",0);ad.edit().putString("sentinel","unchanged").commit();PrayerAlarm.prefs(c).edit().putString("settings","""{"enabled":true,"items":{"fajr":{"enabled":true,"repeat":"once"},"asr":{"enabled":true,"repeat":"daily"}}}""").commit();PrayerAlarm.finish(c,"fajr");assertFalse(PrayerAlarm.item(c,"fajr").optBoolean("enabled"));assertTrue(PrayerAlarm.item(c,"asr").optBoolean("enabled"));assertTrue(PrayerAlarm.settings(c).optBoolean("enabled"));assertEquals("unchanged",ad.getString("sentinel",""))}
 @Test fun claimedAlarmCannotRingTwiceOrWhenDisabled(){val c=RuntimeEnvironment.getApplication();PrayerAlarm.prefs(c).edit().putString("settings","""{"enabled":true,"items":{"fajr":{"enabled":true}}}""").commit();val at=System.currentTimeMillis();assertTrue(PrayerAlarm.claim(c,"fajr",at,0));assertFalse(PrayerAlarm.claim(c,"fajr",at,0));assertFalse(PrayerAlarm.claim(c,"asr",at,0));assertFalse(PrayerAlarm.claim(c,"fajr",at-180000L,0))}
 @Test fun thirdDoesNotUseFajrFromLaterDay(){val c=RuntimeEnvironment.getApplication();c.getSharedPreferences("iqama_schedule",0).edit().putString("rows","""[{"gregorian_month":10,"gregorian_day":7,"maghrib":"5:44"},{"gregorian_month":10,"gregorian_day":9,"fajr":"4:50"}]""").commit();val events=PrayerAlarm.events(c,LocalDate.of(2026,10,7));val m=events.first{it.id=="maghrib"&&Instant.ofEpochMilli(it.at).atZone(ZoneId.systemDefault()).toLocalDate()==LocalDate.of(2026,10,7)}.at;val backup=PrayerTimes.rows(c);val tomorrow=(0 until backup.length()).map{backup.getJSONObject(it)}.first{it.optInt("gregorian_month")==10&&it.optInt("gregorian_day")==8};val minutes=PrayerTimes.minutes(tomorrow.getString("fajr"),"fajr")!!;val f=LocalDate.of(2026,10,8).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()+minutes*60000L;assertEquals(m+(f-m)*2/3,events.first{it.id=="third"&&Instant.ofEpochMilli(it.at).atZone(ZoneId.systemDefault()).toLocalDate()==LocalDate.of(2026,10,8)}.at)}
 @Test fun everyPrayerSurvivesReschedulingJustAfterItsDeadline(){
  val c=RuntimeEnvironment.getApplication();val now=System.currentTimeMillis();val at=now-30000
  val items=JSONObject();PrayerAlarm.ids.forEach{items.put(it,JSONObject().put("enabled",true))}
  PrayerAlarm.prefs(c).edit().putString("settings",JSONObject().put("enabled",true).put("items",items).toString()).commit()
  PrayerAlarm.ids.forEach{id->
   val event=PrayerTimes.Prayer(id,at,false)
   assertTrue(id,PrayerAlarm.pending(c,event,now))
   assertTrue(id,PrayerAlarm.claim(c,id,at,0))
   assertFalse(id,PrayerAlarm.pending(c,event,now))
   PrayerAlarm.release(c,id,at)
   assertTrue(id,PrayerAlarm.pending(c,event,now))
   assertTrue(id,PrayerAlarm.claim(c,id,at,0))
   assertFalse(id,PrayerAlarm.claim(c,id,at,0))
  }
 }
 @Test fun enablingAnAlarmDoesNotReplayAnEarlierPrayer(){
  val c=RuntimeEnvironment.getApplication();val now=System.currentTimeMillis()
  PrayerAlarm.prefs(c).edit().putString("settings","""{"enabled":true,"items":{"asr":{"enabled":true}}}""").putLong("enabledAt_asr",now).commit()
  assertFalse(PrayerAlarm.pending(c,PrayerTimes.Prayer("asr",now-1000,false),now))
  assertFalse(PrayerAlarm.claim(c,"asr",now-1000,0))
  assertFalse(PrayerAlarm.pending(c,PrayerTimes.Prayer("asr",now-180000,false),now))
 }
 @Test @Config(sdk=[28,34]) fun schedulesAllFivePrayersAndLastThirdFromCachedRows(){
  val c=RuntimeEnvironment.getApplication();val d=LocalDate.now().plusDays(1);val next=d.plusDays(1)
  val row=JSONObject().put("gregorian_month",d.monthValue).put("gregorian_day",d.dayOfMonth).put("fajr","4:43").put("dhuhr","11:59").put("asr","3:22").put("maghrib","5:53").put("isha","7:13")
  c.getSharedPreferences("iqama_schedule",0).edit().putString("rows",org.json.JSONArray().put(row).put(JSONObject().put("gregorian_month",next.monthValue).put("gregorian_day",next.dayOfMonth).put("fajr","4:44")).toString()).commit()
  val items=JSONObject();PrayerAlarm.ids.forEach{items.put(it,JSONObject().put("enabled",true))}
  PrayerAlarm.prefs(c).edit().putString("settings",JSONObject().put("enabled",true).put("items",items).toString()).commit()
  if(android.os.Build.VERSION.SDK_INT>=31)org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
  val manager=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  repeat(2){PrayerAlarm.schedule(c)}
  val alarms=shadowOf(manager).scheduledAlarms.filter{shadowOf(it.operation).savedIntent.component?.className==PrayerAlarmReceiver::class.java.name}
  PrayerAlarm.ids.forEach{id->val e=PrayerAlarm.events(c,d).first{it.id==id&&Instant.ofEpochMilli(it.at).atZone(ZoneId.systemDefault()).toLocalDate()==d};val matching=alarms.filter{val i=shadowOf(it.operation).savedIntent;i.getStringExtra("id")==id&&i.getLongExtra("at",0)==e.at};assertEquals(id,1,matching.size);assertEquals(e.at,matching.single().triggerAtTime)}
  assertEquals(d.atTime(15,22).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(),PrayerAlarm.events(c,d).first{it.id=="asr"&&Instant.ofEpochMilli(it.at).atZone(ZoneId.systemDefault()).toLocalDate()==d}.at)
 }
 @Test fun silentAlarmStreamIsRaisedAndRestoredWithoutChangingRingtone(){
  val c=RuntimeEnvironment.getApplication();val am=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  PrayerAlarmAudio.restore(c);am.setStreamVolume(AudioManager.STREAM_ALARM,0,0);val ring=am.getStreamVolume(AudioManager.STREAM_RING)
  PrayerAlarmAudio.ensureAudible(c);assertTrue(am.getStreamVolume(AudioManager.STREAM_ALARM)>0);assertEquals(ring,am.getStreamVolume(AudioManager.STREAM_RING))
  PrayerAlarmAudio.restore(c);assertEquals(0,am.getStreamVolume(AudioManager.STREAM_ALARM))
  am.setStreamVolume(AudioManager.STREAM_ALARM,2,0);PrayerAlarmAudio.ensureAudible(c);assertEquals(2,am.getStreamVolume(AudioManager.STREAM_ALARM));PrayerAlarmAudio.restore(c)
 }
 @Test fun volumeChangesMadeDuringAlarmArePreserved(){
  val c=RuntimeEnvironment.getApplication();val am=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  PrayerAlarmAudio.restore(c);am.setStreamVolume(AudioManager.STREAM_ALARM,0,0);PrayerAlarmAudio.ensureAudible(c);am.setStreamVolume(AudioManager.STREAM_ALARM,1,0);PrayerAlarmAudio.restore(c);assertEquals(1,am.getStreamVolume(AudioManager.STREAM_ALARM))
 }
}
