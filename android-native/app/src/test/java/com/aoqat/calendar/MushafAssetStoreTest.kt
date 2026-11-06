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
    @Test fun selectedQcfFontsExistLocallyWithoutAnySvgPageArchive() {
        val context=RuntimeEnvironment.getApplication()
        val assets=context.assets
        val fonts=assets.list("www/assets/qcf-v2-page-fonts")!!.filter { it.endsWith(".woff2") }
        assertEquals(604,fonts.size)
        for(page in listOf(1,2,102,245,499,604)) {
            val bytes=assets.open("www/assets/qcf-v2-page-fonts/p$page.woff2").use { it.readNBytes(4) }
            assertArrayEquals("wOF2".toByteArray(),bytes)
        }
        assertTrue(assets.list("www/assets/mushaf-phone-hafs").isNullOrEmpty())
        assertTrue(assets.list("www/pages").isNullOrEmpty())
    }
    @Test fun qcfManifestAndVerseIndexOpenFullyOffline() {
        val context=RuntimeEnvironment.getApplication()
        val bytes=context.assets.open("www/experiments/qcf604-web-verse-layouts.json.gz.bin").use { it.readBytes() }
        val data=org.json.JSONObject(String(MushafAssetStore.decode(bytes),Charsets.UTF_8))
        assertEquals(604,data.getInt("pageCount"))
        assertEquals(604,data.getJSONObject("pages").length())
        val metadata=context.assets.open("www/assets/mushaf-phone-hafs.json.gz.bin").use { it.readBytes() }
        assertEquals(604,org.json.JSONObject(String(MushafAssetStore.decode(metadata),Charsets.UTF_8)).getJSONArray("pages").length())
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
