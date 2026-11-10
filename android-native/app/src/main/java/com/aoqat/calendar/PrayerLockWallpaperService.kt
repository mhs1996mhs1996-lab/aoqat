package com.aoqat.calendar

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.text.Layout
import android.text.StaticLayout
import android.text.TextDirectionHeuristics
import android.text.TextPaint
import android.util.Log
import android.view.SurfaceHolder
import java.time.LocalDate
import java.util.Locale
import kotlin.math.min
import org.json.JSONObject

/**
 * An opt-in wallpaper previewed and applied by Android's wallpaper chooser.
 * Does NOT change the owner's wallpaper, alarms, notifications or widget settings.
 * This is a wallpaper, not a third-party lock-screen widget: whether the picker
 * offers "lock screen only" is controlled by the device's wallpaper host.
 */
class PrayerLockWallpaperService : WallpaperService() {
    override fun onCreateEngine(): Engine = PrayerEngine()

    private inner class PrayerEngine : Engine() {
        private val handler = Handler(Looper.getMainLooper())
        private val backdrop = Paint(Paint.ANTI_ALIAS_FLAG)
        private val edge = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(165, 226, 225, 188)
            style = Paint.Style.STROKE
        }
        private var running = false
        private var cachedAt = 0L
        private var cachedDate: LocalDate? = null
        private var cachedNext: PrayerTimes.Prayer? = null
        private var cachedToday: JSONObject? = null
        private val prayers = listOf(
            "fajr" to "الفجر", "sunrise" to "الشروق",
            "dhuhr" to "الظهر", "asr" to "العصر",
            "maghrib" to "المغرب", "isha" to "العشاء"
        )
        private val refresh = object : Runnable {
            override fun run() {
                if (!running) return
                drawFrame()
                if (running) handler.postDelayed(this, 1000L)
            }
        }

        override fun onVisibilityChanged(visible: Boolean) {
            running = visible
            handler.removeCallbacks(refresh)
            if (visible) handler.post(refresh)
        }

