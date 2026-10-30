package com.aoqat.calendar
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.json.JSONObject
@RunWith(RobolectricTestRunner::class)
class AfterIqamaQuietTest {
    private fun settings()=JSONObject("""{"enabled":true,"afterIqamaSilent":{"enabled":true,"minutes":{"asr":7,"fajr":3}}}""")
    @Test fun sevenMinutesBeginAtConfiguredAsrIqama() {
        val times=AfterIqamaQuiet.window(settings(),"asr",1000000L,25)!!
        assertEquals(2500000L,times.first);assertEquals(2920000L,times.second)
        assertNull(AfterIqamaQuiet.window(settings(),"maghrib",1000000L,10))
    }
    @Test fun quietSwitchIsIndependentOfAdhanAudioMaster() {
        val s=settings().put("enabled",false)
        val win=AfterIqamaQuiet.window(s,"asr",1000000L,25)!!
        assertEquals(2500000L,win.first)
        assertEquals(2920000L,win.second)
        s.getJSONObject("afterIqamaSilent").put("enabled",false)
        assertNull(AfterIqamaQuiet.window(s,"asr",1000000L,25))
    }
    @Test fun zeroMinuteDurationAndUnknownPrayerNeverMutePhone() {
        val s=settings()
        assertNull(AfterIqamaQuiet.window(s,"maghrib",1000000L,5))
        assertNull(AfterIqamaQuiet.window(s,"unknown",1000000L,5))
    }
}
