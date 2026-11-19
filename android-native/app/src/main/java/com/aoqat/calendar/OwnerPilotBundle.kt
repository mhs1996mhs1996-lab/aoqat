package com.aoqat.calendar

import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.util.zip.ZipInputStream

/**
 * Public signed OTA ZIP from owner's phone. In-memory parser: no extraction,
 * no zip-slip, no private keys. Caller can stage only in the QA build flavor.
 */
internal object OwnerPilotBundle {
    data class Verified(
        val manifest: JSONObject,
        val files: Map<String, ByteArray>,
        val revision: String,
        val sequence: Long
    )

    fun inspect(
        stream: InputStream,
        expectedBuild: Int,
        publisherPublicKey: String,
        minSequence: Long,
        now: Long = System.currentTimeMillis()
    ): Verified {
        require(expectedBuild > 0 && minSequence >= 0L)
        val root = "android-updates/build-$expectedBuild/"
        val entries = mutableMapOf<String, ByteArray>()
        var total = 0L
        ZipInputStream(stream).use { archive ->
            while (true) {
                val entry = archive.nextEntry ?: break
                require(entry.name.startsWith(root)) { "ZIP belongs to another build" }
                if (entry.isDirectory) { archive.closeEntry(); continue }
                val name = entry.name.removePrefix(root)
                require(name == "manifest.json" ||
                    (name.startsWith("files/") && WebUpdates.allowed(name.removePrefix("files/")))) {
                    "Forbidden OTA member"
                }
                require(name !in entries && entries.size < 251) { "Duplicate / excessive files" }
                val maximum = if (name == "manifest.json") 1024 * 1024 else 6 * 1024 * 1024
                val output = ByteArrayOutputStream()
                val buffer = ByteArray(16 * 1024)
                var fileSize = 0
                while (true) {
                    val count = archive.read(buffer)
                    if (count < 0) break
                    fileSize += count
                    total += count.toLong()
                    require(fileSize <= maximum && total <= 25L * 1024 * 1024) { "Oversized archive" }
                    output.write(buffer, 0, count)
                }
                entries[name] = output.toByteArray()
                archive.closeEntry()
            }
        }
        val manifestBytes = entries.remove("manifest.json") ?: error("Missing signed manifest")
        val manifest = JSONObject(manifestBytes.toString(Charsets.UTF_8))
        // Distinguish safe diagnostic categories without weakening signature checks.
        require(manifest.optInt("nativeBuild", -1) == expectedBuild) {
            "Pilot build mismatch"
        }
        require(manifest.optLong("sequence", -1L) > minSequence) {
            "Pilot sequence not newer"
        }
        require(manifest.optLong("expiresAt", 0L) > now) {
            "Pilot manifest expired"
        }
        require(SignedWebUpdateManifest.verify(
            manifest, publisherPublicKey, now, expectedBuild, minSequence
        )) { "Publisher signature invalid" }
        val listed = manifest.getJSONObject("files")
        val paths = listed.keys().asSequence().toList()
        require(paths.size in 1..250 && "index.html" in paths &&
            paths.all { WebUpdates.allowed(it) }) { "Unsupported OTA paths" }
        require(entries.keys == paths.map { "files/$it" }.toSet()) {
            "OTA package contains missing or unexpected files"
        }
        var contentSize = 0L
        for (path in paths) {
            val bytes = entries.getValue("files/$path")
            contentSize += bytes.size
            require(bytes.size <= 6 * 1024 * 1024 && contentSize <= 24L * 1024 * 1024 &&
                WebUpdates.digest(bytes) == listed.getString(path)) { "Checksum mismatch" }
        }
        return Verified(manifest, entries.mapKeys { it.key.removePrefix("files/") },
            manifest.getString("revision"), manifest.getLong("sequence"))
    }
}