        override fun onSurfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
            super.onSurfaceChanged(holder, format, width, height)
            if (running || isPreview) drawFrame()
        }

        override fun onSurfaceRedrawNeeded(holder: SurfaceHolder) {
            super.onSurfaceRedrawNeeded(holder)
            drawFrame()
        }

        override fun onSurfaceDestroyed(holder: SurfaceHolder) {
            running = false
            handler.removeCallbacks(refresh)
            super.onSurfaceDestroyed(holder)
        }

        override fun onDestroy() {
            running = false
            handler.removeCallbacks(refresh)
            super.onDestroy()
        }

        private fun refreshPrayerData(now: Long) {
            val date = LocalDate.now()
            if (cachedAt != 0L && now - cachedAt < 60_000L &&
                cachedDate == date && cachedNext?.at?.let { it > now } != false) return
            cachedAt = now
            cachedDate = date
            try {
                cachedNext = PrayerTimes.events(this@PrayerLockWallpaperService)
                    .firstOrNull { it.at > now }
                val rows = PrayerTimes.rows(this@PrayerLockWallpaperService)
                cachedToday = (0 until rows.length()).mapNotNull { rows.optJSONObject(it) }
                    .firstOrNull { it.optInt("gregorian_month") == date.monthValue &&
                        it.optInt("gregorian_day") == date.dayOfMonth }
            } catch (e: Exception) {
                Log.w("PrayerLockWallpaper", "Offline prayer times could not be read", e)
                cachedNext = null
                cachedToday = null
            }
        }

        private fun drawFrame() {
            val holder = surfaceHolder
            var canvas: Canvas? = null
            try {
                canvas = holder.lockCanvas() ?: return
                drawWallpaper(canvas)
            } catch (e: Exception) {
                Log.w("PrayerLockWallpaper", "Could not render wallpaper frame", e)
            } finally {
                if (canvas != null) try { holder.unlockCanvasAndPost(canvas) }
                    catch (e: Exception) { Log.w("PrayerLockWallpaper", "Could not post frame", e) }
            }
        }

        private fun arabic(canvas: Canvas, value: String, center: Float, top: Float,
                           width: Float, fontSize: Float, color: Int,
                           bold: Boolean = false) {
            val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = color
                textSize = fontSize
                typeface = Typeface.create("sans-serif", if (bold) Typeface.BOLD else Typeface.NORMAL)
            }
            val w = width.toInt().coerceAtLeast(1)
            val layout = StaticLayout.Builder.obtain(value, 0, value.length, paint, w)
                .setAlignment(Layout.Alignment.ALIGN_CENTER)
                .setTextDirection(TextDirectionHeuristics.RTL)
                .setIncludePad(false).setMaxLines(1).build()
            canvas.save()
            canvas.translate(center - w / 2f, top)
            layout.draw(canvas)
            canvas.restore()
        }

        private fun clockText(at: Long, now: Long): String {
            val total = ((at - now).coerceAtLeast(0L) + 999L) / 1000L
            return String.format(Locale.US, "%02d:%02d:%02d",
                total / 3600L, (total / 60L) % 60L, total % 60L)
        }

        private fun formattedTime(id: String, raw: String): String {
            val minutes = PrayerTimes.minutes(raw, id) ?: return "—"
            val hour = minutes / 60
            return String.format(Locale.US, "%d:%02d %s",
                if (hour % 12 == 0) 12 else hour % 12, minutes % 60,
                if (hour < 12) "ص" else "م")
        }

        private fun drawWallpaper(canvas: Canvas) {
            val w = canvas.width.toFloat()
            val h = canvas.height.toFloat()
            if (w < 1 || h < 1) return
            val now = System.currentTimeMillis()
            refreshPrayerData(now)
            val scale = min(w / 390f, h / 780f).coerceIn(0.65f, 3f)
            backdrop.shader = LinearGradient(0f, 0f, w, h,
                Color.rgb(8, 45, 51), Color.rgb(7, 72, 67), Shader.TileMode.CLAMP)
            canvas.drawRect(0f, 0f, w, h, backdrop)
            backdrop.shader = null

            // Leave room for the system lock clock, status bar and notifications.
            // Heights depend on the user's selected components, not blank padding.
            val options = getSharedPreferences("prayer_lock_wallpaper", MODE_PRIVATE)
            val showTimes = options.getBoolean("show_times", true)
            val rows = if (showTimes) 6 else 0
            val rowHeight = 33f * scale
            val cardHeight = (143f + rows * 34f) * scale
            val cardWidth = (w - 30f * scale).coerceAtMost(368f * scale)
            val left = (w - cardWidth) / 2f
            val top = (h * 0.33f).coerceAtMost(h - cardHeight - 25f * scale)
                .coerceAtLeast(20f * scale)
            val right = left + cardWidth
            val bottom = top + cardHeight

            val card = RectF(left, top, right, bottom)
            backdrop.color = Color.argb(215, 13, 51, 57)
            canvas.drawRoundRect(card, 20f * scale, 20f * scale, backdrop)
            edge.strokeWidth = 1f * scale
            canvas.drawRoundRect(card, 20f * scale, 20f * scale, edge)

            val center = w / 2f
            val ivory = Color.rgb(255, 247, 222)
            val gold = Color.rgb(248, 211, 126)
            val next = cachedNext
            val nextName = next?.id?.let { PrayerTimes.names[it] }
            arabic(canvas, if (nextName != null) "باقي على صلاة $nextName"
                else "أوقات الصلاة في الحويجة", center, top + 14f * scale,
                cardWidth - 12f * scale, 21f * scale, ivory, true)
            val remaining = next?.let { clockText(it.at, now) } ?: "--:--:--"
            arabic(canvas, remaining, center, top + 48f * scale,
                cardWidth - 25f * scale, 36f * scale, gold, true)

            if (showTimes) {
                arabic(canvas, "مواقيت الصلاة اليوم", center, top + 102f * scale,
                    cardWidth - 18f * scale, 17f * scale, ivory, true)
                val firstRowTop = top + 137f * scale
                prayers.forEachIndexed { index, (id, name) ->
                    val y = firstRowTop + index * rowHeight
                    if (next?.id == id) {
                        backdrop.color = Color.argb(118, 28, 120, 101)
                        canvas.drawRoundRect(RectF(left + 9f * scale, y - 3f * scale,
                            right - 9f * scale, y + rowHeight - 3f * scale),
                            8f * scale, 8f * scale, backdrop)
                    }
                    val xLabel = center + cardWidth * 0.23f
                    val xTime = center - cardWidth * 0.23f
                    arabic(canvas, name, xLabel, y, cardWidth * 0.43f, 17f * scale, ivory,
                        next?.id == id)
                    arabic(canvas, formattedTime(id, cachedToday?.optString(id).orEmpty()),
                        xTime, y, cardWidth * 0.43f, 17f * scale, gold,
                        next?.id == id)
                }
            }
        }
    }
}
