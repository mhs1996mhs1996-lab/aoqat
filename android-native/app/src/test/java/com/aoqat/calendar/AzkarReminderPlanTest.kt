package com.aoqat.calendar
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.*
import org.robolectric.annotation.Config
import java.time.*

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class AzkarReminderPlanTest {
 private val day=LocalDate.of(2026,10,22)
 private val row=JSONObject("""{"fajr":"4:56","sunrise":"6:14","dhuhr":"11:55","asr":"3:08","maghrib":"5:34","isha":"6:54"}""")
 private fun events(s:JSONObject=JSONObject(),r:JSONObject?=row)=AzkarReminderPlan.events(day,s,r){IqamaCycle.Durations(if(it=="fajr")20 else 10,10)}
 private fun time(e:JSONObject)=Instant.ofEpochMilli(e.getLong("at")).atZone(CommunityReminderPlan.zone).toLocalTime()
 @Test fun allSixCategoriesIncludeBothTasbihSlotsAndAllFivePrayers(){val e=events();assertEquals(11,e.size);assertEquals(LocalTime.of(5,26),time(e.first{it.optString("topicId")=="morning"}));assertEquals(LocalTime.of(17,14),time(e.first{it.optString("topicId")=="evening"}));assertEquals(listOf(LocalTime.of(8,14),LocalTime.of(15,28)),e.filter{it.optString("topicId")=="tasbih"}.map(::time));assertEquals(5,e.count{it.optString("topicId")=="prayer"});assertEquals(11,e.map{it.getString("id")}.toSet().size)}
 @Test fun customClocksWorkWithoutPrayerRowsAndDisabledCategoryHasNoEvents(){val s=JSONObject().put("tasbih",JSONObject().put("mode","custom").put("type","clock").put("times",JSONArray().put("09:10").put("16:20"))).put("sleep",JSONObject().put("enabled",false));val e=events(s,null);assertEquals(listOf(LocalTime.of(9,10),LocalTime.of(16,20)),e.filter{it.optString("topicId")=="tasbih"}.map(::time));assertFalse(e.any{it.optString("topicId")=="sleep"});assertFalse(e.any{it.optString("topicId")=="morning"})}
 @Test fun adjustedRowsAndIqamaDurationsAreAppliedExactlyOnce(){val r=JSONObject(row.toString()).put("asr","3:18");val s=JSONObject().put("tasbih",JSONObject().put("mode","custom").put("offset",5));val e=AzkarReminderPlan.events(day,s,r){IqamaCycle.Durations(15,20)};assertEquals(LocalTime.of(15,58),time(e.last{it.optString("topicId")=="tasbih"}))}
 @Test fun reminderPreviewUsesNotificationSoundAndNeverAnAlarm(){val c=RuntimeEnvironment.getApplication();CommunityReminders.preview(c,"tasbih");val channel=(c.getSystemService(Context.NOTIFICATION_SERVICE)as NotificationManager).getNotificationChannel(CommunityReminders.CHANNEL);assertEquals(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),channel.sound);assertEquals(AudioAttributes.USAGE_NOTIFICATION,channel.audioAttributes.usage)}
}
