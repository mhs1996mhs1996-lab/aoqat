package com.aoqat.calendar
import android.content.res.Configuration
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
@RunWith(RobolectricTestRunner::class)
class DisplayColorPolicyTest {
    @Test fun nightChangesPreserveOtherConfigurationAndSource() {
        val source = Configuration().apply {
            uiMode = Configuration.UI_MODE_TYPE_CAR or Configuration.UI_MODE_NIGHT_YES
            fontScale = 1.3f
            orientation = Configuration.ORIENTATION_LANDSCAPE
        }
        val display = DisplayColorPolicy.light(source)
        assertEquals(Configuration.UI_MODE_NIGHT_NO, display.uiMode and Configuration.UI_MODE_NIGHT_MASK)
        assertEquals(Configuration.UI_MODE_TYPE_CAR, display.uiMode and Configuration.UI_MODE_TYPE_MASK)
        assertEquals(source.fontScale, display.fontScale, 0f)
        assertEquals(source.orientation, display.orientation)
        assertEquals(Configuration.UI_MODE_NIGHT_YES, source.uiMode and Configuration.UI_MODE_NIGHT_MASK)
        assertEquals(display.uiMode, DisplayColorPolicy.light(display).uiMode)
    }
}
