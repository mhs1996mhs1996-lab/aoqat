package com.aoqat.calendar
import android.content.Context
import android.media.AudioManager
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.*
import org.robolectric.annotation.Config
@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28,34])
class AdhanVolumeTest {
 private val c:Context get()=RuntimeEnvironment.getApplication()
 @Test fun interruptedPlaybackRestoresTheOriginalAlarmVolume(){val am=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager;val max=am.getStreamMaxVolume(AudioManager.STREAM_ALARM);am.setStreamVolume(AudioManager.STREAM_ALARM,max,0);c.getSharedPreferences("adhan_audio_volume",Context.MODE_PRIVATE).edit().putInt("previous",1).putInt("applied",max).commit();AdhanPlaybackService.restoreVolume(c);assertEquals(1,am.getStreamVolume(AudioManager.STREAM_ALARM));assertFalse(c.getSharedPreferences("adhan_audio_volume",Context.MODE_PRIVATE).contains("previous"))}
 @Test fun restorationPreservesVolumeChangedByTheUser(){val am=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager;val max=am.getStreamMaxVolume(AudioManager.STREAM_ALARM);am.setStreamVolume(AudioManager.STREAM_ALARM,2,0);c.getSharedPreferences("adhan_audio_volume",Context.MODE_PRIVATE).edit().putInt("previous",1).putInt("applied",max).commit();AdhanPlaybackService.restoreVolume(c);assertEquals(2,am.getStreamVolume(AudioManager.STREAM_ALARM))}
}
