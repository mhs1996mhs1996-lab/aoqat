package com.aoqat.calendar

import android.content.Context
import android.view.View
import android.widget.FrameLayout
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.time.LocalDate

/** Inflate the actual RemoteViews used by Android launchers, not just resource XML. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk=[34])
class HomeWidgetRenderingTest {
    private val c: Context get() = RuntimeEnvironment.getApplication()

    private fun seed() {
        val d = LocalDate.now()
        c.getSharedPreferences("iqama_schedule", Context.MODE_PRIVATE).edit()
            .putString("rows", """[{"gregorian_month":${d.monthValue},"gregorian_day":${d.dayOfMonth},"fajr":"5:16","sunrise":"6:35","dhuhr":"11:53","asr":"2:49","maghrib":"5:10","isha":"6:30"}]""")
            .commit()
    }

    @Test fun allThreeDailyCardsInflateWithoutWidgetLoadFailure() {
        seed()
        for (layout in listOf("classic", "five_grid", "five_featured")) {
            val view = FivePrayerWidget.views(c, 200, layout).apply(c, FrameLayout(c))
            for (id in listOf(R.id.widget_times_fajr, R.id.widget_times_dhuhr,
                R.id.widget_times_asr, R.id.widget_times_maghrib, R.id.widget_times_isha)) {
                val prayer = view.findViewById<TextView>(id)
                assertNotNull("$layout must show all five prayers", prayer)
                assertTrue("$layout prayer $id should have a time", prayer.text.isNotBlank())
            }
            if (layout != "classic") {
                val sunrise = view.findViewById<TextView>(R.id.widget_times_sunrise)
                assertNotNull("$layout should contain sunrise", sunrise)
                assertTrue("Sunrise must not be blank", sunrise.text.contains("الشروق"))
                assertTrue("Sunrise should contain stored time", sunrise.text.contains("6:35"))
            }
        }
    }

    @Test fun compactIqamaInflatesWithLargeTitleAndNoFooter() {
        seed()
        val view = IqamaCountdownWidget.views(c, compact = true).apply(c, FrameLayout(c))
        assertEquals(View.GONE, view.findViewById<View>(R.id.widget_iqama_state).visibility)
        val title = view.findViewById<TextView>(R.id.widget_iqama_prayer)
        val label = view.findViewById<TextView>(R.id.widget_iqama_before_title)
        assertTrue("The prayer name should be larger than the iqama label", title.textSize > label.textSize)
    }
}
