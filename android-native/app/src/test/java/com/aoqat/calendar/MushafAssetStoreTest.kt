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
    @Test fun checksumsDistinguishCorruptedPages() {
        assertNotEquals(MushafAssetStore.digest(byteArrayOf(1,2,3)), MushafAssetStore.digest(byteArrayOf(1,2,4)))
    }
}
