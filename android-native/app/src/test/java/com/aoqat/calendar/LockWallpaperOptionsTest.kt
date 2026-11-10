package com.aoqat.calendar

import android.content.Context
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[34])
class LockWallpaperOptionsTest {
    private val c:Context get()=RuntimeEnvironment.getApplication()
    private fun reset()=c.getSharedPreferences("prayer_lock_wallpaper",Context.MODE_PRIVATE).edit().clear().commit()

    @Test fun wallpaperSelectionDefaultsAndLegacyUpgrade(){
        reset()
        var cfg=LockWallpaperOptions.read(c)
        assertTrue(LockWallpaperOptions.selected(cfg,"next"))
        assertFalse(LockWallpaperOptions.selected(cfg,"iqama"))
        assertEquals(6,LockWallpaperOptions.visiblePrayers(cfg).size)
        c.getSharedPreferences("prayer_lock_wallpaper",Context.MODE_PRIVATE).edit().putBoolean("show_times",false).commit()
        cfg=LockWallpaperOptions.read(c)
        assertTrue(LockWallpaperOptions.selected(cfg,"next"))
        assertTrue(LockWallpaperOptions.visiblePrayers(cfg).isEmpty())
    }

    @Test fun selectingAndDeselectingElementsChangesCardHeight(){
        reset()
        val cfg=LockWallpaperOptions.read(c)
        val tall=LockWallpaperOptions.cardHeight(cfg)
        LockWallpaperOptions.prayerIds.forEach{cfg.getJSONObject("items").put(it,false)}
        val short=LockWallpaperOptions.cardHeight(cfg)
        assertTrue(tall>short+100f)
        cfg.getJSONObject("items").put("iqama",true)
        assertTrue(LockWallpaperOptions.cardHeight(cfg)>short)
    }

    @Test fun cannotSaveEmptyCardAndInvalidValuesAreSanitized(){
        reset()
        val blank=LockWallpaperOptions.read(c)
        LockWallpaperOptions.ids.forEach{blank.getJSONObject("items").put(it,false)}
        assertFalse(LockWallpaperOptions.configure(c,blank.toString()))
        assertTrue(LockWallpaperOptions.selected(LockWallpaperOptions.read(c),"next"))
        val cfg=LockWallpaperOptions.read(c)
        cfg.getJSONObject("items").put("iqama",true).put("fajr",false)
        cfg.put("size",170).put("labelFont","serif").put("numberFont","condensed")
            .put("labelColor","#ABCDEF").put("numberColor","invalid")
        assertTrue(LockWallpaperOptions.configure(c,cfg.toString()))
        val saved=LockWallpaperOptions.read(c)
        assertTrue(LockWallpaperOptions.selected(saved,"iqama"))
        assertFalse(LockWallpaperOptions.selected(saved,"fajr"))
        assertEquals(160,saved.getInt("size"))
        assertEquals("serif",saved.getString("labelFont"))
        assertEquals("#ABCDEF",saved.getString("labelColor"))
        assertEquals("#F8D37E",saved.getString("numberColor"))
    }
}
