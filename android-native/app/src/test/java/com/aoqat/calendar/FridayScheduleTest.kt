package com.aoqat.calendar
import android.app.*
import android.content.*
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.*
import org.robolectric.annotation.Config
import org.robolectric.Shadows.shadowOf
import java.time.*
import org.json.JSONObject

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class FridayScheduleTest {
 private val c:Context get()=RuntimeEnvironment.getApplication()
 @Test fun allPhasesShareTheSecondAdhanAnchor(){val t=FridayCycle.Timing(10_000_000,20,40);assertNull(FridayCycle.frame(t,t.start-1));assertEquals("باقي على أذان الجمعة الأول",FridayCycle.frame(t,t.start)?.title);assertEquals(t.first,FridayCycle.frame(t,t.start)?.base);assertEquals("باقي على الخطبة",FridayCycle.frame(t,t.first)?.title);assertEquals(t.second,FridayCycle.frame(t,t.first)?.base);assertFalse(FridayCycle.frame(t,t.second)!!.down);assertEquals("مضى على الخطبة",FridayCycle.frame(t,t.second+600_000)?.title);assertNull(FridayCycle.frame(t,t.end))}
 @Test fun fridayReplacesOnlyNoonSchedulesWithTwoAdhansAndThreeBoundaries(){var d=LocalDate.now().plusDays(1);while(d.dayOfWeek!=DayOfWeek.FRIDAY)d=d.plusDays(1);val at=d.atTime(11,59).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();val s=JSONObject("{\"enabled\":true,\"reminder\":5,\"friday\":{\"enabled\":true,\"reminder\":20,\"sermon\":40,\"quiet\":true}}");c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit().putString("settings",s.toString()).commit();c.getSharedPreferences("iqama_schedule",Context.MODE_PRIVATE).edit().putString("rows","[{\"gregorian_month\":${d.monthValue},\"gregorian_day\":${d.dayOfMonth},\"dhuhr\":\"11:59\"}]").commit();if(android.os.Build.VERSION.SDK_INT>=31)org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
  AdhanSchedule.schedule(c);val alarms=shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms;val plays=alarms.filter{shadowOf(it.operation).savedIntent.action=="PLAY"};assertEquals(2,plays.size);assertEquals(setOf(at-900000,at),plays.map{it.triggerAtTime}.toSet());assertTrue(plays.all{shadowOf(it.operation).savedIntent.getStringExtra("prayerId") in listOf("fridayFirst","fridaySecond")});assertFalse(alarms.any{shadowOf(it.operation).savedIntent.action=="REMINDER"});assertEquals(3,alarms.count{shadowOf(it.operation).savedIntent.action=="FRAME"});assertTrue(FridaySchedule.suppress(c,"dhuhr",at));assertFalse(FridaySchedule.suppress(c,"asr",at));assertFalse(FridaySchedule.suppress(c,"dhuhr",at+86400000));assertEquals(s.toString(),AdhanSchedule.settings(c).toString())
  s.getJSONObject("friday").put("enabled",false);c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).edit().putString("settings",s.toString()).commit();AdhanSchedule.schedule(c);assertTrue(shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms.any{shadowOf(it.operation).savedIntent.action=="PLAY"&&shadowOf(it.operation).savedIntent.getStringExtra("prayerId")=="dhuhr"})
 }
}
