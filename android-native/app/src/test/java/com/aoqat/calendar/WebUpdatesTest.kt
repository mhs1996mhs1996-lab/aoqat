package com.aoqat.calendar
import org.junit.Assert.*
import org.junit.Test
class WebUpdatesTest {
 @Test fun onlyWebLayerPathsCanBeUpdated(){
  for(path in listOf("index.html","js/apk-startup-bundle.js","css/style.css"))assertTrue(path,WebUpdates.allowed(path))
  for(path in listOf("../index.html","js/../../main.kt","js/%2e%2e/a.js","js/a\\b.js","assets/mushaf-phone-hafs/001.json.gz","data/prayer-times-offline.json","app.apk"))assertFalse(path,WebUpdates.allowed(path))
 }
 @Test fun checksumsAreStable(){assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",WebUpdates.digest(byteArrayOf()))}
}
