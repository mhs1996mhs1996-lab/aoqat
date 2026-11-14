package com.aoqat.calendar

import org.json.JSONObject
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

/**
 * Future signed-update verifier. This class is deliberately NOT connected to
 * production WebUpdates until the owner securely generates and pins a public
 * key, stores its PRIVATE counterpart outside the repository, and deploys a
 * signed manifest. Never add a fail-open legacy fallback in a security release.
 *
 * SHA256withECDSA (P-256) is supported on our minSdk 26 target.
 */
internal object SignedWebUpdateManifest {
    private const val DOMAIN = "AOQAT-WEB-UPDATE-SIGNATURE-V1"
    private val HASH_PATTERN = Regex("[a-f0-9]{64}")

    fun payload(manifest: JSONObject): ByteArray {
        val build = manifest.getInt("nativeBuild")
        val sequence = manifest.getLong("sequence")
        val expiresAt = manifest.getLong("expiresAt")
        require(build > 0 && sequence > 0 && expiresAt > 0)
        val files = manifest.getJSONObject("files")
        val paths = files.keys().asSequence().toList().sorted()
        require(paths.isNotEmpty() && paths.size <= 250 && "index.html" in paths)
        require(paths.all { WebUpdates.allowed(it) })

        val canonical = paths.joinToString("\n") { path ->
            val hash = files.getString(path)
            require(HASH_PATTERN.matches(hash))
            "$path:$hash"
        }
        val expectedRevision = WebUpdates.digest(canonical.toByteArray(Charsets.UTF_8))
        val revision = manifest.getString("revision")
        require(HASH_PATTERN.matches(revision) && expectedRevision == revision)
        return listOf(DOMAIN, build.toString(), sequence.toString(), expiresAt.toString(),
            revision, canonical).joinToString("\n").toByteArray(Charsets.UTF_8)
    }

    fun verify(manifest: JSONObject, encodedPublicKey: String, nowMillis: Long): Boolean {
        return try {
            // Never accept a manifest after expiry; a revoked/replayed revision
            // must additionally be rejected by the caller's monotonic sequence.
            if (nowMillis <= 0 || nowMillis >= manifest.getLong("expiresAt")) return false
            val encodedKey = Base64.getDecoder().decode(encodedPublicKey)
            val key = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(encodedKey))
            val signature = Signature.getInstance("SHA256withECDSA")
            signature.initVerify(key)
            signature.update(payload(manifest))
            signature.verify(Base64.getDecoder().decode(manifest.getString("signature")))
        } catch (_: Exception) {
            false
        }
    }
}
