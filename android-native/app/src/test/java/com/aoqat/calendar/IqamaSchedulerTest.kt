package com.aoqat.calendar

import android.app.AlarmManager
import android.app.Application
import android.content.Context
import android.content.Intent
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.time.LocalDate
import java.time.ZoneId

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28, 34])
class IqamaSchedulerTest {
    private val context: Context get() = RuntimeEnvironment.getApplication()

    private fun seedTomorrow(): Long {
        val date = LocalDate.now().plusDays(1)
        context.getSharedPreferences("iqama_schedule", Context.MODE_PRIVATE).edit()
            .putBoolean("enabled", true)
            .putString("minutes", """{"fajr":20}""").commit()
        // Scheduler uses the actual offline database, not the legacy iqama_schedule.rows cache.
        val rows = PrayerTimes.rows(context)
        val row = (0 until rows.length()).map { rows.getJSONObject(it) }.first {
            it.optInt("gregorian_month") == date.monthValue && it.optInt("gregorian_day") == date.dayOfMonth
        }
        val fajr = PrayerTimes.minutes(row.optString("fajr"), "fajr")\n            ?: error("Missing valid offline fajr for $date")
        return date.atStartOfDay().plusMinutes(fajr.toLong())
            .atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
    }

    @Test fun cachedPrayerSchedulesAnAlarmClockWithoutActivityOrNetwork() {
        val expected = seedTomorrow()
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (android.os.Build.VERSION.SDK_INT >= 31) org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        IqamaNativeScheduler.scheduleCached(context)
        val alarms = shadowOf(manager).scheduledAlarms
        val fajr = alarms.first { shadowOf(it.operation).savedIntent.getStringExtra("prayerId") == "fajr" }
        assertEquals(expected, fajr.triggerAtTime)
        assertEquals("NATIVE_START", shadowOf(fajr.operation).savedIntent.action)
        assertEquals(expected, shadowOf(fajr.operation).savedIntent.getLongExtra("prayerAt", 0L))
        assertNotNull(manager.nextAlarmClock)
        assertNull(shadowOf(context as Application).nextStartedActivity)
    }

    @Test fun alarmReceiverStartsCountdownWhileNoActivityIsOpen() {
        seedTomorrow()
        val prayer = System.currentTimeMillis() - 60_000L
        IqamaNotificationReceiver().onReceive(context,
            Intent(context, IqamaNotificationReceiver::class.java).setAction("NATIVE_START")
                .putExtra("prayerAt", prayer).putExtra("prayerId", "fajr"))
        val service = shadowOf(context as Application).nextStartedService
        assertNotNull(service)
        assertEquals(IqamaNotificationService::class.java.name, service.component!!.className)
        assertEquals("START_CYCLE", service.action)
        assertEquals(prayer, service.getLongExtra("prayerAt", 0L))
        assertEquals("fajr", service.getStringExtra("prayerId"))
        assertNull(shadowOf(context as Application).nextStartedActivity)
    }

    @Test @Config(sdk = [34]) fun missingExactAccessNeverSilentlySchedulesAnInexactPrayerAlarm() {
        seedTomorrow()
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(false)
        IqamaNativeScheduler.scheduleCached(context)
        assertTrue(shadowOf(manager).scheduledAlarms.isEmpty())
        org.robolectric.shadows.ShadowAlarmManager.setCanScheduleExactAlarms(true)
        IqamaNativeScheduler.scheduleCached(context)
        assertNotNull(manager.nextAlarmClock)
    }
}
