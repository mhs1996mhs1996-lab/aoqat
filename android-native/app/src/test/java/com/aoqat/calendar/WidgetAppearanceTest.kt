package com.aoqat.calendar

import android.app.Application
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class WidgetAppearanceTest {
    @Test fun eachCardHasIndependentDefaultsAndValidation() {
        val c=RuntimeEnvironment.getApplication() as Application
        assertEquals("transparent", WidgetAppearance.item(c,"next").getString("background"))
        assertEquals("mist", WidgetAppearance.item(c,"times").getString("background"))
        assertEquals("transparent", WidgetAppearance.item(c,"iqama").getString("background"))
        val raw=JSONObject("""{"times":{"background":"cream","font":"serif","color":"navy","scale":135},"iqama":{"background":"blue","scale":500},"next":{"background":"invalid","font":"unknown","scale":-50}}""")
        assertTrue(WidgetAppearance.configure(c,raw.toString()))
        assertEquals("cream",WidgetAppearance.item(c,"times").getString("background"))
        assertEquals("serif",WidgetAppearance.item(c,"times").getString("font"))
        assertEquals("navy",WidgetAppearance.item(c,"times").getString("color"))
        assertEquals(135,WidgetAppearance.item(c,"times").getInt("scale"))
        assertEquals("blue",WidgetAppearance.item(c,"iqama").getString("background"))
        assertEquals(145,WidgetAppearance.item(c,"iqama").getInt("scale"))
        assertEquals("transparent",WidgetAppearance.item(c,"next").getString("background"))
        assertEquals("sans",WidgetAppearance.item(c,"next").getString("font"))
        assertEquals(75,WidgetAppearance.item(c,"next").getInt("scale"))
    }
    @Test fun malformedInputIsRejectedWithoutDestroyingSavedPreferences() {
        val c=RuntimeEnvironment.getApplication() as Application
        val before=WidgetAppearance.all(c).toString()
        assertFalse(WidgetAppearance.configure(c,"not-json"))
        assertEquals(before,WidgetAppearance.all(c).toString())
    }
}
