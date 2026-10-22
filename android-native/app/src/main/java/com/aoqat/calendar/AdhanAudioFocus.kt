package com.aoqat.calendar

import android.media.AudioManager

/** A transient interruption keeps the prepared player and its position alive. */
internal class AdhanAudioFocus(private val resume:()->Unit, private val pause:()->Unit, private val volume:(Float)->Unit, private val stop:()->Unit) {
    var granted=false
        private set
    private var ended=false
    fun requested(result:Int){ended=false;granted=result==AudioManager.AUDIOFOCUS_REQUEST_GRANTED}
    fun changed(change:Int){
        if(ended)return
        when(change){
            AudioManager.AUDIOFOCUS_GAIN->{granted=true;volume(1f);resume()}
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT->{granted=false;pause()}
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK->volume(.25f)
            AudioManager.AUDIOFOCUS_LOSS->{granted=false;ended=true;stop()}
        }
    }
    fun close(){ended=true;granted=false}
}
