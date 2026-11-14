package com.aoqat.calendar

import android.net.Uri
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
@org.robolectric.annotation.Config(sdk = [28, 34])
class WebLocalContentTest {
    private val context get() = RuntimeEnvironment.getApplication() as android.content.Context

    @Test fun preservesLegacySettingsBeforeChangingWebOrigin() {
        val c = context
        val web = WebLocalContent(c, WebUpdates(c), MushafAssetStore(c))
        assertEquals(WebLocalContent.LEGACY_URL, web.initialUrl())
        val original = JSONObject().put("aoqatTheme", "forest").put("aoqatIqamaMinutesV1", "{\"fajr\":11}")
        assertFalse(web.captureLegacy("null"))
        assertFalse(web.captureLegacy(JSONObject.quote("not a json object")))
        assertTrue(web.captureLegacy(JSONObject.quote(original.toString())))
        val restored = WebLocalContent.withMigrations("<html><head><title>App</title></head><body></body></html>", original.toString())
        assertTrue(restored.contains("aoqatLegacyWebStorageImportedV1"))
        assertTrue(restored.indexOf("<script>") < restored.indexOf("<title>"))
        assertTrue(restored.contains("localStorage.getItem(k)===null"))
        assertTrue(restored.contains("localStorage.setItem(k,source[k])"))
        web.confirmMigration()
        assertEquals(WebLocalContent.APP_URL, web.initialUrl())
        assertFalse(web.needsLegacyCapture(WebLocalContent.LEGACY_URL))
    }

    @Test fun reservesOnlyLocalAppassetsOrigin() {
        assertTrue(WebLocalContent.isAppResource(Uri.parse(WebLocalContent.APP_URL)))
        assertFalse(WebLocalContent.isAppResource(Uri.parse("http://appassets.androidplatform.net/assets/www/index.html")))
        assertFalse(WebLocalContent.isAppResource(Uri.parse("https://wrong.example/assets/www/index.html")))
        assertFalse(WebLocalContent.isAppResource(Uri.parse("https://appassets.androidplatform.net/elsewhere/index.html")))
    }
}
