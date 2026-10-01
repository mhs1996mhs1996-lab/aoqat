package com.aoqat.calendar

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.provider.Settings
import android.widget.Chronometer
import android.widget.RemoteViews
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.LooperMode
import org.robolectric.shadows.ShadowSystemClock
import java.time.Duration

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28, 34])
@LooperMode(LooperMode.Mode.PAUSED)
class IqamaNotificationTest {
    private val context: Context get() = RuntimeEnvironment.getApplication()
    private fun timer(view: RemoteViews): Chronometer =
        view.apply(context, null).findViewById(R.id.iqama_chronometer)

    private fun assertSurfaces(n: Notification, base: Long, countdown: Boolean, title: String) {
        assertNotNull(n.publicVersion)
        val surfaces = listOf(n.contentView, n.bigContentView, n.headsUpContentView,
            n.publicVersion.contentView, n.publicVersion.bigContentView)
        for (surface in surfaces) {
            assertNotNull(surface)
            val root = surface.apply(context, null)
            val clock = root.findViewById<Chronometer>(R.id.iqama_chronometer)
            assertEquals(base, clock.base)
            assertEquals(countdown, clock.isCountDown)
            assertEquals(title, root.findViewById<TextView>(R.id.iqama_state).text.toString())
        }
        // No stale numeric fallback for a lock-screen host to cache.
        assertNull(n.extras.getCharSequence(Notification.EXTRA_TEXT))
    }

    @Test fun shadeCollapsedExpandedAndLockScreenShareOneClock() {
        val start = SystemClock.elapsedRealtime() - 91_000L
        val display = IqamaCycle.display(start, SystemClock.elapsedRealtime())!!
        assertSurfaces(IqamaNotificationRenderer.build(context, display),
            start + 600_000L, true, "باقي على الإقامة")
    }

    @Test fun backgroundAccessPermissionIsDeclared() {
        val info = context.packageManager.getPackageInfo(context.packageName, android.content.pm.PackageManager.GET_PERMISSIONS)
        assertTrue(info.requestedPermissions.contains(android.Manifest.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS))
    }

    @Test @Config(sdk = [34]) fun backgroundCountdownIsPublishedImmediately() {
        val display = IqamaCycle.display(SystemClock.elapsedRealtime() - 10_000L, SystemClock.elapsedRealtime())!!
        val notification = IqamaNotificationRenderer.build(context, display)
        assertEquals(Notification.FOREGROUND_SERVICE_IMMEDIATE, org.robolectric.util.ReflectionHelpers.getField<Int>(notification, "mFgsDeferBehavior"))
        assertTrue(notification.flags and Notification.FLAG_NO_CLEAR != 0)
        assertSurfaces(notification, display.baseRealtime, true, "باقي على الإقامة")
    }

    @Test fun openingAnotherSurfaceSevenMinutesLaterDoesNotUseOldText() {
        val start = SystemClock.elapsedRealtime() - 91_000L
        val notification = IqamaNotificationRenderer.build(context,
            IqamaCycle.display(start, SystemClock.elapsedRealtime())!!)
        val original = timer(notification.contentView)
        ShadowSystemClock.advanceBy(Duration.ofSeconds(438))
        val lock = timer(notification.publicVersion.contentView)
        assertEquals(original.base, lock.base)
        assertEquals(71_000L, lock.base - SystemClock.elapsedRealtime())
        assertEquals("01:11", lock.text.toString())
        assertEquals("01:11", IqamaCycle.frame(SystemClock.elapsedRealtime() - start).clock())
    }

