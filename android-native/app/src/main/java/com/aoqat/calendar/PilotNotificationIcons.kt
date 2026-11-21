package com.aoqat.calendar

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.BitmapFactory
import android.graphics.drawable.Icon
import android.util.Base64

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

    // Cropped directly from the owner's approved model-3 mosque icon (not a redraw).
    private const val ADHAN_REFERENCE_WEBP = "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"

    // Bitmaps are exact crops of the owner's supplied model-1 reference.
    // Never redraw their gradients or shapes as approximated vector paths.
    private fun exactResource(drawableId: Int): Int? = when (drawableId) {
        R.drawable.pilot_notify_adhan -> R.drawable.pilot_notify_exact_adhan
        R.drawable.pilot_notify_wait -> R.drawable.pilot_notify_exact_wait
        R.drawable.pilot_notify_elapsed -> R.drawable.pilot_notify_exact_elapsed
        else -> null
    }

    fun exactSmall(context: Context, countDown: Boolean, atAdhan: Boolean = false): Icon? {
        val resId = when {
            atAdhan -> R.drawable.pilot_notify_exact_adhan
            countDown -> R.drawable.pilot_notify_exact_wait
            else -> R.drawable.pilot_notify_exact_elapsed
        }
        return try {
            BitmapFactory.decodeResource(context.resources, resId)
                ?.let { Icon.createWithBitmap(it) }
        } catch (_:Exception) { null }
    }

    fun large(context: Context, drawableId: Int): Bitmap? {
        exactResource(drawableId)?.let { exact ->
            try { BitmapFactory.decodeResource(context.resources, exact)?.let { return it } }
            catch (_:Exception) { /* Fall back to existing drawable if needed. */ }
        }
        if (drawableId == R.drawable.pilot_notify_adhan) {
            try {
                val bytes = Base64.decode(ADHAN_REFERENCE_WEBP, Base64.NO_WRAP)
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.let { return it }
            } catch (_: Exception) { /* Keep the vector fallback available offline. */ }
        }
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
