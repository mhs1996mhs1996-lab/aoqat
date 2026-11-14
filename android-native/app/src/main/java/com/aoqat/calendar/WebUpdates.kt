package com.aoqat.calendar

import android.content.Context
import android.net.Uri
import android.webkit.WebResourceResponse
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Signed, offline-first web updater. Never accept a checksum-only manifest.
 * The key here is PUBLIC; its encrypted PRIVATE half must remain outside Git.
 * Quran files, prayer data, and native Android logic are never downloaded.
 *
 * A new revision runs only on the next launch. A missing startup-ready signal
 * causes an automatic return to the last known-good snapshot on the next launch.
 */
class WebUpdates(
    private val context: Context,
    private val encodedPublicKey: String = SIGNING_PUBLIC_KEY_B64,
    private val fetch: (String, Int) -> ByteArray = { path, limit ->
        download(path, limit, context.packageManager.getPackageInfo(context.packageName, 0).versionCode)
    }
) {
    private val root = File(context.filesDir, "web-updates-v2-signed")
    private val prefs = context.getSharedPreferences("web_updates_v2_signed", Context.MODE_PRIVATE)
    private val nativeBuild = context.packageManager.getPackageInfo(context.packageName, 0).versionCode
    private val checking = AtomicBoolean(false)

    // Never read v1 unsigned updates from earlier APKs, even if their files exist.
    private var active: File? = selectSnapshotOnLaunch()

    fun response(uri: Uri): WebResourceResponse? {
        val path = assetPath(uri) ?: return null
        val file = active?.let { File(it, path) }?.takeIf { it.isFile } ?: return null
        val mime = when (file.extension) {
            "js" -> "application/javascript"
            "css" -> "text/css"
            "html" -> "text/html"
            "json" -> "application/json"
            else -> "application/octet-stream"
        }
        return WebResourceResponse(mime, "UTF-8", file.inputStream())
    }

    fun isTrialActive(): Boolean {
        val trial = prefs.getString("trial", null) ?: return false
        return trial == prefs.getString("active", null) && active != null
    }

    /**
     * Called by AndroidBridge.startupReady() only when the actual appassets
     * page has signalled that all UI modules have initialized successfully.
     */
    fun confirmStartup(): Boolean {
        if (!isTrialActive()) return false
        return prefs.edit().remove("trial").remove("previousActive")
            .putBoolean("trialConfirmed", true).commit()
    }

    private fun selectSnapshotOnLaunch(): File? {
        root.mkdirs()
        if (prefs.getInt("build", -1) != nativeBuild) {
            // Leave old snapshots on disk for forensic recovery, but never use
            // any snapshot prepared for another signed APK build.
            prefs.edit().clear().putInt("build", nativeBuild).commit()
        }

        val previousTrial = prefs.getString("trial", null)
        if (previousTrial != null) {
            // This revision did not reach startupReady before process exit.
            // Quarantine it rather than risking a permanent boot loop.
            val old = prefs.getString("previousActive", null)
            prefs.edit()
                .putString("active", old)
                .putString("blocked", previousTrial)
                .remove("trial")
                .remove("previousActive")
                .remove("pending")
                .remove("pendingSequence")
                .commit()
        }

        val pending = prefs.getString("pending", null)
        val pendingSeq = prefs.getLong("pendingSequence", 0L)
        if (pending != null) {
            val pendingDir = validSnapshot(pending)
            val manifestSeq = pendingDir?.let {
                try { JSONObject(File(it, "verified-manifest.json").readText()).getLong("sequence") }
                catch (_: Exception) { -1L }
            } ?: -1L
            val existing = prefs.getString("active", null)
            if (pendingDir != null && pending != existing &&
                pending != prefs.getString("blocked", null) &&
                pendingSeq > 0L && pendingSeq == manifestSeq
            ) {
                prefs.edit()
                    .putString("previousActive", existing)
                    .putString("active", pending)
                    .putString("trial", pending)
                    .putLong("lastSequence", maxOf(prefs.getLong("lastSequence", 0L), pendingSeq))
                    .remove("pending")
                    .remove("pendingSequence")
                    .commit()
            } else {
                prefs.edit().remove("pending").remove("pendingSequence").commit()
            }
        }

        val revision = prefs.getString("active", null) ?: return null
        return validSnapshot(revision).also { valid ->
            if (valid == null) {
                prefs.edit().remove("active").remove("trial").remove("previousActive").commit()
            }
        }
    }

    private fun validSnapshot(revision: String): File? {
        if (!REVISION_PATTERN.matches(revision)) return null
        val folder = File(root, revision)
        return try {
            require(File(folder, "complete").isFile)
            require(File(folder, "complete").readText() == revision)
            val manifest = JSONObject(File(folder, "verified-manifest.json").readText())
            require(manifest.getString("revision") == revision)
            // Previously signed data is still usable offline after expiry.
            // This does NOT allow installation of an expired NEW manifest.
            val expiresAt = manifest.getLong("expiresAt")
            require(expiresAt > 1L)
            require(SignedWebUpdateManifest.verify(manifest, encodedPublicKey,
                expiresAt - 1L, nativeBuild, 0L))
            val files = manifest.getJSONObject("files")
            val paths = files.keys().asSequence().toList()
            require(paths.size in 1..250 && paths.all { allowed(it) })
            var total = 0L
            for (path in paths) {
                val data = File(folder, path)
                require(data.isFile)
                val bytes = data.readBytes()
                require(bytes.size <= 6 * 1024 * 1024)
                total += bytes.size
                require(total <= 24L * 1024 * 1024)
                require(digest(bytes) == files.getString(path))
            }
            folder
        } catch (_: Exception) {
            null
        }
    }

    fun check() {
        val now = System.currentTimeMillis()
        val last = maxOf(prefs.getLong("checked", 0), prefs.getLong("attempt", 0))
        if (!due(now, last) || !checking.compareAndSet(false, true)) return
        prefs.edit().putLong("attempt", now).apply()
        Thread {
            try { checkNow() } finally { checking.set(false) }
        }.start()
    }

    internal fun checkNow() {
        try {
            // Signature, expiry, native build and anti-replay are checked
            // BEFORE any untrusted web file is downloaded or staged.
            val manifest = JSONObject(fetch("manifest.json", 1024 * 1024)
                .toString(Charsets.UTF_8))
            val revision = manifest.getString("revision")
            val sequence = manifest.getLong("sequence")
            val lastSeq = prefs.getLong("lastSequence", 0L)
            val current = prefs.getString("active", null)
            val pending = prefs.getString("pending", null)
            val currentSeq = if (current != null) {
                validSnapshot(current)?.let {
                    JSONObject(File(it, "verified-manifest.json").readText()).getLong("sequence")
                } ?: -1L
            } else -1L
            val sameActive = revision == current && sequence == currentSeq
            val samePending = revision == pending &&
                sequence == prefs.getLong("pendingSequence", -1L)
            if (sequence <= lastSeq && !sameActive) return
            val threshold = if (sameActive || samePending) sequence - 1L else lastSeq
            require(SignedWebUpdateManifest.verify(
                manifest, encodedPublicKey, System.currentTimeMillis(),
                nativeBuild, threshold
            ))
            if (sameActive || (samePending && validSnapshot(revision) != null)) {
                prefs.edit().putLong("checked", System.currentTimeMillis()).apply()
                return
            }
            if (revision == prefs.getString("blocked", null)) return
            val files = manifest.getJSONObject("files")
            val paths = files.keys().asSequence().toList().sorted()
            require(paths.size in 1..250 && "index.html" in paths && paths.all { allowed(it) })
            val stage = File(root, "staging")
            stage.deleteRecursively()
            require(stage.mkdirs())
            try {
                var total = 0L
                for (path in paths) {
                    val hash = files.getString(path)
                    require(HASH_PATTERN.matches(hash))
                    val cached = active?.let { File(it, path) }?.takeIf { it.isFile }?.readBytes()
                    val packaged = try {
                        context.assets.open("www/$path").use { it.readBytes() }
                    } catch (_: Exception) { null }
                    val bytes = when {
                        cached != null && digest(cached) == hash -> cached
                        packaged != null && digest(packaged) == hash -> packaged
                        else -> fetch("files/$path", 6 * 1024 * 1024)
                    }
                    total += bytes.size
                    require(total <= 24L * 1024 * 1024 && digest(bytes) == hash)
                    File(stage, path).apply {
                        parentFile?.mkdirs()
                        writeBytes(bytes)
                    }
                }
                // Store the exact publisher signature with the fully hashed
                // snapshot so offline activation can re-authenticate it.
                File(stage, "verified-manifest.json").writeText(manifest.toString())
                File(stage, "complete").writeText(revision)
                val destination = File(root, revision)
                if (!destination.exists()) require(stage.renameTo(destination))
                else stage.deleteRecursively()
                require(validSnapshot(revision) != null)
                // Activation is deferred until next launch, then requires JS
                // startupReady before it becomes last-known-good.
                prefs.edit().putString("pending", revision)
                    .putLong("pendingSequence", sequence)
                    .putLong("checked", System.currentTimeMillis()).commit()
            } finally { stage.deleteRecursively() }
        } catch (e: Exception) {
            android.util.Log.w("WebUpdates", "Untrusted or failed update rejected; keep offline installed version", e)
        }
    }

    companion object {
        const val MIN_CHECK_INTERVAL_MS = 5 * 60 * 1000L
        const val SIGNING_PUBLIC_KEY_B64 =
            "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAErzyNMdEJDHP87D66Oo923p5vQiF4nN+2ddOqSB2Z2Ur9s/dq+7YUu7sNfHm07eluO4KHwU23nuS2CvSddUuE/w=="
        private val REVISION_PATTERN = Regex("[a-f0-9]{64}")
        private val HASH_PATTERN = Regex("[a-f0-9]{64}")

        fun due(now: Long, last: Long): Boolean =
            last <= 0 || now < last || now - last >= MIN_CHECK_INTERVAL_MS

        fun assetPath(uri: Uri): String? {
            val path = when {
                uri.scheme == "file" && uri.host.isNullOrEmpty() &&
                    uri.path.orEmpty().startsWith("/android_asset/www/") ->
                    uri.path!!.removePrefix("/android_asset/www/")
                uri.scheme == "https" && uri.host == "appassets.androidplatform.net" &&
                    uri.port == -1 && uri.encodedPath.orEmpty().startsWith("/assets/www/") ->
                    uri.path!!.removePrefix("/assets/www/")
                else -> return null
            }
            return path.takeIf { allowed(it) }
        }

        // Crucial: no Quran/prayer data, images or native source in OTA.
        fun allowed(path: String) =
            !path.contains("..") && !path.contains('%') && !path.contains('\\') &&
            (path == "index.html" ||
                path.matches(Regex("(js|css)/[a-zA-Z0-9_./-]+\\.(js|css)")))

        fun digest(bytes: ByteArray) =
            MessageDigest.getInstance("SHA-256").digest(bytes)
                .joinToString("") { "%02x".format(it) }

        fun baseUrl(build: Int): String =
            if (build >= 145) "https://aoqat.vercel.app/android-updates/build-$build/"
            else "https://aoqat.vercel.app/android-updates/"

        private fun download(path: String, limit: Int, build: Int): ByteArray {
            val connection = URL(baseUrl(build) + path).openConnection() as HttpURLConnection
            connection.connectTimeout = 15000
            connection.readTimeout = 20000
            connection.instanceFollowRedirects = false
            try {
                require(connection.responseCode == 200)
                return connection.inputStream.use {
                    val out = java.io.ByteArrayOutputStream()
                    val buffer = ByteArray(16384)
                    var total = 0
                    while (true) {
                        val count = it.read(buffer)
                        if (count < 0) break
                        total += count
                        require(total <= limit)
                        out.write(buffer, 0, count)
                    }
                    out.toByteArray()
                }
            } finally { connection.disconnect() }
        }
    }
}
