package com.aoqat.calendar

import android.content.ClipData
import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.nio.charset.StandardCharsets

/** Owner-selected JSON backup save/share. No automatic upload or app-data reset. */
object BackupDocuments {
    const val MAX_BYTES = 2 * 1024 * 1024
    private val REQUEST_ID = Regex("[a-zA-Z0-9_-]{1,85}")
    private val SAFE_FILENAME = Regex("[a-zA-Z0-9._-]{1,95}\\.json")

    fun safeRequestId(requestId:String):Boolean = REQUEST_ID.matches(requestId)

    fun safeFileName(selected:String):String =
        if(SAFE_FILENAME.matches(selected)&&!selected.contains(".."))selected
        else "AOQAT-backup.json"

    fun encode(json:String):ByteArray {
        val bytes=json.toByteArray(StandardCharsets.UTF_8)
        require(bytes.isNotEmpty()&&bytes.size<=MAX_BYTES){ "Backup exceeds allowed limit" }
        val value=JSONObject(json)
        require(value.optString("format")=="aoqat-local-backup")
        require(value.optInt("version") in 1..2)
        val data=value.optJSONObject("data") ?: throw IllegalArgumentException("Missing user settings")
        require(data.length() in 1..120)
        return bytes
    }

    fun createFileIntent(filename:String):Intent =
        Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            type="application/json"
            addCategory(Intent.CATEGORY_OPENABLE)
            putExtra(Intent.EXTRA_TITLE,safeFileName(filename))
        }

    fun shareIntent(c:Context,json:String,filename:String):Intent {
        val bytes=encode(json)
        val cache=File(c.cacheDir,"shared-prayer-images").apply { mkdirs() }
        cache.listFiles()?.filter {
            it.name.startsWith("aoqat-backup-") &&
            System.currentTimeMillis()-it.lastModified()>7L*86400000L
        }?.forEach { it.delete() }
        val file=File(cache,"aoqat-backup-"+System.nanoTime()+".json")
        file.outputStream().use { it.write(bytes) }
        val uri=FileProvider.getUriForFile(c,c.packageName+".prayer-images",file)
        return Intent(Intent.ACTION_SEND).apply {
            type="application/json"
            putExtra(Intent.EXTRA_STREAM,uri)
            putExtra(Intent.EXTRA_TITLE,safeFileName(filename))
            clipData=ClipData.newUri(c.contentResolver,"AOQAT backup",uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    }
}
