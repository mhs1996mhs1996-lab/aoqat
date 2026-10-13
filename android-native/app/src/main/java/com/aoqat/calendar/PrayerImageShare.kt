package com.aoqat.calendar

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.util.Base64
import androidx.core.content.FileProvider
import java.io.File

object PrayerImageShare {
    fun decode(dataUrl: String): Pair<String, ByteArray> {
        require(dataUrl.length < 28 * 1024 * 1024)
        val comma = dataUrl.indexOf(','); require(comma > 0)
        val header = dataUrl.substring(0, comma)
        val mime = when (header) {
            "data:image/jpeg;base64" -> "image/jpeg"
            "data:image/png;base64" -> "image/png"
            "data:image/webp;base64" -> "image/webp"
            else -> throw IllegalArgumentException("Unsupported image")
        }
        val bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT)
        require(bytes.isNotEmpty() && bytes.size <= 20 * 1024 * 1024)
        return mime to bytes
    }
    fun intent(c: Context, dataUrl: String): Intent {
        val (mime, bytes) = decode(dataUrl)
        val folder = File(c.cacheDir, "shared-prayer-images").apply { mkdirs() }
        folder.listFiles()?.filter { System.currentTimeMillis() - it.lastModified() > 7 * 86400000L }?.forEach { it.delete() }
        val extension = when (mime) { "image/png" -> "png"; "image/webp" -> "webp"; else -> "jpg" }
        val file = File(folder, "prayer-preview.$extension").apply { writeBytes(bytes) }
        val uri = FileProvider.getUriForFile(c, c.packageName + ".prayer-images", file)
        return Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, uri)
            .putExtra(Intent.EXTRA_TITLE, "مواقيت الصلاة")
            .apply { clipData = ClipData.newUri(c.contentResolver, "مواقيت الصلاة", uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }
    }
}
