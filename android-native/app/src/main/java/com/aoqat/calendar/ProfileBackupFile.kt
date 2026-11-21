package com.aoqat.calendar

import android.content.ClipData
import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File

/**
 * An actual portable .json backup document, never an image.
 * Only the owner-pilot bridge calls this; app data/credentials stay private
 * until the user explicitly selects a share recipient or document location.
 */
object ProfileBackupFile {
    const val MIME = "application/json"
    private const val MAX_LENGTH = 2_000_000

    fun checkedBytes(json: String): ByteArray {
        require(json.isNotBlank() && json.length <= MAX_LENGTH) { "Backup exceeds allowed length" }
        val pack = JSONObject(json)
        require(pack.optString("format") == "aoqat-local-backup") { "Not an AOQAT backup" }
        require(pack.optInt("version") in 1..2) { "Unsupported backup version" }
        val data = pack.optJSONObject("data") ?: error("Missing backup content")
        require(data.length() in 1..120) { "Invalid backup entries" }
        val bytes = json.toByteArray(Charsets.UTF_8)
        require(bytes.size <= MAX_LENGTH) { "Backup exceeds allowed byte limit" }
        return bytes
    }

    fun safeName(requested: String): String {
        val base = requested.removeSuffix(".json").replace(Regex("[^A-Za-z0-9_-]"), "_").take(85)
        return (base.ifEmpty { "AOQAT-backup" }) + ".json"
    }

    fun shareIntent(context: Context, json: String, filename: String): Intent {
        val bytes = checkedBytes(json)
        val directory = File(context.cacheDir, "shared-backups").apply { mkdirs() }
        directory.listFiles()?.filter {
            System.currentTimeMillis() - it.lastModified() > 7 * 86400000L
        }?.forEach { it.delete() }
        val file = File(directory, safeName(filename)).apply { writeBytes(bytes) }
        val uri = FileProvider.getUriForFile(
            context, context.packageName + ".prayer-images", file
        )
        return Intent(Intent.ACTION_SEND).setType(MIME)
            .putExtra(Intent.EXTRA_STREAM, uri)
            .putExtra(Intent.EXTRA_TITLE, "نسخة احتياطية لأوقات الصلاة")
            .apply {
                clipData = ClipData.newUri(context.contentResolver, "نسخة أوقات الصلاة", uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
    }
}
