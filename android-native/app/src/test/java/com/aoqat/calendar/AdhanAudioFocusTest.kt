package com.aoqat.calendar
import android.media.AudioManager
import org.junit.Assert.*
import org.junit.Test

class AdhanAudioFocusTest {
 @Test fun notificationDucksThenRestoresWithoutEndingPlayback(){var level=1f;var stopped=false;var playing=true;val s=AdhanAudioFocus({playing=true},{playing=false},{level=it},{stopped=true});s.requested(AudioManager.AUDIOFOCUS_REQUEST_GRANTED);s.changed(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK);assertTrue(playing);assertEquals(.25f,level,0f);assertFalse(stopped);s.changed(AudioManager.AUDIOFOCUS_GAIN);assertEquals(1f,level,0f);assertTrue(playing);assertFalse(stopped)}
 @Test fun temporaryInterruptionOnlyDucksAndNeverPausesTakbirs(){var position=42000;var playing=true;var level=1f;var stopped=false;val s=AdhanAudioFocus({playing=true},{playing=false},{level=it},{stopped=true});s.requested(AudioManager.AUDIOFOCUS_REQUEST_GRANTED);s.changed(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT);assertTrue(playing);assertFalse(stopped);assertTrue(s.granted);assertEquals(.25f,level,0f);s.changed(AudioManager.AUDIOFOCUS_GAIN);assertTrue(playing);assertEquals(1f,level,0f);assertEquals(42000,position);assertFalse(stopped)}
 @Test fun delayedInitialGrantCanStartWithoutRestartingService(){var starts=0;val s=AdhanAudioFocus({starts++},{},{},{});s.requested(AudioManager.AUDIOFOCUS_REQUEST_DELAYED);assertFalse(s.granted);assertEquals(0,starts);s.changed(AudioManager.AUDIOFOCUS_GAIN);assertTrue(s.granted);assertEquals(1,starts)}
 @Test fun lostFocusCannotStopExplicitAdhanAndManualCloseBlocksFurtherCallbacks(){var stops=0;var level=1f;val s=AdhanAudioFocus({},{},{level=it},{stops++});s.requested(AudioManager.AUDIOFOCUS_REQUEST_GRANTED);s.changed(AudioManager.AUDIOFOCUS_LOSS);assertEquals(.25f,level,0f);assertEquals(0,stops);s.changed(AudioManager.AUDIOFOCUS_GAIN);assertEquals(1f,level,0f);s.close();s.changed(AudioManager.AUDIOFOCUS_LOSS);assertEquals(1f,level,0f);assertEquals(0,stops)}
}
