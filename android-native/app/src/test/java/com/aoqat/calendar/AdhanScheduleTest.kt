package com.aoqat.calendar
import android.app.*
import android.content.*
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.*
import org.robolectric.annotation.Config
import org.robolectric.Shadows.shadowOf
import java.time.LocalDate
import org.json.JSONObject

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class AdhanScheduleTest{
 private val c:Context get()=RuntimeEnvironment.getApplication()
 private fun seed(){val d=LocalDate.now().plusDays(1);c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit().putString("rows","[{\"gregorian_month\":${d.monthValue},\"gregorian_day\":${d.dayOfMonth},\"fajr\":\"4:43\",\"sunrise\":\"6:04\",\"dhuhr\":\"11:59\",\"asr\":\"3:22\",\"maghrib\":\"5:53\",\"isha\":\"7:13\"}]").commit();if(android.os.Build.VERSION.SDK_INT>=31)org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)}
 private fun set(s:JSONObject){c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit().putString("settings",s.toString()).commit()}
 @Test fun defaultInstallationNeverSchedulesAudio(){seed();AdhanSchedule.schedule(c);assertFalse(AdhanSchedule.enabled(c));assertTrue(shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms.none{shadowOf(it.operation).savedIntent.action=="PLAY"})}
 @Test fun soundAlarmsUseDatabaseTimeWhileIqamaIsDisabled(){seed();set(JSONObject("{\"enabled\":true}"));AdhanSchedule.schedule(c);val alarms=shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms.filter{shadowOf(it.operation).savedIntent.action=="PLAY"};val date=LocalDate.now().plusDays(1);val dayAlarms=alarms.filter{java.time.Instant.ofEpochMilli(it.triggerAtTime).atZone(java.time.ZoneId.systemDefault()).toLocalDate()==date};assertEquals(5,dayAlarms.size);val dhuhr=dayAlarms.first{shadowOf(it.operation).savedIntent.getStringExtra("prayerId")=="dhuhr"};assertEquals(PrayerTimes.events(c,date).first{it.id=="dhuhr"}.at,dhuhr.triggerAtTime);assertEquals(11,java.time.Instant.ofEpochMilli(dhuhr.triggerAtTime).atZone(java.time.ZoneId.systemDefault()).hour);assertNull(shadowOf(c as Application).nextStartedActivity)}
 @Test fun disableCancelsEverySoundAndReminder(){seed();set(JSONObject("{\"enabled\":true,\"reminder\":10,\"suhoor\":30}"));AdhanSchedule.schedule(c);val am=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager;assertTrue(shadowOf(am).scheduledAlarms.any{shadowOf(it.operation).savedIntent.action=="PLAY"});set(JSONObject("{\"enabled\":false}"));AdhanSchedule.schedule(c);assertTrue(shadowOf(am).scheduledAlarms.none{shadowOf(it.operation).savedIntent.action in listOf("PLAY","REMINDER","SUHOOR")})}
 @Test fun staleAlarmsCannotStartAudioAndCurrentAlarmNeedsNoActivity(){seed();set(JSONObject("{\"enabled\":true}"));AdhanReceiver().onReceive(c,Intent(c,AdhanReceiver::class.java).setAction("PLAY").putExtra("prayerAt",System.currentTimeMillis()-180000).putExtra("prayerId","fajr"));assertNull(shadowOf(c as Application).nextStartedService);AdhanReceiver().onReceive(c,Intent(c,AdhanReceiver::class.java).setAction("PLAY").putExtra("prayerAt",System.currentTimeMillis()).putExtra("prayerId","fajr"));assertEquals(AdhanPlaybackService::class.java.name,shadowOf(c as Application).nextStartedService.component!!.className);assertNull(shadowOf(c as Application).nextStartedActivity)}
 @Test fun deliveryIsClaimedOnceAndRejectsFutureOrStaleAlarms(){
  set(JSONObject("{\"enabled\":true}"));val now=System.currentTimeMillis()
  assertFalse(AdhanSchedule.claim(c,"asr",now+60000))
  assertFalse(AdhanSchedule.claim(c,"asr",now-180000))
  assertTrue(AdhanSchedule.claim(c,"asr",now-10000))
  assertFalse(AdhanSchedule.claim(c,"asr",now-10000))
  AdhanSchedule.release(c,"asr",now-10000)
  assertTrue(AdhanSchedule.claim(c,"asr",now-10000))
 }
 @Test fun reschedulingJustAfterPrayerKeepsDueAlarmUntilDelivered(){
  seed();set(JSONObject("{\"enabled\":true}"))
  val time=java.time.LocalDateTime.now().withSecond(0).withNano(0)
  val id=if(time.hour<12)"fajr" else "asr"
  val hour=if(time.hour>12)time.hour-12 else time.hour
  c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit().putString("rows","[{\"gregorian_month\":${time.monthValue},\"gregorian_day\":${time.dayOfMonth},\"$id\":\"${hour}:${time.minute.toString().padStart(2,'0')}\"}]").commit()
  AdhanSchedule.schedule(c)
  val am=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  val alarm=shadowOf(am).scheduledAlarms.first{val i=shadowOf(it.operation).savedIntent;i.action=="PLAY"&&i.getStringExtra("prayerId")==id&&i.getLongExtra("prayerAt",0)==time.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()}
  val intent=shadowOf(alarm.operation).savedIntent
  assertTrue(alarm.triggerAtTime>=System.currentTimeMillis())
  assertTrue(AdhanSchedule.claim(c,id,intent.getLongExtra("prayerAt",0)))
  AdhanSchedule.schedule(c)
  assertTrue(shadowOf(am).scheduledAlarms.none{shadowOf(it.operation).savedIntent.let{i->i.action=="PLAY"&&i.getStringExtra("prayerId")==id&&i.getLongExtra("prayerAt",0)==intent.getLongExtra("prayerAt",0)}})
 }
 @Test fun parseHandlesMorningDhuhrAndAfternoon(){assertEquals(719,PrayerTimes.minutes("11:59","dhuhr"));assertEquals(922,PrayerTimes.minutes("3:22","asr"));assertEquals(364,PrayerTimes.minutes("6:04","sunrise"));assertNull(PrayerTimes.minutes("27:11","fajr"))}
}
