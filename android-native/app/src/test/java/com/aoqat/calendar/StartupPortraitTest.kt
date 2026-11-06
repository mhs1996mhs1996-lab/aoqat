package com.aoqat.calendar

import android.graphics.BitmapFactory
import android.graphics.drawable.BitmapDrawable
import android.widget.ImageView
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class StartupPortraitTest {
    @Test fun bundledPortraitIsFullResolutionAndReplacesOldSplash() {
        val context=RuntimeEnvironment.getApplication()
        val options=BitmapFactory.Options().apply { inJustDecodeBounds=true }
        context.assets.open("splash-hawija-original.jpg").use { stream ->
            val bytes=stream.readBytes()
            val hash=java.security.MessageDigest.getInstance("SHA-256").digest(bytes)
                .joinToString("") { "%02x".format(it) }
            assertEquals("50c329d2ed32afe65f01f62a06f1655fbee1971a50d72d3f5df7e8947835e3ba",hash)
        }
        context.assets.open("splash-hawija-original.jpg").use { stream ->
            BitmapFactory.decodeStream(stream,null,options)
        }
        assertEquals(711,options.outWidth)
        assertEquals(1536,options.outHeight)
        val startup=StartupScreen(context)
        assertEquals("No duplicated icon or title overlays",1,startup.childCount)
        val image=startup.getChildAt(0) as ImageView
        assertEquals(ImageView.ScaleType.CENTER_CROP,image.scaleType)
        val drawable=image.drawable as BitmapDrawable
        assertEquals(711,drawable.bitmap.width)
        assertEquals(1536,drawable.bitmap.height)
    }
}
