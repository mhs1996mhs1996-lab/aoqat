package com.aoqat.calendar

import android.content.Context
import android.net.Uri
import android.webkit.WebResourceResponse
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.util.zip.GZIPInputStream
import java.security.MessageDigest

/** All pages are packaged and decoded by Android; no network or WebView gzip support is required. */
class MushafAssetStore(private val context: Context) {
    private val hashes by lazy { JSONObject(context.assets.open("www/assets/mushaf-apk-sha256.json").bufferedReader().use { it.readText() }) }
    companion object {
        fun assetPath(uri: Uri): String? {
            if (uri.scheme != "https" || uri.host != "aoqat.vercel.app" || uri.port != -1 || uri.query != null || uri.fragment != null) return null
            val path = uri.encodedPath?.removePrefix("/") ?: return null
            if (path in listOf("assets/mushaf-phone-hafs-ready.json", "assets/mushaf-phone-hafs.json.gz", "assets/mushaf-hafs-pocket-ready.json", "assets/mushaf-hafs-pocket.json.gz")) return path
            val match = Regex("assets/(mushaf-phone-hafs|mushaf-hafs-pocket)/([0-9]{3})\\.(json\\.gz|webp)").matchEntire(path) ?: return null
            val number = match.groupValues[2].toInt()
            if (number !in 1..604 || (match.groupValues[1] == "mushaf-phone-hafs") != (match.groupValues[3] == "json.gz")) return null
            return path
        }
        fun decode(bytes: ByteArray): ByteArray = if (bytes.size >= 2 && bytes[0] == 31.toByte() && bytes[1] == 139.toByte())
            GZIPInputStream(ByteArrayInputStream(bytes)).use { it.readBytes() } else bytes
        fun digest(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
    }
    @Synchronized fun response(uri: Uri): WebResourceResponse? {
        val path = assetPath(uri) ?: return null
        return try {
            val expected = hashes.optString(path)
            val original = context.assets.open("www/$path").use { it.readBytes() }
            if (expected.isEmpty() || digest(original) != expected) throw java.io.IOException("Packaged checksum mismatch")
            val bytes = if (path.endsWith(".gz")) decode(original) else original
            val mime = if (path.endsWith(".webp")) "image/webp" else "application/json"
            WebResourceResponse(mime, if (mime == "application/json") "UTF-8" else null, 200, "OK", mapOf("Access-Control-Allow-Origin" to "*"), ByteArrayInputStream(bytes))
        } catch (e: Exception) {
            android.util.Log.e("MushafAssets", "Packaged Mushaf asset failed: $path", e)
            WebResourceResponse("text/plain", "UTF-8", 503, "Unavailable", mapOf("Access-Control-Allow-Origin" to "*"), ByteArrayInputStream(ByteArray(0)))
        }
    }
}
