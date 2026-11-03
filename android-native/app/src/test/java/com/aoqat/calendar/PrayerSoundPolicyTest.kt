package com.aoqat.calendar

import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class PrayerSoundPolicyTest {
    private val c:Context get()=RuntimeEnvironment.getApplication()
    private fun policy(silent:Boolean,dnd:Boolean)=JSONObject("""{
      "soundPolicy":{"dhuhr":{"silent":$silent,"dnd":$dnd}},
      "overrideSilent":false
    }""")

    @Test fun eachPrayerKeepsSeparateSilentAndDndDecisions() {
        val s=policy(true,false)
        assertTrue(PrayerSoundPolicy.enabledFor(s,"dhuhr","silent"))
        assertFalse(PrayerSoundPolicy.enabledFor(s,"dhuhr","dnd"))
        assertFalse(PrayerSoundPolicy.enabledFor(s,"asr","silent"))
        assertFalse(PrayerSoundPolicy.enabledFor(s,"asr","dnd"))
        assertTrue(PrayerSoundPolicy.enabledFor(policy(false,true),"dhuhr","dnd"))
        assertFalse(PrayerSoundPolicy.enabledFor(policy(false,true),"dhuhr","silent"))
    }
    @Test fun legacyGlobalSilentChoiceMigratesOnlyWhenNoSpecificPrayerOverride() {
        val legacy=JSONObject("""{"overrideSilent":true}""")
        assertTrue(PrayerSoundPolicy.enabledFor(legacy,"fajr","silent"))
        val specific=JSONObject("""{"overrideSilent":true,"soundPolicy":{"fajr":{"silent":false,"dnd":true}}}""")
        assertFalse(PrayerSoundPolicy.enabledFor(specific,"fajr","silent"))
        assertTrue(PrayerSoundPolicy.enabledFor(specific,"fajr","dnd"))
    }
}
