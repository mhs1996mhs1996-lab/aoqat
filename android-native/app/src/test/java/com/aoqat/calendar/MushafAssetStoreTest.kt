package com.aoqat.calendar

import android.net.Uri
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class MushafAssetStoreTest {
    @Test fun onlyReleaseAssetUrlsAreAccepted() {
        assertEquals("assets/mushaf-phone-hafs/245.json.gz", MushafAssetStore.assetPath(Uri.parse("https://aoqat.vercel.app/assets/mushaf-phone-hafs/245.json.gz")))
        for (url in listOf("http://aoqat.vercel.app/assets/mushaf-phone-hafs/001.json.gz", "https://other.example/assets/mushaf-phone-hafs/001.json.gz", "https://aoqat.vercel.app/assets/mushaf-phone-hafs/605.json.gz", "https://aoqat.vercel.app/assets/mushaf-phone-hafs/001.webp", "https://aoqat.vercel.app/assets/mushaf-phone-hafs/%2e%2e/001.json.gz", "https://aoqat.vercel.app/assets/mushaf-phone-hafs/001.json.gz?extra=1")) assertNull(url, MushafAssetStore.assetPath(Uri.parse(url)))
    }
    @Test fun packagedSeedsWorkWithoutNetworkAndMatchReleaseChecksums() {
        val store = MushafAssetStore(RuntimeEnvironment.getApplication())
        for (name in listOf("mushaf-phone-hafs/001.json.gz", "mushaf-phone-hafs/604.json.gz")) {
            val response = store.response(Uri.parse("https://aoqat.vercel.app/assets/$name"))!!
            assertEquals(org.robolectric.shadows.ShadowLog.getLogs().joinToString { it.msg+" "+it.throwable },200, response.statusCode)
            assertTrue(response.data.use { it.readBytes().size } > 100)
        }
        assertNull(store.response(Uri.parse("https://aoqat.vercel.app/js/app.js")))
    }
    @Test fun completeMushafAndMetadataOpenOfflineAsDecodedJson() {
        val context=RuntimeEnvironment.getApplication()
        assertEquals(604,context.assets.list("www/assets/mushaf-phone-hafs")!!.size)
        assertEquals(0,context.assets.list("www/assets/mushaf-hafs-pocket")!!.size)
        assertFalse(context.assets.list("www/assets")!!.any { it.startsWith("mushaf-hafs-") })
        val store=MushafAssetStore(context)
        for (page in listOf(3,245,499,604)) {
            val response=store.response(Uri.parse("https://aoqat.vercel.app/assets/mushaf-phone-hafs/${page.toString().padStart(3,'0')}.json.gz"))!!
            assertEquals(org.robolectric.shadows.ShadowLog.getLogs().joinToString { it.msg+" "+it.throwable },200,response.statusCode)
            assertEquals("application/json",response.mimeType)
            val json=org.json.JSONObject(response.data.bufferedReader().use { it.readText() })
            assertEquals(page,json.getInt("page"))
            assertTrue(json.getJSONArray("lines").length()>0)
        }
        val metadata=store.response(Uri.parse("https://aoqat.vercel.app/assets/mushaf-phone-hafs.json.gz"))!!
        assertEquals(604,org.json.JSONObject(metadata.data.bufferedReader().use {it.readText()}).getJSONArray("pages").length())
    }
    @Test fun nativeGzipDecoderPreservesBytesAndRejectsCorruption() {
        val bytes="{\"page\":1}".toByteArray()
        val out=java.io.ByteArrayOutputStream()
        java.util.zip.GZIPOutputStream(out).use {it.write(bytes)}
        assertArrayEquals(bytes,MushafAssetStore.decode(out.toByteArray()))
        assertArrayEquals(bytes,MushafAssetStore.decode(bytes))
        try { MushafAssetStore.decode(byteArrayOf(31,139.toByte(),0));fail("Invalid gzip accepted") } catch (_:java.io.IOException) {}
    }
    @Test fun checksumsDistinguishCorruptedPages() {
        assertNotEquals(MushafAssetStore.digest(byteArrayOf(1,2,3)), MushafAssetStore.digest(byteArrayOf(1,2,4)))
    }
}
