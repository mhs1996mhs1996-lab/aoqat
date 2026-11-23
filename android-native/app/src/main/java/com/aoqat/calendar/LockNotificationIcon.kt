package com.aoqat.calendar

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader

/**
 * Main B153: render the owner-approved warm orange hourglass as a FULL-COLOR
 * bitmap. The B152 resource-based Icon was recolored pale gold by the device's
 * SystemUI. A Bitmap large icon keeps the actual orange gradient pixels instead
 * of offering a tintable vector resource. Only the persistent prayer notification
 * uses this bitmap. Never change application icons, channels or saved preferences.
 */
internal object LockNotificationIcon {
    private const val SIZE = 192
    @Volatile private var cached: Bitmap? = null

    fun bitmap(): Bitmap {
        cached?.let { return it }
        return synchronized(this) {
            cached ?: drawIcon().also { cached = it }
        }
    }

    private fun drawIcon(): Bitmap {
        val out = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(out)
        val background = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f, 0f, 176f, 192f,
                intArrayOf(Color.rgb(255, 183, 47), Color.rgb(255, 148, 25), Color.rgb(255, 116, 0)),
                floatArrayOf(0f, 0.47f, 1f), Shader.TileMode.CLAMP
            )
        }
        val outer = RectF(4f, 4f, 188f, 188f)
        canvas.drawRoundRect(outer, 35f, 35f, background)
        val border = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(235, 255, 239, 202)
            style = Paint.Style.STROKE
            strokeWidth = 4f
        }
        canvas.drawRoundRect(RectF(6f, 6f, 186f, 186f), 33f, 33f, border)

        val white = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
        canvas.drawRoundRect(RectF(52f, 40f, 140f, 53f), 6f, 6f, white)
        canvas.drawRoundRect(RectF(52f, 139f, 140f, 152f), 6f, 6f, white)

        // Elongated, symmetrical glass outline as in the orange pilot model.
        val glass = Path().apply {
            moveTo(67f, 55f)
            lineTo(125f, 55f)
            lineTo(125f, 68f)
            cubicTo(125f, 79f, 110f, 88f, 96f, 96f)
            cubicTo(82f, 88f, 67f, 79f, 67f, 68f)
            close()
            moveTo(96f, 96f)
            cubicTo(110f, 104f, 125f, 113f, 125f, 124f)
            lineTo(125f, 137f)
            lineTo(67f, 137f)
            lineTo(67f, 124f)
            cubicTo(67f, 113f, 82f, 104f, 96f, 96f)
            close()
        }
        // White glass outline, leaving orange negative space inside.
        val outline = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            style = Paint.Style.STROKE
            strokeWidth = 8f
            strokeJoin = Paint.Join.ROUND
            strokeCap = Paint.Cap.ROUND
        }
        canvas.drawPath(glass, outline)

        // Falling sand and lower sand mound: pure white, never system-tinted.
        val sand = Path().apply {
            moveTo(79f, 66f)
            lineTo(113f, 66f)
            lineTo(96f, 83f)
            close()
            moveTo(95f, 100f)
            lineTo(97f, 100f)
            lineTo(97f, 112f)
            lineTo(95f, 112f)
            close()
            moveTo(96f, 113f)
            lineTo(115f, 132f)
            lineTo(77f, 132f)
            close()
        }
        canvas.drawPath(sand, white)
        return out
    }
}
