package com.aoqat.calendar

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.drawable.Icon

/** Identical approved bitmap and display route to the owner-pilot card. */
internal object LockNotificationIcon {
    fun exactSmall(context: Context): Icon? = try {
        BitmapFactory.decodeResource(context.resources, R.drawable.pilot_notify_exact_wait)
            ?.let { Icon.createWithBitmap(it) }
    } catch (_: Exception) { null }
}
