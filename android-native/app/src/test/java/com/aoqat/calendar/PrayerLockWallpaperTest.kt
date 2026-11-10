package com.aoqat.calendar

import android.app.WallpaperManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.service.wallpaper.WallpaperService
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/** Wallpaper is opt-in: service registration must not select or change it. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk=[34])
class PrayerLockWallpaperTest {
    private val app: Context get() = RuntimeEnvironment.getApplication()

    @Test fun wallpaperIsRegisteredForTheSystemPicker() {
        val component=ComponentName(app,PrayerLockWallpaperService::class.java)
        val info=app.packageManager.getServiceInfo(component,PackageManager.GET_META_DATA)
        assertEquals("android.permission.BIND_WALLPAPER",info.permission)
        assertTrue(info.exported)
        assertNotNull(info.metaData)
        assertTrue(info.metaData.containsKey(WallpaperService.SERVICE_META_DATA))
        val preview=Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER)
            .putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,component)
        assertEquals(component,preview.getParcelableExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT))
    }

    @Test fun wallpaperSettingsAreIndependentFromHomeWidgetsAndAlarms() {
        val preferences=app.getSharedPreferences("prayer_lock_wallpaper",Context.MODE_PRIVATE)
        preferences.edit().clear().commit()
        assertTrue("The wallpaper preview starts with all six daily times",
            preferences.getBoolean("show_times",true))
        preferences.edit().putBoolean("show_times",false).commit()
        assertFalse(preferences.getBoolean("show_times",true))
        // This setting never touches the user's adhan or home-screen widget preferences.
        assertFalse(preferences.contains("adhan_settings"))
        assertFalse(preferences.contains("aoqatWidgetAppearanceV1"))
    }
}
