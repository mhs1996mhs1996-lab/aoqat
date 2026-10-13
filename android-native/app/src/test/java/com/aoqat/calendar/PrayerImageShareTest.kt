package com.aoqat.calendar
import android.content.Intent
import android.net.Uri
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.*
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class PrayerImageShareTest {
 @Test fun shareUsesLocalPrivateFileAndTemporaryReadPermission(){val c=RuntimeEnvironment.getApplication();val i=PrayerImageShare.intent(c,"data:image/jpeg;base64,AQID");assertEquals(Intent.ACTION_SEND,i.action);assertEquals("image/jpeg",i.type);val uri=i.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)!!;assertEquals("content",uri.scheme);assertEquals(c.packageName+".prayer-images",uri.authority);assertTrue(i.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION!=0);assertArrayEquals(byteArrayOf(1,2,3),c.contentResolver.openInputStream(uri)!!.readBytes());assertNotNull(i.clipData)}
 @Test(expected=IllegalArgumentException::class) fun refusesNonImagePayload(){PrayerImageShare.decode("data:text/html;base64,AQID")}
}
