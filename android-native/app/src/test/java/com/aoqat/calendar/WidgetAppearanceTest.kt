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
    @Test fun sixWidgetsHaveIndependentLabelAndNumberFamiliesWeightsSizesAndColors() {
        val c=RuntimeEnvironment.getApplication() as Application
        val ids=listOf("next","times","five_grid","five_featured","iqama","combined")
        val settings=JSONObject()
        ids.forEachIndexed{index,id->
            settings.put(id,JSONObject()
                .put("labels",JSONObject().put("font","serif").put("weight","normal")
                    .put("color","#aabbcc").put("size",80+index*5))
                .put("numbers",JSONObject().put("font","medium").put("weight","bold")
                    .put("color","#112233").put("size",130-index*5)))
        }
        assertTrue(WidgetAppearance.configure(c,settings.toString()))
        for((i,id) in ids.withIndex()) {
            val item=WidgetAppearance.item(c,id)
            assertEquals("serif",item.getJSONObject("labels").getString("font"))
            assertEquals("normal",item.getJSONObject("labels").getString("weight"))
            assertEquals(80+i*5,item.getJSONObject("labels").getInt("size"))
            assertEquals("#aabbcc",item.getJSONObject("labels").getString("color"))
            assertEquals("medium",item.getJSONObject("numbers").getString("font"))
            assertEquals("bold",item.getJSONObject("numbers").getString("weight"))
            assertEquals(130-i*5,item.getJSONObject("numbers").getInt("size"))
            assertEquals("#112233",item.getJSONObject("numbers").getString("color"))
        }
        assertEquals("transparent",WidgetAppearance.item(c,"five_grid").getString("background"))
    }

    @Test fun malformedInputIsRejectedWithoutDestroyingSavedPreferences() {
        val c=RuntimeEnvironment.getApplication() as Application
        val before=WidgetAppearance.all(c).toString()
        assertFalse(WidgetAppearance.configure(c,"not-json"))
        assertEquals(before,WidgetAppearance.all(c).toString())
    }
}
