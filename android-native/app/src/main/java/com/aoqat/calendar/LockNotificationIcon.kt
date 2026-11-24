package com.aoqat.calendar

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.drawable.Icon

/** Original model-1 bitmap assets; never recreate their gradients or symbols. */
internal object LockNotificationIcon {
    fun phaseResource(countDown:Boolean):Int =
        if(countDown) R.drawable.pilot_notify_exact_wait else R.drawable.pilot_notify_exact_elapsed

    private fun exact(context:Context,res:Int):Icon? = try {
        BitmapFactory.decodeResource(context.resources,res)?.let { Icon.createWithBitmap(it) }
    } catch (_:Exception) { null }

    fun exactSmall(context:Context):Icon? = exact(context,phaseResource(true))
    fun exactAdhan(context:Context):Icon? = exact(context,R.drawable.pilot_notify_exact_adhan)
}
