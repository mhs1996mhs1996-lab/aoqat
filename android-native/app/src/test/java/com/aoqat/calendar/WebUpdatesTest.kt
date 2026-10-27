package com.aoqat.calendar
import org.junit.Assert.*
import org.junit.Test
@org.junit.runner.RunWith(org.robolectric.RobolectricTestRunner::class)
@org.robolectric.annotation.Config(sdk=[28,34])
class WebUpdatesTest {
 private val c:android.content.Context get()=org.robolectric.RuntimeEnvironment.getApplication()
 private fun manifest(data:Map<String,ByteArray>,build:Int=c.packageManager.getPackageInfo(c.packageName,0).versionCode):ByteArray{
  val files=org.json.JSONObject();data.forEach{(path,bytes)->files.put(path,WebUpdates.digest(bytes))}
  val canonical=data.keys.sorted().joinToString("\n"){it+":"+files.getString(it)}
  return org.json.JSONObject().put("nativeBuild",build).put("revision",WebUpdates.digest(canonical.toByteArray())).put("files",files).toString().toByteArray()
 }
 @Test fun completeUpdateAppliesOnlyToNextInstanceAndReusesUnchangedFiles(){
  val bytes=mapOf("index.html" to "<p>new</p>".toByteArray(),"js/example.js" to "window.test=1;".toByteArray())
  val calls=mutableListOf<String>();val update=WebUpdates(c){path,_->calls.add(path);if(path=="manifest.json")manifest(bytes)else bytes.getValue(path.removePrefix("files/"))}
  update.checkNow();val uri=android.net.Uri.parse("file:///android_asset/www/index.html")
  assertNull(update.response(uri));assertEquals("<p>new</p>",WebUpdates(c).response(uri)!!.data.bufferedReader().readText())
  val changed=bytes+mapOf("index.html" to "<p>newer</p>".toByteArray());calls.clear()
  WebUpdates(c){path,_->calls.add(path);if(path=="manifest.json")manifest(changed)else changed.getValue(path.removePrefix("files/"))}.checkNow()
  assertFalse(calls.contains("files/js/example.js"));assertTrue(calls.contains("files/index.html"))
 }
 @Test fun failedDownloadNeverReplacesTheInstalledVersion(){
  val bytes=mapOf("index.html" to "valid".toByteArray())
  WebUpdates(c){path,_->if(path=="manifest.json")manifest(bytes)else "corrupt".toByteArray()}.checkNow()
  assertFalse(c.getSharedPreferences("web_updates_v1",0).contains("active"))
  assertNull(WebUpdates(c).response(android.net.Uri.parse("file:///android_asset/www/index.html")))
 }
 @Test fun incompatibleNativeBuildCannotInstall(){
  val bytes=mapOf("index.html" to "valid".toByteArray());var downloads=0
  WebUpdates(c){_,_->downloads++;manifest(bytes,-1)}.checkNow();assertEquals(1,downloads)
  assertFalse(c.getSharedPreferences("web_updates_v1",0).contains("active"))
 }

 @Test fun onlyWebLayerPathsCanBeUpdated(){
  for(path in listOf("index.html","js/apk-startup-bundle.js","css/style.css"))assertTrue(path,WebUpdates.allowed(path))
  for(path in listOf("../index.html","js/../../main.kt","js/%2e%2e/a.js","js/a\\b.js","assets/mushaf-phone-hafs/001.json.gz","data/prayer-times-offline.json","app.apk"))assertFalse(path,WebUpdates.allowed(path))
 }
 @Test fun checksumsAreStable(){assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",WebUpdates.digest(byteArrayOf()))}
}
