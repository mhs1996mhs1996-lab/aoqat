package com.aoqat.calendar

import android.content.Context
import android.net.Uri
import android.webkit.WebResourceResponse
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/** Release-pinned Quran pages. Never return or cache an unverified network response. */
class MushafAssetStore(private val context: Context, private val download: ((String) -> ByteArray)? = null) {
    private val hashes by lazy { JSONObject(context.assets.open("www/assets/mushaf-apk-sha256.json").bufferedReader().use { it.readText() }) }
    private val cache = File(context.filesDir, "mushaf-pages-v141")
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
        fun digest(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
    }
    private fun downloadPage(path: String): ByteArray {
        val connection = URL("https://aoqat.vercel.app/$path").openConnection() as HttpURLConnection
        connection.connectTimeout = 15000; connection.readTimeout = 30000
        connection.instanceFollowRedirects = false
        connection.setRequestProperty("Accept-Encoding", "identity")
        return try {
            if (connection.responseCode != 200) throw java.io.IOException("Page unavailable")
            connection.inputStream.use { it.readBytes() }
        } finally { connection.disconnect() }
    }
    @Synchronized fun response(uri: Uri): WebResourceResponse? {
        val path = assetPath(uri) ?: return null
        return try {
            val expected = hashes.optString(path)
            val bytes = try { context.assets.open("www/$path").use { it.readBytes() } } catch (_: java.io.IOException) {
                val file = File(cache, path.removePrefix("assets/"))
                val cached = if (file.isFile) file.readBytes() else null
                if (cached != null && digest(cached) == expected) cached else {
                    if (expected.isEmpty()) throw java.io.IOException("Missing release checksum")
                    val downloaded = download?.invoke(path) ?: downloadPage(path)
                    if (digest(downloaded) != expected) throw java.io.IOException("Page checksum mismatch")
                    file.parentFile?.mkdirs()
                    val temporary = File(file.parentFile, file.name + ".tmp")
                    temporary.writeBytes(downloaded)
                    if (!temporary.renameTo(file)) { temporary.delete(); throw java.io.IOException("Page cache unavailable") }
                    downloaded
                }
            }
            if (expected.isNotEmpty() && digest(bytes) != expected) throw java.io.IOException("Packaged checksum mismatch")
            val mime = if (path.endsWith(".webp")) "image/webp" else if (path.endsWith(".gz")) "application/octet-stream" else "application/json"
            WebResourceResponse(mime, null, 200, "OK", mapOf("Access-Control-Allow-Origin" to "*"), ByteArrayInputStream(bytes))
        } catch (_: Exception) {
            WebResourceResponse("text/plain", "UTF-8", 503, "Unavailable", mapOf("Access-Control-Allow-Origin" to "*"), ByteArrayInputStream(ByteArray(0)))
        }
    }
}
