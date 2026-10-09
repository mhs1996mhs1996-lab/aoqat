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
        for (name in listOf("mushaf-phone-hafs/001.json.gz", "mushaf-phone-hafs/604.json.gz", "mushaf-hafs-pocket/001.webp", "mushaf-hafs-pocket/604.webp")) {
            val response = store.response(Uri.parse("https://aoqat.vercel.app/assets/$name"))!!
            assertEquals(200, response.statusCode)
            assertTrue(response.data.use { it.readBytes().size } > 100)
        }
        assertNull(store.response(Uri.parse("https://aoqat.vercel.app/js/app.js")))
    }
    @Test fun downloadedPageSurvivesRestartAndRejectsCorruption() {
        val context = RuntimeEnvironment.getApplication()
        val uri = Uri.parse("https://aoqat.vercel.app/assets/mushaf-phone-hafs/003.json.gz")
        val source = generateSequence(java.io.File(System.getProperty("user.dir"))) { it.parentFile }
            .map { java.io.File(it, "assets/mushaf-phone-hafs/003.json.gz") }.first { it.isFile }.readBytes()
        val cached = java.io.File(context.filesDir, "mushaf-pages-v141/mushaf-phone-hafs/003.json.gz")
        cached.delete()
        var calls = 0
        val first = MushafAssetStore(context) { calls++; source }
        assertEquals(200, first.response(uri)!!.statusCode)
        assertEquals(1, calls)
        val offline = MushafAssetStore(context) { throw java.io.IOException("Offline") }
        assertArrayEquals(source, offline.response(uri)!!.data.use { it.readBytes() })
        cached.writeBytes(byteArrayOf(1,2,3))
        assertEquals(503, offline.response(uri)!!.statusCode)
        cached.delete()
        assertEquals(503, MushafAssetStore(context) { byteArrayOf(1,2,3) }.response(uri)!!.statusCode)
        assertFalse(cached.exists())
    }
    @Test fun checksumsDistinguishCorruptedPages() {
        assertNotEquals(MushafAssetStore.digest(byteArrayOf(1,2,3)), MushafAssetStore.digest(byteArrayOf(1,2,4)))
    }
}
