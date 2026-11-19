package com.aoqat.calendar

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.security.KeyPairGenerator
import java.security.Signature
import java.util.Base64
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class OwnerPilotBundleTest {
    private val pair = KeyPairGenerator.getInstance("EC").apply { initialize(256) }.generateKeyPair()
    private val pub = Base64.getEncoder().encodeToString(pair.public.encoded)
    private val build = 150
    private fun zip(files: Map<String, ByteArray>, sequence: Long = 4, forged: Boolean = false,
                    extra: String? = null, target: Int = 150): ByteArray {
        val entries = JSONObject()
        files.forEach { (path, bytes) -> entries.put(path, WebUpdates.digest(bytes)) }
        val canon = files.keys.sorted().joinToString("\n") { it + ":" + entries.getString(it) }
        val manifest = JSONObject().put("nativeBuild", target).put("sequence", sequence)
            .put("expiresAt", System.currentTimeMillis() + 86400000L)
            .put("revision", WebUpdates.digest(canon.toByteArray())).put("files", entries)
        val signer = Signature.getInstance("SHA256withECDSA")
        signer.initSign(pair.private)
        signer.update(SignedWebUpdateManifest.payload(manifest))
        manifest.put("signature", Base64.getEncoder().encodeToString(signer.sign()))
        if (forged) manifest.put("sequence", sequence + 1)
        val out = ByteArrayOutputStream()
        ZipOutputStream(out).use { z ->
            fun put(name: String, bytes: ByteArray) {
                z.putNextEntry(ZipEntry("android-updates/build-150/" + name))
                z.write(bytes)
                z.closeEntry()
            }
            put("manifest.json", manifest.toString().toByteArray())
            files.forEach { (path, bytes) -> put("files/" + path, bytes) }
            if (extra != null) put(extra, byteArrayOf(1))
        }
        return out.toByteArray()
    }
    @Test fun acceptsSignedFullSnapshotOnlyForCorrectBuild() {
        val pack = zip(mapOf("index.html" to "<p>pilot</p>".toByteArray(),
                             "js/x.js" to "hello".toByteArray()))
        val verified = OwnerPilotBundle.inspect(ByteArrayInputStream(pack), build, pub, 3L)
        assertEquals(4L, verified.sequence)
        assertEquals(2, verified.files.size)
        assertEquals("<p>pilot</p>", verified.files.getValue("index.html").toString(Charsets.UTF_8))
    }
    @Test fun rejectsForgedSignerSequenceAndOtherBuild() {
        val files = mapOf("index.html" to byteArrayOf(65))
        for (pack in listOf(zip(files, forged = true), zip(files, sequence = 3L),
                            zip(files, target = 151))) {
            try {
                OwnerPilotBundle.inspect(ByteArrayInputStream(pack), build, pub, 3L)
                fail("Forbidden update passed")
            } catch (_: IllegalArgumentException) {}
        }
    }
    @Test fun rejectsUnknownAndUnauthorizedPaths() {
        val pack = zip(mapOf("index.html" to byteArrayOf(65)), extra = "files/data/private.json")
        try {
            OwnerPilotBundle.inspect(ByteArrayInputStream(pack), build, pub, 0L)
            fail("Forbidden ZIP entry passed")
        } catch (_: IllegalArgumentException) {}
    }
}
