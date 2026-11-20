package com.aoqat.calendar

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas

/**
 * Owner-only notification icon palette traced from the exact approved preview.
 * Android system small icons are monochrome by design; the visible full-color
 * versions appear inside custom cards and (where supported) as large icons.
 */
internal object PilotNotificationIcons {
    fun smallAdhan(): Int = R.drawable.pilot_notify_small_adhan
    fun smallPhase(countDown: Boolean): Int =
        if(countDown) R.drawable.pilot_notify_small_wait else R.drawable.pilot_notify_small_elapsed
    fun coloredPhase(countDown: Boolean): Int =
        if(countDown) R.drawable.pilot_notify_wait else R.drawable.pilot_notify_elapsed
    fun coloredAdhan(): Int = R.drawable.pilot_notify_adhan

    fun large(context: Context, drawableId: Int): Bitmap? {
        return try {
        val d = context.getDrawable(drawableId) ?: return null
        val bmp = Bitmap.createBitmap(96,76,Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        d.setBounds(0,0,96,76)
        d.draw(canvas)
        bmp
        }catch(_:Exception){null}
    }
}