    @Test fun phaseSwitchAndRestartKeepOriginalZeroPoint() {
        Settings.Global.putInt(context.contentResolver, Settings.Global.BOOT_COUNT, 7)
        context.getSharedPreferences("iqama_schedule", Context.MODE_PRIVATE)
            .edit().putBoolean("enabled", true).commit()
        val prayer = System.currentTimeMillis() - 599_000L
        val controller = Robolectric.buildService(IqamaNotificationService::class.java,
            Intent().setAction("START_CYCLE").putExtra("prayerAt", prayer).putExtra("prayerId", "isha")).create()
        controller.startCommand(0, 1)
        val saved = context.getSharedPreferences("iqama_service_state", Context.MODE_PRIVATE)
        val anchor = saved.getLong("startRealtime", 0L)
        shadowOf(android.os.Looper.getMainLooper()).idleFor(Duration.ofSeconds(2))
        val manager = shadowOf(context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
        assertSurfaces(manager.getNotification(IqamaPersistentNotification.NOTIFICATION_ID),
            anchor + 600_000L, false, "مضى على الإقامة")
        controller.destroy()
        val restarted = Robolectric.buildService(IqamaNotificationService::class.java,
            Intent().setAction("RECONCILE")).create()
        restarted.startCommand(0, 2)
        assertEquals(anchor, saved.getLong("startRealtime", -1L))
        assertSurfaces(manager.getNotification(IqamaPersistentNotification.NOTIFICATION_ID),
            anchor + 600_000L, false, "مضى على الإقامة")
        shadowOf(android.os.Looper.getMainLooper()).idleFor(Duration.ofMinutes(10))
        assertFalse(saved.getBoolean("active", true))
        assertNull(manager.getNotification(IqamaPersistentNotification.NOTIFICATION_ID))
        restarted.destroy()
    }

    @Test fun configuredFifteenMinutesBeforeAndFiveAfterDriveEverySurface() {
        context.getSharedPreferences("iqama_schedule", Context.MODE_PRIVATE).edit()
            .putBoolean("enabled", true).putString("minutes", "{\"isha\":15}")
            .putString("afterMinutes", "{\"isha\":5}").commit()
        val prayer = System.currentTimeMillis() - 85_000L
        val controller = Robolectric.buildService(IqamaNotificationService::class.java,
            Intent().setAction("START_CYCLE").putExtra("prayerAt", prayer).putExtra("prayerId", "isha")).create()
        controller.startCommand(0, 1)
        val saved = context.getSharedPreferences("iqama_service_state", Context.MODE_PRIVATE)
        val anchor = saved.getLong("startRealtime", 0L)
        val manager = shadowOf(context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
        assertSurfaces(manager.getNotification(IqamaPersistentNotification.NOTIFICATION_ID),
            anchor + 900_000L, true, "باقي على الإقامة")
        assertEquals("13:35", IqamaCycle.frame(SystemClock.elapsedRealtime() - anchor,
            IqamaNativeScheduler.durations(context, "isha")).clock())
        shadowOf(android.os.Looper.getMainLooper()).idleFor(Duration.ofSeconds(815))
        assertSurfaces(manager.getNotification(IqamaPersistentNotification.NOTIFICATION_ID),
            anchor + 900_000L, false, "مضى على الإقامة")
        shadowOf(android.os.Looper.getMainLooper()).idleFor(Duration.ofMinutes(5))
        assertFalse(saved.getBoolean("active", true))
        assertNull(manager.getNotification(IqamaPersistentNotification.NOTIFICATION_ID))
        controller.destroy()
    }

    @Test fun eachPrayerReadsItsOwnSavedBeforeAndAfterDurations() {
        context.getSharedPreferences("iqama_schedule", Context.MODE_PRIVATE).edit()
            .putString("minutes", "{\"fajr\":30,\"maghrib\":5,\"isha\":15}")
            .putString("afterMinutes", "{\"fajr\":25,\"maghrib\":15,\"isha\":5}").commit()
        assertEquals(IqamaCycle.Durations(30,25), IqamaNativeScheduler.durations(context,"fajr"))
        assertEquals(IqamaCycle.Durations(5,15), IqamaNativeScheduler.durations(context,"maghrib"))
        assertEquals(IqamaCycle.Durations(15,5), IqamaNativeScheduler.durations(context,"isha"))
        assertEquals(IqamaCycle.Durations(10,10), IqamaNativeScheduler.durations(context,"asr"))
    }
}
