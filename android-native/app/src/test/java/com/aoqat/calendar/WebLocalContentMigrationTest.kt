package com.aoqat.calendar

import android.content.Context
import android.util.Base64
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * Regression tests for preserving the owner's local prayer and appearance
 * preferences when moving from file:///android_asset to appassets HTTPS.
 *
 * Migration is only marked complete AFTER the new origin confirms that the
 * localStorage snapshot was imported. A failed capture never discards data.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28, 34])
class WebLocalContentMigrationTest {
    private val context: Context get() = RuntimeEnvironment.getApplication()

    @Before fun reset() {
        context.getSharedPreferences("web_origin_transfer_v1", Context.MODE_PRIVATE)
            .edit().clear().commit()
        context.getSharedPreferences("web_updates_v2_signed", Context.MODE_PRIVATE)
            .edit().clear().commit()
    }

    private fun engine(): WebLocalContent = WebLocalContent(
        context, WebUpdates(context), MushafAssetStore(context)
    )

    @Test fun validLegacySettingsRemainAvailableUntilNewOriginAcknowledges() {
        val migration = engine()
        assertEquals(WebLocalContent.LEGACY_URL, migration.initialUrl())
        assertTrue(migration.needsLegacyCapture(WebLocalContent.LEGACY_URL))

        val source = JSONObject()
            .put("prayerCountdownStyle", "ar-compact")
            .put("calendarAppearance", "لون تجريبي")
            .put("adhanVolume", "quiet")
            .toString()
        // evaluateJavascript returns a JSON-encoded JS string.
        assertTrue(migration.captureLegacy(JSONObject.quote(source)))
        assertEquals("Capture alone must not discard old-origin settings",
            WebLocalContent.LEGACY_URL, migration.initialUrl())

        val saved = context.getSharedPreferences("web_origin_transfer_v1",
            Context.MODE_PRIVATE).getString("snapshot", null)
        assertEquals(source, saved)

        // Only the new-origin successful import acknowledgement finishes migration.
        migration.confirmMigration()
        assertEquals(WebLocalContent.APP_URL, migration.initialUrl())
        assertFalse(migration.needsLegacyCapture(WebLocalContent.LEGACY_URL))
    }

    @Test fun invalidOrOversizedCaptureCannotFinishMigration() {
        val migration = engine()
        assertFalse(migration.captureLegacy("null"))
        assertFalse(migration.captureLegacy(JSONObject.quote("not-json")))
        assertFalse(migration.captureLegacy(JSONObject.quote("x".repeat(8 * 1024 * 1024 + 1))))
        assertEquals(WebLocalContent.LEGACY_URL, migration.initialUrl())
        assertFalse(context.getSharedPreferences("web_origin_transfer_v1",
            Context.MODE_PRIVATE).getBoolean("captured", false))
    }

    @Test fun migrationScriptPreservesExistingKeysAndUnicode() {
        val old = JSONObject().put("hijriLabel", "شهر رمضان")
            .put("prayerStyle", "custom").toString()
        val html = "<!doctype html><html><head><meta charset='utf-8'></head><body>unchanged</body></html>"
        val injected = WebLocalContent.withMigrations(html, old)

        assertTrue(injected.contains(WebLocalContent.MIGRATED_KEY))
        assertTrue(injected.contains("localStorage.getItem(k)===null"))
        assertTrue(injected.contains("new TextDecoder('utf-8')"))
        assertTrue(injected.contains("unchanged</body>"))
        assertEquals(1, Regex("function\\(\\)\\{try").findAll(injected).count())
        val encoded = Base64.encodeToString(old.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
        assertTrue(injected.contains(encoded))
        assertFalse("Do not expose cleartext religious preferences in HTML",
            injected.contains("شهر رمضان"))
    }

    @Test fun migrationInjectionRequiresHtmlHead() {
        assertThrows(IllegalArgumentException::class.java) {
            WebLocalContent.withMigrations("<html><body>bad</body></html>", "{}")
        }
    }
}
