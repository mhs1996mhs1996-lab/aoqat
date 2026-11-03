package com.aoqat.calendar

import android.media.AudioManager

/** Notifications and short competing audio duck without tearing down scheduled adhan playback. */
internal class AdhanAudioFocus(private val resume:()->Unit, private val pause:()->Unit, private val volume:(Float)->Unit, private val stop:()->Unit) {
    var granted=false
        private set
    private var ended=false
    fun requested(result:Int){ended=false;granted=result==AudioManager.AUDIOFOCUS_REQUEST_GRANTED}
    fun changed(change:Int){
        if(ended)return
        when(change){
            AudioManager.AUDIOFOCUS_GAIN->{granted=true;volume(1f);resume()}
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK,
            AudioManager.AUDIOFOCUS_LOSS -> {
                // Never terminate the complete adhan when a notification steals focus.
                volume(.25f)
            }
        }
    }
    fun close(){ended=true;granted=false}
}
