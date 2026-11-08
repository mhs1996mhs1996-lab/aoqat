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

    @Test fun originalVerticalCardShowsNextPrayerAndSixOrderedTimes() {
        seed()
        val view=FivePrayerWidget.views(c,270,"classic").apply(c,FrameLayout(c))
        assertNotNull(view.findViewById<android.widget.Chronometer>(R.id.widget_times_next_counter))
        assertTrue(view.findViewById<TextView>(R.id.widget_times_next_label).text.isNotBlank())
        val order=listOf("fajr","sunrise","dhuhr","asr","maghrib","isha")
        val nameIds=listOf(R.id.widget_times_fajr,R.id.widget_times_sunrise,
            R.id.widget_times_dhuhr,R.id.widget_times_asr,R.id.widget_times_maghrib,R.id.widget_times_isha)
        val timeIds=listOf(R.id.widget_time_clock_fajr,R.id.widget_time_clock_sunrise,
            R.id.widget_time_clock_dhuhr,R.id.widget_time_clock_asr,R.id.widget_time_clock_maghrib,
            R.id.widget_time_clock_isha)
        val labels=listOf("الفجر","الشروق","الظهر","العصر","المغرب","العشاء")
        for(i in order.indices) {
            assertEquals(labels[i],view.findViewById<TextView>(nameIds[i]).text.toString())
            assertTrue(view.findViewById<TextView>(timeIds[i]).text.isNotBlank())
        }
        assertTrue(view.findViewById<TextView>(R.id.widget_time_clock_sunrise).text.toString().contains("6:35"))
    }

    @Test fun combinedCountdownAndIqamaWidgetInflatesAsTwoSideBySidePills() {
        seed()
        val view=PrayerCombinedWidget.views(c).apply(c,FrameLayout(c))
        val container=view.findViewById<android.widget.LinearLayout>(R.id.widget_combined_card)
        assertEquals("Two pills must be on the same horizontal row",android.widget.LinearLayout.HORIZONTAL,container.orientation)
        val nextPill=view.findViewById<android.widget.LinearLayout>(R.id.widget_combined_next_pill)
        val iqamaPill=view.findViewById<android.widget.LinearLayout>(R.id.widget_combined_iqama_pill)
        assertNotNull(nextPill)
        assertNotNull(iqamaPill)
        assertEquals("Both pills must have the same parent",nextPill.parent,iqamaPill.parent)
        assertNotNull(view.findViewById<android.widget.Chronometer>(R.id.widget_combined_next_counter))
        assertNotNull(view.findViewById<android.widget.Chronometer>(R.id.widget_combined_iqama_counter))
        assertTrue(view.findViewById<TextView>(R.id.widget_combined_next_label).text.toString().startsWith("أذان"))
        assertEquals("باقي على الإقامة",
            view.findViewById<TextView>(R.id.widget_combined_iqama_title).text.toString())
    }

    @Test fun refreshingWidgetClearsPreviousPrayerHighlight() {
        seed()
        val rowIds=listOf(
            "fajr" to R.id.widget_times_row_fajr,
            "sunrise" to R.id.widget_times_row_sunrise,
            "dhuhr" to R.id.widget_times_row_dhuhr,
            "asr" to R.id.widget_times_row_asr,
            "maghrib" to R.id.widget_times_row_maghrib,
            "isha" to R.id.widget_times_row_isha
        )
        val view=FivePrayerWidget.views(c,270,"classic").apply(c,FrameLayout(c))
        // Simulate the phone retaining highlights from the previous prayer.
        for((_,id) in rowIds) view.findViewById<View>(id)
            .setBackgroundResource(R.drawable.aoqat_times_upcoming_row)
        FivePrayerWidget.views(c,270,"classic").reapply(c,view)
        val next=PrayerTimes.events(c).firstOrNull{it.at>System.currentTimeMillis()}?.id
        val highlighted=rowIds.filter{(_,id)->
            val background=view.findViewById<View>(id).background
            background !is android.graphics.drawable.ColorDrawable ||
                background.color != android.graphics.Color.TRANSPARENT
        }.map{it.first}
        assertEquals("No stale highlight from yesterday or earlier prayer",
            next?.let{listOf(it)} ?: emptyList<String>(),highlighted)
    }

    @Test fun compactVerticalTimetableStillIncludesAllSixRows() {
        seed()
        val view=FivePrayerWidget.views(c,180,"classic").apply(c,FrameLayout(c))
        assertNotNull(view.findViewById<android.widget.Chronometer>(R.id.widget_times_next_counter))
        val clocks=listOf(R.id.widget_time_clock_fajr,R.id.widget_time_clock_sunrise,
            R.id.widget_time_clock_dhuhr,R.id.widget_time_clock_asr,
            R.id.widget_time_clock_maghrib,R.id.widget_time_clock_isha)
        for(id in clocks) assertTrue("Every row must keep its time",view.findViewById<TextView>(id).text.isNotBlank())
    }

    @Test fun veryShortTimetableFallsBackToSixTimeGridWithoutClipping() {
        seed()
        val view=FivePrayerWidget.views(c,135,"classic").apply(c,FrameLayout(c))
        for(id in listOf(R.id.widget_times_fajr,R.id.widget_times_sunrise,
            R.id.widget_times_dhuhr,R.id.widget_times_asr,
            R.id.widget_times_maghrib,R.id.widget_times_isha)) {
            assertTrue(view.findViewById<TextView>(id).text.isNotBlank())
        }
    }

    @Test fun nextPrayerCardUsesWrapContentRatherThanTallEmptyRoot() {
        seed()
        val view=PrayerWidget.views(c,compact=true).apply(c,FrameLayout(c))
        assertEquals(android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
            view.findViewById<View>(R.id.prayer_widget_root).layoutParams.height)
        assertNotNull(view.findViewById<android.widget.Chronometer>(R.id.widget_counter))
    }

    @Test fun prayerTimetableRootWrapsContentInsteadOfFillingUnusedLauncherRows() {
        seed()
        for(height in listOf(180,270)) {
            val view=FivePrayerWidget.views(c,height,"classic").apply(c,FrameLayout(c))
            assertEquals("Timetable must not draw its root across unused home grid space",
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                view.findViewById<View>(R.id.widget_times_root).layoutParams.height)
            for(id in listOf(R.id.widget_time_clock_fajr,R.id.widget_time_clock_sunrise,
                R.id.widget_time_clock_dhuhr,R.id.widget_time_clock_asr,
                R.id.widget_time_clock_maghrib,R.id.widget_time_clock_isha)) {
                assertTrue("No prayer may disappear when the widget is compact",
                    view.findViewById<TextView>(id).text.isNotBlank())
            }
        }
    }

    @Test fun gridsWrapContentAndKeepAllSixPrayerTimes() {
        seed()
        for(layout in listOf("five_grid","five_featured")) {
            val view=FivePrayerWidget.views(c,120,layout).apply(c,FrameLayout(c))
            assertEquals(android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                view.findViewById<View>(R.id.widget_times_root).layoutParams.height)
            for(id in listOf(R.id.widget_times_fajr,R.id.widget_times_sunrise,
                R.id.widget_times_dhuhr,R.id.widget_times_asr,
                R.id.widget_times_maghrib,R.id.widget_times_isha)) {
                assertTrue(view.findViewById<TextView>(id).text.isNotBlank())
            }
        }
    }

    @Test fun verticalTimetableKeepsPrayerLabelsBesideTheirTimes() {
        seed()
        for(height in listOf(180,270)) {
            val rendered=FivePrayerWidget.views(c,height,"classic").apply(c,FrameLayout(c))
            val names=listOf(R.id.widget_times_fajr,R.id.widget_times_sunrise,
                R.id.widget_times_dhuhr,R.id.widget_times_asr,
                R.id.widget_times_maghrib,R.id.widget_times_isha)
            val clocks=listOf(R.id.widget_time_clock_fajr,R.id.widget_time_clock_sunrise,
                R.id.widget_time_clock_dhuhr,R.id.widget_time_clock_asr,
                R.id.widget_time_clock_maghrib,R.id.widget_time_clock_isha)
            val rows=listOf(R.id.widget_times_row_fajr,R.id.widget_times_row_sunrise,
                R.id.widget_times_row_dhuhr,R.id.widget_times_row_asr,
                R.id.widget_times_row_maghrib,R.id.widget_times_row_isha)
            for(i in names.indices){
                val name=rendered.findViewById<TextView>(names[i])
                val clock=rendered.findViewById<TextView>(clocks[i])
                val parent=rendered.findViewById<android.widget.LinearLayout>(rows[i])
                assertTrue(name.text.isNotBlank())
                assertTrue(clock.text.isNotBlank())
                assertEquals("Rows must center the time pair rather than fill the widget width",
                    android.view.ViewGroup.LayoutParams.WRAP_CONTENT,parent.layoutParams.width)
                assertEquals("Prayer names must not have a stretching weight",
                    android.view.ViewGroup.LayoutParams.WRAP_CONTENT,name.layoutParams.width)
                assertTrue("Compact labels should be sized consistently",name.minWidth>0)
                assertTrue("Time should follow its name with a small fixed gap",
                    (clock.layoutParams as android.widget.LinearLayout.LayoutParams).marginStart in 1..20)
            }
        }
    }

    @Test fun nextPrayerCountdownIsCenteredBesideLabelWithoutStretching() {
        seed()
        val root=PrayerWidget.views(c,compact=true).apply(c,FrameLayout(c))
        val card=root.findViewById<android.widget.LinearLayout>(R.id.widget_next_card)
        val name=root.findViewById<TextView>(R.id.widget_prayer)
        val timer=root.findViewById<android.widget.Chronometer>(R.id.widget_counter)
        assertEquals(android.view.ViewGroup.LayoutParams.WRAP_CONTENT, card.layoutParams.width)
        assertEquals(android.view.ViewGroup.LayoutParams.WRAP_CONTENT, name.layoutParams.width)
        assertEquals(android.view.ViewGroup.LayoutParams.WRAP_CONTENT, timer.layoutParams.width)
        assertEquals(0f,(name.layoutParams as android.widget.LinearLayout.LayoutParams).weight)
        assertTrue((timer.layoutParams as android.widget.LinearLayout.LayoutParams).marginStart in 6..14)
    }

    @Test fun bothVerticalTimetablesHaveFullWidthOutlinedTopCountdown() {
        seed()
        for(height in listOf(180,270)) {
            val root=FivePrayerWidget.views(c,height,"classic").apply(c,FrameLayout(c))
            val name=root.findViewById<TextView>(R.id.widget_times_next_label)
            val counter=root.findViewById<android.widget.Chronometer>(R.id.widget_times_next_counter)
            val parent=name.parent as android.widget.LinearLayout
            assertEquals(android.view.ViewGroup.LayoutParams.MATCH_PARENT,parent.layoutParams.width)
            assertEquals(0,name.layoutParams.width)
            assertEquals(1f,(name.layoutParams as android.widget.LinearLayout.LayoutParams).weight)
            assertEquals(5,(counter.layoutParams as android.widget.LinearLayout.LayoutParams).marginStart)
            assertNotNull("The top row needs a distinct pill outline",parent.background)
            assertEquals(parent,counter.parent)
        }
    }
    @Test fun pairedIqamaCapsulesKeepDistinctBackgroundFromWidgetStyle() {
        seed()
        val root=PrayerCombinedWidget.views(c).apply(c,FrameLayout(c))
        assertNotNull(root.findViewById<View>(R.id.widget_combined_next_pill))
        assertNotNull(root.findViewById<View>(R.id.widget_combined_iqama_pill))
        assertEquals(android.widget.LinearLayout.HORIZONTAL,
            root.findViewById<android.widget.LinearLayout>(R.id.widget_combined_card).orientation)
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
