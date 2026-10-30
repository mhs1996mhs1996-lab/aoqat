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
        context.assets.open("splash-hawija-approved.png").use { stream ->
            BitmapFactory.decodeStream(stream,null,options)
        }
        assertEquals(711,options.outWidth)
        assertEquals(1536,options.outHeight)
        val startup=StartupScreen(context)
        assertEquals("No duplicated icon or title overlays",1,startup.childCount)
        val image=startup.getChildAt(0) as ImageView
        assertEquals(ImageView.ScaleType.FIT_CENTER,image.scaleType)
        val drawable=image.drawable as BitmapDrawable
        assertEquals(711,drawable.bitmap.width)
        assertEquals(1536,drawable.bitmap.height)
    }
}
