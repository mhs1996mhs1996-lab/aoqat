package com.aoqat.calendar

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.security.KeyPairGenerator
import java.security.Signature
import java.util.Base64

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28, 34])
class SignedWebUpdateManifestTest {
    private fun manifest(): JSONObject {
        val files = JSONObject()
            .put("index.html", WebUpdates.digest("<!doctype html>".toByteArray()))
            .put("js/app.js", WebUpdates.digest("window.ok=1".toByteArray()))
        val canonical = listOf("index.html", "js/app.js")
            .joinToString("\n") { "$it:${files.getString(it)}" }
        return JSONObject()
            .put("nativeBuild", 146)
            .put("sequence", 1L)
            .put("expiresAt", 4102444800000L)
            .put("revision", WebUpdates.digest(canonical.toByteArray(Charsets.UTF_8)))
            .put("files", files)
    }

    private fun sign(value: JSONObject, privateKey: java.security.PrivateKey) {
        val signer = Signature.getInstance("SHA256withECDSA")
        signer.initSign(privateKey)
        signer.update(SignedWebUpdateManifest.payload(value))
        value.put("signature", Base64.getEncoder().encodeToString(signer.sign()))
    }

    @Test fun validSignaturePassesAndEditsFailClosed() {
        val pair = KeyPairGenerator.getInstance("EC").apply { initialize(256) }.generateKeyPair()
        val pub = Base64.getEncoder().encodeToString(pair.public.encoded)
        val m = manifest()
        sign(m, pair.private)
        assertTrue(SignedWebUpdateManifest.verify(m, pub, 1800000000000L, 146, 0L))
        assertFalse("replayed update", SignedWebUpdateManifest.verify(m, pub, 1800000000000L, 146, 1L))
        assertFalse("other build", SignedWebUpdateManifest.verify(m, pub, 1800000000000L, 147, 0L))
        assertFalse("expired", SignedWebUpdateManifest.verify(m, pub, 4102444800000L, 146, 0L))
        assertFalse("malformed public key", SignedWebUpdateManifest.verify(m, "not-base64", 1800000000000L, 146, 0L))

        val differentKey = KeyPairGenerator.getInstance("EC").apply { initialize(256) }.generateKeyPair()
        assertFalse("unexpected publisher", SignedWebUpdateManifest.verify(m,
            Base64.getEncoder().encodeToString(differentKey.public.encoded), 1800000000000L, 146, 0L))

        m.put("nativeBuild", 147)
        assertFalse("build switched", SignedWebUpdateManifest.verify(m, pub, 1800000000000L, 146, 0L))
        m.put("nativeBuild", 146)

        m.put("sequence", 2)
        assertFalse("sequence changed", SignedWebUpdateManifest.verify(m, pub, 1800000000000L, 146, 0L))
        m.put("sequence", 1L)

        m.getJSONObject("files").put("js/app.js", WebUpdates.digest("window.ok=2".toByteArray()))
        assertFalse("content altered", SignedWebUpdateManifest.verify(m, pub, 1800000000000L, 146, 0L))
    }

    @Test fun rejectUnsanctionedPathsAndForgedRevision() {
        val m = manifest()
        m.getJSONObject("files").put("data/prayer-times-offline.json", "0".repeat(64))
        assertThrows(IllegalArgumentException::class.java) { SignedWebUpdateManifest.payload(m) }
        m.getJSONObject("files").remove("data/prayer-times-offline.json")
        m.put("revision", "0".repeat(64))
        assertThrows(IllegalArgumentException::class.java) { SignedWebUpdateManifest.payload(m) }
    }
}
