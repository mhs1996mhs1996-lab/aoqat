package com.aoqat.calendar

import android.content.Context
import android.net.Uri
import android.util.Base64
import android.webkit.WebResourceResponse
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import org.json.JSONTokener
import java.io.ByteArrayInputStream

/**
 * The previous APK opened file:///android_asset/www/index.html. Android WebView
 * explicitly DOES NOT call shouldInterceptRequest for this special file path.
 *
 * Load new content through the reserved appassets HTTPS origin, with packaged
 * assets as the offline fallback. Preserve the user's old file-origin settings
 * before switching origins. Do not change any prayer or notification code.
 */
class WebLocalContent(
    private val context: Context,
    private val updates: WebUpdates,
    private val mushaf: MushafAssetStore
) {
    private val prefs = context.getSharedPreferences("web_origin_transfer_v1", Context.MODE_PRIVATE)
    private val loader = WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
        .build()

    companion object {
        const val LEGACY_URL = "file:///android_asset/www/index.html"
        const val APP_URL = "https://appassets.androidplatform.net/assets/www/index.html"
        const val MIGRATED_KEY = "aoqatLegacyWebStorageImportedV1"
        private const val MAX_LOCAL_STORAGE = 8 * 1024 * 1024

        fun isAppResource(uri: Uri) =
            uri.scheme == "https" && uri.host == "appassets.androidplatform.net" &&
            uri.port == -1 && uri.encodedPath.orEmpty().startsWith("/assets/www/")

        fun migrateScript(snapshot: String): String {
            val encoded = Base64.encodeToString(snapshot.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
            return """<script>(function(){try{
              if(localStorage.getItem('$MIGRATED_KEY')==='1')return;
              var bytes=Uint8Array.from(atob('$encoded'),function(c){return c.charCodeAt(0)});
              var source=JSON.parse(new TextDecoder('utf-8').decode(bytes));
              Object.keys(source).forEach(function(k){
                if(typeof source[k]==='string' && localStorage.getItem(k)===null)
                  localStorage.setItem(k,source[k]);
              });
              localStorage.setItem('$MIGRATED_KEY','1');
            }catch(e){console.error('Web settings restore',e);}})();</script>"""
        }

        fun withMigrations(html: String, snapshot: String): String {
            require(html.contains("<head>")) { "Local page has no head" }
            return html.replaceFirst("<head>", "<head>" + migrateScript(snapshot))
        }
    }

    fun initialUrl(): String =
        if (prefs.getBoolean("complete", false)) APP_URL else LEGACY_URL

    fun needsLegacyCapture(url: String): Boolean =
        url == LEGACY_URL && !prefs.getBoolean("complete", false)

    /** Input is the JSON-encoded String returned by evaluateJavascript. */
    fun captureLegacy(jsValue: String?): Boolean = try {
        val raw = JSONTokener(jsValue ?: "null").nextValue() as? String ?: return false
        if (raw.length > MAX_LOCAL_STORAGE) return false
        JSONObject(raw) // Validate the snapshot before leaving the old origin.
        prefs.edit().putString("snapshot", raw).putBoolean("captured", true).commit()
    } catch (e: Exception) {
        android.util.Log.w("WebUpdates", "Unable to capture legacy settings; keep old page", e)
        false
    }

    fun confirmMigration() {
        prefs.edit().putBoolean("complete", true).remove("snapshot").apply()
    }

    /** Used on shouldInterceptRequest's worker thread. */
    fun response(uri: Uri): WebResourceResponse? {
        if (!isAppResource(uri)) return mushaf.response(uri)
        val response = updates.response(uri) ?: loader.shouldInterceptRequest(uri)
        if (uri.toString() != APP_URL) return response

        val snapshot = if (prefs.getBoolean("captured", false) && !prefs.getBoolean("complete", false))
            prefs.getString("snapshot", null) else null
        if (snapshot == null || response == null) return response
        return try {
            val html = response.data.bufferedReader(Charsets.UTF_8).use { it.readText() }
            WebResourceResponse("text/html", "UTF-8", ByteArrayInputStream(withMigrations(html, snapshot).toByteArray(Charsets.UTF_8)))
        } catch (e: Exception) {
            // Always retain the original offline page in case restore injection fails.
            android.util.Log.w("WebUpdates", "Legacy restore injection failed", e)
            WebResourceResponse("text/html", "UTF-8", context.assets.open("www/index.html"))
        }
    }
}
