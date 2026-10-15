package com.aoqat.calendar
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.time.LocalDate
import java.time.DayOfWeek

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class CommunityRemindersTest {
 private val row=JSONObject().put("fajr","04:50").put("maghrib","17:35").put("isha","19:00")
 private fun find(m:Int,n:Int):LocalDate=(0L..799).map{LocalDate.of(2026,1,1).plusDays(it)}.first{CommunityReminderPlan.hijri(it)==(m to n)}
 @Test fun worshipOnAndPostingOffByDefault(){val thu=CommunityReminderPlan.events(LocalDate.of(2026,10,15),JSONObject(),row);assertTrue(thu.any{it.optString("kind")=="sunnah"});assertFalse(thu.any{it.optString("action")=="post"});val fri=CommunityReminderPlan.events(LocalDate.of(2026,10,16),JSONObject(),row).first{it.optString("kind")=="kahf"};assertEquals(9,java.time.Instant.ofEpochMilli(fri.getLong("at")).atZone(CommunityReminderPlan.zone).hour)}
 @Test fun individualPostersAndForbiddenDays(){val sun=LocalDate.of(2026,10,18);assertTrue(CommunityReminderPlan.posters(sun).any{it.first=="monday"});assertTrue(CommunityReminderPlan.posters(sun.plusDays(3)).any{it.first=="thursday"});for(n in 12..14)assertTrue(CommunityReminderPlan.posters(find(5,n)).any{it.first=="white-days"});assertFalse(CommunityReminderPlan.posters(find(5,15)).any{it.first=="white-days"});assertFalse(CommunityReminderPlan.posters(find(12,12)).any{it.first=="white-days"});for(n in 10..13)assertFalse(CommunityReminderPlan.allowed(find(12,n)));assertTrue(CommunityReminderPlan.posters(find(12,1).minusDays(1)).any{it.first=="dhul-hijjah"});assertTrue(CommunityReminderPlan.posters(find(12,8)).any{it.first=="arafah"});assertTrue(CommunityReminderPlan.posters(find(1,8)).any{it.first=="tasua"});assertTrue(CommunityReminderPlan.posters(find(1,9)).any{it.first=="ashura"});for(d in listOf(find(10,1).minusDays(1),find(10,1)))assertEquals(find(10,2),CommunityReminderPlan.posters(d).first{it.first=="shawwal"}.second)}
 @Test fun optedInPostsStayBetweenMaghribAndIshaAndRespectSelection(){
  val sun=LocalDate.of(2026,10,18)
  fun settings(time:String):JSONObject {
   return JSONObject().put("posts",JSONObject().put("fasting",JSONObject().put("enabled",true).put("mode","clock").put("time",time).put("topics",org.json.JSONArray().put("monday"))))
  }
  assertEquals(1,CommunityReminderPlan.events(sun,settings("18:05"),row).count{it.optString("action")=="post"})
  for(t in listOf("17:35","19:00"))assertFalse(CommunityReminderPlan.events(sun,settings(t),row).any{it.optString("action")=="post"})
  val off=JSONObject().put("friday",JSONObject().put("enabled",false)).put("fasting",JSONObject().put("enabled",false))
  assertTrue(CommunityReminderPlan.events(LocalDate.of(2026,10,15),off,row).isEmpty())
 }
 @Test fun inboxExpiresIndependentlyOfPrayerNotifications(){val c=RuntimeEnvironment.getApplication();val p=c.getSharedPreferences("community_reminders_v1",0);val now=System.currentTimeMillis();p.edit().putString("inbox","""[{"id":"old","createdAt":${now-86400001}},{"id":"new","createdAt":$now}]""").commit();val rows=CommunityReminders.inbox(c);assertEquals(1,rows.length());assertEquals("new",rows.getJSONObject(0).getString("id"))}
}
