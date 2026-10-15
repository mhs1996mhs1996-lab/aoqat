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
 @Test fun consecutiveDifferentPostersNeverOverwriteSharedBytes(){val c=RuntimeEnvironment.getApplication();val first=PrayerImageShare.intent(c,"data:image/jpeg;base64,AQID").getParcelableExtra<Uri>(Intent.EXTRA_STREAM)!!;val second=PrayerImageShare.intent(c,"data:image/jpeg;base64,BAUG").getParcelableExtra<Uri>(Intent.EXTRA_STREAM)!!;assertNotEquals(first,second);assertArrayEquals(byteArrayOf(1,2,3),c.contentResolver.openInputStream(first)!!.readBytes());assertArrayEquals(byteArrayOf(4,5,6),c.contentResolver.openInputStream(second)!!.readBytes())}
 @Test(expected=IllegalArgumentException::class) fun refusesNonImagePayload(){PrayerImageShare.decode("data:text/html;base64,AQID")}
}

