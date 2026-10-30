package com.aoqat.calendar

import android.app.*
import android.content.Context
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.*
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.time.*

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28, 34])
class PrayerNotificationsTest {
    private val c: Context get() = RuntimeEnvironment.getApplication()
    private fun enable(id: String = "asr") {
        if (android.os.Build.VERSION.SDK_INT >= 31) org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        val prayers = JSONObject(); PrayerTimes.ids.forEach { prayers.put(it, it == id) }
        PrayerNotifications.configure(c, JSONObject().put("enabled", true).put("volume", 37).put("prayers", prayers).toString())
    }
    @Test fun offlineScheduleUsesSavedEightDaysAndOnlySelectedPrayer() {
        assertTrue(PrayerTimes.rows(c).length() >= 365)
        enable()
        val alarms = shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms.filter { shadowOf(it.operation).savedIntent.action == "DUE" }
        assertTrue(alarms.isNotEmpty())
        alarms.forEach { alarm ->
            val i = shadowOf(alarm.operation).savedIntent
            assertEquals("asr", i.getStringExtra("id"))
            assertEquals(i.getLongExtra("at", 0), alarm.triggerAtTime)
            assertTrue(PrayerTimes.events(c).any { it.id == "asr" && it.at == alarm.triggerAtTime })
        }
        assertNull(shadowOf(c as Application).nextStartedActivity)
    }
    @Test fun notificationKeepsEnabledAdhanAudibleWithoutDestroyingEitherSetting() {
        val ad = """{"enabled":true,"sound":"4","volume":52,"modes":{"asr":"sound"}}"""
        val pa = """{"enabled":true,"items":{"asr":{"enabled":true,"duration":7}}}"""
        c.getSharedPreferences("adhan_settings", 0).edit().putString("settings", ad).commit()
        PrayerAlarm.prefs(c).edit().putString("settings", pa).commit()
        enable()
        val at = System.currentTimeMillis()
        assertTrue(AdhanSchedule.claim(c, "asr", at))
        assertFalse(PrayerAlarm.claim(c, "asr", at, 0))
        assertEquals(ad, AdhanSchedule.settings(c).toString())
        assertEquals(pa, PrayerAlarm.settings(c).toString())
        val alarms = shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms
        assertTrue(alarms.any { shadowOf(it.operation).savedIntent.let { i -> i.action == "PLAY" && i.getStringExtra("prayerId") == "asr" } })
        PrayerNotifications.configure(c, "{\"enabled\":false}")
        assertFalse(PrayerNotifications.selected(c, "asr"))
        assertTrue(shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms.none { shadowOf(it.operation).savedIntent.action == "DUE" })
        assertEquals(ad, AdhanSchedule.settings(c).toString())
        assertEquals(pa, PrayerAlarm.settings(c).toString())
    }
    @Test fun claimRejectsStaleFutureDisabledAndDuplicateDelivery() {
        enable(); val at = System.currentTimeMillis()
        assertFalse(PrayerNotifications.claim(c, "asr", at - 180000))
        assertFalse(PrayerNotifications.claim(c, "asr", at + 60000))
        assertFalse(PrayerNotifications.claim(c, "fajr", at))
        assertTrue(PrayerNotifications.claim(c, "asr", at))
        assertFalse(PrayerNotifications.claim(c, "asr", at))
        PrayerNotifications.configure(c, "{\"enabled\":false}")
        assertFalse(PrayerNotifications.claim(c, "asr", at))
    }
    @Test fun customFridayOverridesDhuhrNoticeAndKeepsWeekdaySettings() {
        enable("dhuhr")
        c.getSharedPreferences("adhan_settings", 0).edit().putString("settings", "{\"friday\":{\"enabled\":true}}").commit()
        val friday = LocalDate.now().with(java.time.temporal.TemporalAdjusters.nextOrSame(DayOfWeek.FRIDAY)).atTime(12, 0).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        assertTrue(FridaySchedule.suppress(c, "dhuhr", friday))
        PrayerNotifications.schedule(c)
        assertTrue(shadowOf(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).scheduledAlarms.none { shadowOf(it.operation).savedIntent.let { i -> i.action == "DUE" && Instant.ofEpochMilli(i.getLongExtra("at", 0)).atZone(ZoneId.systemDefault()).dayOfWeek == DayOfWeek.FRIDAY } })
        assertTrue(PrayerNotifications.selected(c, "dhuhr"))
    }
    @Test fun notificationUsesRequestedPrayerTitleAndHasNoSecondChannelSound() {
        val n = PrayerNotifications.notification(c, "fajr", false)
        assertEquals("حان موعد صلاة الفجر", n.extras.getString(Notification.EXTRA_TITLE))
        assertEquals("حان موعد صلاة الجمعة", PrayerNotifications.title("dhuhr", true))
        val channel = (c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).getNotificationChannel("prayer_due_system_v2")
        assertNotNull(channel)
        assertNotNull(channel.sound)
    }
}
