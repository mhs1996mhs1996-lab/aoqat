package com.aoqat.calendar

import android.content.Context
import android.net.Uri
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.io.File
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import java.util.Base64

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class WebUpdatesTest {
    private val c: Context get() = RuntimeEnvironment.getApplication()
    private lateinit var keys: KeyPair
    private lateinit var pub: String
    private val uri = Uri.parse("https://appassets.androidplatform.net/assets/www/index.html")
    @Before fun reset() {
        c.getSharedPreferences("web_updates_v2_signed",0).edit().clear().commit()
        File(c.filesDir,"web-updates-v2-signed").deleteRecursively()
        keys = KeyPairGenerator.getInstance("EC").apply { initialize(256) }.generateKeyPair()
        pub = Base64.getEncoder().encodeToString(keys.public.encoded)
    }
    private fun manifest(files:Map<String,ByteArray>,seq:Long=1,wrongBuild:Boolean=false,forged:Boolean=false,
        expiresAt:Long=System.currentTimeMillis()+86400000L):ByteArray {
        val fileMap=JSONObject()
        files.forEach { (p,bytes) -> fileMap.put(p,WebUpdates.digest(bytes)) }
        val canonical=files.keys.sorted().joinToString("\n") { p -> p+":"+fileMap.getString(p) }
        val build=c.packageManager.getPackageInfo(c.packageName,0).versionCode
        val m=JSONObject().put("nativeBuild",if(wrongBuild) -1 else build)
            .put("sequence",seq).put("expiresAt",expiresAt)
            .put("revision",WebUpdates.digest(canonical.toByteArray())).put("files",fileMap)
        if(!wrongBuild){
            val sig=Signature.getInstance("SHA256withECDSA")
            sig.initSign(keys.private)
            sig.update(SignedWebUpdateManifest.payload(m))
            m.put("signature",Base64.getEncoder().encodeToString(sig.sign()))
        }else m.put("signature","invalid")
        if(forged)m.put("sequence",seq+10)
        return m.toString().toByteArray()
    }
    private fun updater(files:Map<String,ByteArray>,seq:Long=1,calls:MutableList<String> = mutableListOf(),
        wrongBuild:Boolean=false,forged:Boolean=false,corrupt:Boolean=false,
        expiresAt:Long=System.currentTimeMillis()+86400000L):WebUpdates {
        val signed=manifest(files,seq,wrongBuild,forged,expiresAt)
        return WebUpdates(c,pub) { path,_ ->
            calls.add(path)
            if(path=="manifest.json") signed
            else if(corrupt) "bad response".toByteArray()
            else files.getValue(path.removePrefix("files/"))
        }
    }
    private fun page(updates:WebUpdates):String? =
        updates.response(uri)?.data?.bufferedReader()?.use { it.readText() }

    @Test fun signedUpdateIsDeferredUntilNextLaunchAndAcknowledged() {
        val files=mapOf("index.html" to "<p>new</p>".toByteArray())
        updater(files).checkNow()
        val trial=WebUpdates(c,pub)
        assertEquals("<p>new</p>",page(trial))
        assertTrue(trial.isTrialActive())
        assertTrue(trial.confirmStartup())
        assertFalse(trial.isTrialActive())
        assertEquals("<p>new</p>",page(WebUpdates(c,pub)))
    }

    @Test fun invalidSignatureAndCorruptDownloadsNeverActivate() {
        val files=mapOf("index.html" to "valid".toByteArray())
        val calls=mutableListOf<String>()
        updater(files,calls=calls,forged=true).checkNow()
        assertEquals(listOf("manifest.json"),calls)
        assertNull(page(WebUpdates(c,pub)))
        updater(files,corrupt=true).checkNow()
        assertNull(page(WebUpdates(c,pub)))
    }

    @Test fun wrongNativeBuildIsRefusedBeforeDownload() {
        val calls=mutableListOf<String>()
        updater(mapOf("index.html" to "new".toByteArray()),
            calls=calls,wrongBuild=true).checkNow()
        assertEquals(listOf("manifest.json"),calls)
        assertNull(page(WebUpdates(c,pub)))
    }

    @Test fun crashWithoutStartupReadyRollsBackAndQuarantines() {
        updater(mapOf("index.html" to "stable".toByteArray()),seq=1).checkNow()
        assertTrue(WebUpdates(c,pub).confirmStartup())
        updater(mapOf("index.html" to "broken".toByteArray()),seq=2).checkNow()
        val trial=WebUpdates(c,pub)
        assertTrue(trial.isTrialActive())
        assertEquals("broken",page(trial))
        // No confirmation: app died while starting.
        val rollback=WebUpdates(c,pub)
        assertFalse(rollback.isTrialActive())
        assertEquals("stable",page(rollback))
        val calls=mutableListOf<String>()
        updater(mapOf("index.html" to "broken".toByteArray()),seq=2,calls=calls).checkNow()
        assertEquals(listOf("manifest.json"),calls)
        updater(mapOf("index.html" to "repaired".toByteArray()),seq=3).checkNow()
        val repaired=WebUpdates(c,pub)
        assertEquals("repaired",page(repaired))
        assertTrue(repaired.confirmStartup())
    }

    @Test fun previouslySignedSnapshotCannotBeUsedWithWrongKey() {
        updater(mapOf("index.html" to "trusted".toByteArray())).checkNow()
        WebUpdates(c,pub).confirmStartup()
        val other=KeyPairGenerator.getInstance("EC").apply { initialize(256) }.generateKeyPair()
        val wrongPub=Base64.getEncoder().encodeToString(other.public.encoded)
        assertNull(page(WebUpdates(c,wrongPub)))
    }

    @Test fun sameManifestRecheckDoesNotRedownloadAndReplayCannotDowngrade() {
        val first=mapOf("index.html" to "v1".toByteArray())
        val second=mapOf("index.html" to "v2".toByteArray())
        updater(first,1).checkNow()
        WebUpdates(c,pub).confirmStartup()
        val calls=mutableListOf<String>()
        updater(first,1,calls).checkNow()
        assertEquals(listOf("manifest.json"),calls)
        updater(second,2).checkNow()
        WebUpdates(c,pub).confirmStartup()
        calls.clear()
        updater(first,1,calls).checkNow()
        assertEquals(listOf("manifest.json"),calls)
        assertEquals("v2",page(WebUpdates(c,pub)))
    }

    @Test fun expiredSignedManifestIsRejectedBeforePayloadDownload() {
        val calls=mutableListOf<String>()
        val files=mapOf("index.html" to "<p>expired</p>".toByteArray())
        updater(files,calls=calls,expiresAt=System.currentTimeMillis()-60_000L).checkNow()
        assertEquals(listOf("manifest.json"),calls)
        assertNull(page(WebUpdates(c,pub)))
    }

    @Test fun alteredStoredSnapshotIsRejectedOnRestartWithoutLoadingTamperedBytes() {
        val files=mapOf("index.html" to "<p>trusted</p>".toByteArray())
        updater(files).checkNow()
        val trial=WebUpdates(c,pub)
        assertEquals("<p>trusted</p>",page(trial))
        assertTrue(trial.confirmStartup())

        // Deliberately corrupt an already-accepted snapshot, then relaunch.
        // Validity must be rechecked from the signed hash list on launch.
        val revision=c.getSharedPreferences("web_updates_v2_signed",0)
            .getString("active",null)!!
        val saved=File(c.filesDir,"web-updates-v2-signed/$revision/index.html")
        assertTrue(saved.isFile)
        saved.writeText("<p>tampered</p>")
        val reopened=WebUpdates(c,pub)
        assertNull(page(reopened))
        assertFalse(reopened.isTrialActive())
    }

    @Test fun corruptedPendingSnapshotNeverActivates() {
        val files=mapOf("index.html" to "<p>pending</p>".toByteArray())
        updater(files).checkNow()
        val revision=c.getSharedPreferences("web_updates_v2_signed",0)
            .getString("pending",null)!!
        val saved=File(c.filesDir,"web-updates-v2-signed/$revision/index.html")
        assertTrue(saved.isFile)
        saved.writeText("<p>corrupted pending</p>")
        assertNull(page(WebUpdates(c,pub)))
        assertNull(c.getSharedPreferences("web_updates_v2_signed",0)
            .getString("pending",null))
    }

    @Test fun unsignedExtraFileInSnapshotMustNeverBeServed() {
        val files=mapOf("index.html" to "<p>signed page</p>".toByteArray())
        updater(files).checkNow()
        val trial=WebUpdates(c,pub)
        assertTrue(trial.confirmStartup())

        // Even if a stray executable file appears in the same private
        // snapshot directory, it is not trusted without manifest inclusion.
        val revision=c.getSharedPreferences("web_updates_v2_signed",0)
            .getString("active",null)!!
        val dir=File(c.filesDir,"web-updates-v2-signed/$revision")
        val extra=File(dir,"js/unsigned-extra.js")
        assertTrue(extra.parentFile!!.mkdirs())
        extra.writeText("window.untrusted=true")

        val reopened=WebUpdates(c,pub)
        assertEquals("<p>signed page</p>",page(reopened))
        assertNull(reopened.response(Uri.parse(
            "https://appassets.androidplatform.net/assets/www/js/unsigned-extra.js")))
    }

    @Test fun onlyWebPathsAndAppAssetsAreAllowed() {
        for(p in listOf("index.html","js/app.js","css/style.css",
            "js/components/app.min.js","css/theme-dark.min.css"))
            assertTrue(WebUpdates.allowed(p))
        for(p in listOf("js/../x.js","js/%2e%2e/x.js","js/x\\y.js",
            "js//app.js","js/./app.js","js/.hidden.js","css/theme//base.css",
            "css/.hidden.css","js/part./app.js",
            "data/prayer-times-offline.json","assets/quran.json","app.apk"))
            assertFalse(p,WebUpdates.allowed(p))
        assertEquals("index.html",WebUpdates.assetPath(uri))
        assertNull(WebUpdates.assetPath(Uri.parse("https://evil.example/assets/www/index.html")))
    }

    @Test fun checkIntervalAndIndependentChannelsUnchanged() {
        assertEquals(300000L,WebUpdates.MIN_CHECK_INTERVAL_MS)
        assertTrue(WebUpdates.due(1800000L,0))
        assertFalse(WebUpdates.due(1800000L,1799000L))
        assertTrue(WebUpdates.due(1800000L,1500000L))
        assertEquals("https://aoqat.vercel.app/android-updates/",WebUpdates.baseUrl(144))
        assertEquals("https://aoqat.vercel.app/android-updates/build-146/",WebUpdates.baseUrl(146))
    }
}
