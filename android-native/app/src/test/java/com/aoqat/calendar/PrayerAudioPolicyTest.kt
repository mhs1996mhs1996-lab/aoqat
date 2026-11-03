package com.aoqat.calendar

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PrayerAudioPolicyTest {
    @Test fun allFivePrayersHaveTwoIndependentAudioPermissions() {
        val perPrayer = JSONObject()
        PrayerTimes.ids.forEach { perPrayer.put(it, JSONObject().put("silent", false).put("dnd", false)) }
        val settings = JSONObject().put("audibility", perPrayer)
        PrayerTimes.ids.forEach { id ->
            assertTrue(id, PrayerAudioPolicy.allowed(settings, id, false, false))
            assertFalse(id, PrayerAudioPolicy.allowed(settings, id, true, false))
            assertFalse(id, PrayerAudioPolicy.allowed(settings, id, false, true))
            perPrayer.getJSONObject(id).put("silent", true)
            assertTrue(id, PrayerAudioPolicy.allowed(settings, id, true, false))
            assertFalse(id, PrayerAudioPolicy.allowed(settings, id, false, true))
            assertFalse(id, PrayerAudioPolicy.allowed(settings, id, true, true))
            perPrayer.getJSONObject(id).put("dnd", true)
            assertTrue(id, PrayerAudioPolicy.allowed(settings, id, true, true))
        }
    }

    @Test fun aSinglePrayerSwitchNeverChangesTheOtherFour() {
        val selected = JSONObject().put("asr", JSONObject().put("silent", true).put("dnd", false))
        val settings = JSONObject().put("audibility", selected)
        assertTrue(PrayerAudioPolicy.allowed(settings, "asr", true, false))
        assertFalse(PrayerAudioPolicy.allowed(settings, "asr", false, true))
        assertFalse(PrayerAudioPolicy.allowed(settings, "fajr", true, false))
        assertFalse(PrayerAudioPolicy.allowed(settings, "isha", false, true))
    }

    @Test fun legacyOverridePreservesExistingChoicesUntilNewButtonsAreSet() {
        val settings = JSONObject().put("overrideSilent", true)
        PrayerTimes.ids.forEach { id ->
            assertTrue(PrayerAudioPolicy.allowed(settings, id, true, true))
        }
        settings.put("audibility", JSONObject().put("fajr", JSONObject().put("silent", false).put("dnd", true)))
        assertFalse(PrayerAudioPolicy.allowed(settings, "fajr", true, true))
        assertTrue(PrayerAudioPolicy.allowed(settings, "asr", true, true))
    }

    @Test fun otherScheduledServicesDoNotInheritTheFivePrayerPolicy() {
        val settings = JSONObject()
        assertTrue(PrayerAudioPolicy.allowed(settings, "third", true, true))
        assertTrue(PrayerAudioPolicy.allowed(settings, "fridayFirst", true, true))
    }
}
