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
import java.time.format.DateTimeFormatter
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
        private var cachedIqama: PrayerTimes.Prayer? = null
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
                cachedDate == date && cachedNext?.at?.let { it > now } != false &&
                cachedIqama?.let { it.at + IqamaNativeScheduler.durations(this@PrayerLockWallpaperService,it.id).totalMs > now } != false) return
            cachedAt = now
            cachedDate = date
            try {
                val events = PrayerTimes.events(this@PrayerLockWallpaperService,date.minusDays(1))
                cachedNext = events.firstOrNull { it.at > now }
                cachedIqama = if(IqamaNativeScheduler.enabled(this@PrayerLockWallpaperService)){
                    events.lastOrNull { event ->
                        val duration=IqamaNativeScheduler.durations(this@PrayerLockWallpaperService,event.id)
                        !FridaySchedule.suppress(this@PrayerLockWallpaperService,event.id,event.at) &&
                            now>=event.at && now<event.at+duration.totalMs
                    }
                }else null
                val rows = PrayerTimes.rows(this@PrayerLockWallpaperService)
                cachedToday = (0 until rows.length()).mapNotNull { rows.optJSONObject(it) }
                    .firstOrNull { it.optInt("gregorian_month") == date.monthValue &&
                        it.optInt("gregorian_day") == date.dayOfMonth }
            } catch (e: Exception) {
                Log.w("PrayerLockWallpaper", "Offline prayer times could not be read", e)
                cachedNext = null
                cachedIqama = null
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
                           bold: Boolean = false, font: String = "sans") {
            val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = color
                textSize = fontSize
                val family=when(font){"serif"->"serif";"condensed"->"sans-serif-condensed";"medium"->"sans-serif-medium";else->"sans-serif"}
                typeface = Typeface.create(family, if (bold) Typeface.BOLD else Typeface.NORMAL)
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

        private fun iqamaCounter(ms:Long):String {
            val s=(ms.coerceAtLeast(0L)+999L)/1000L
            return String.format(Locale.US,"%02d:%02d",s/60L,s%60L)
        }

        private fun drawWallpaper(canvas: Canvas) {
            val w=canvas.width.toFloat();val h=canvas.height.toFloat()
            if(w<1f||h<1f)return
            val now=System.currentTimeMillis()
            refreshPrayerData(now)
            val cfg=LockWallpaperOptions.read(this@PrayerLockWallpaperService)
            val selectedRows=LockWallpaperOptions.visiblePrayers(cfg)
            val scale=min(min(w/390f,h/780f).coerceIn(.60f,3f),
                h*.59f/LockWallpaperOptions.cardHeight(cfg))
            val size=cfg.optInt("size",100)/100f
            val labelFont=cfg.optString("labelFont","sans")
            val numberFont=cfg.optString("numberFont","sans")
            val ivory=Color.parseColor(cfg.optString("labelColor","#FFF7DE"))
            val gold=Color.parseColor(cfg.optString("numberColor","#F8D37E"))
            backdrop.shader=LinearGradient(0f,0f,w,h,Color.rgb(8,45,51),
                Color.rgb(7,72,67),Shader.TileMode.CLAMP)
            canvas.drawRect(0f,0f,w,h,backdrop)
            backdrop.shader=null

            val cardHeight=LockWallpaperOptions.cardHeight(cfg)*scale
            val cardWidth=(w-30f*scale).coerceAtMost(368f*scale)
            val left=(w-cardWidth)/2f
            val top=(h*.33f).coerceAtMost(h-cardHeight-25f*scale).coerceAtLeast(20f*scale)
            val right=left+cardWidth
            val card=RectF(left,top,right,top+cardHeight)
            backdrop.color=when(cfg.optString("background")){
                "navy"->Color.argb(221,17,36,57)
                "transparent"->Color.argb(85,13,51,57)
                else->Color.argb(215,13,51,57)
            }
            canvas.drawRoundRect(card,20f*scale,20f*scale,backdrop)
            edge.strokeWidth=1f*scale
            canvas.drawRoundRect(card,20f*scale,20f*scale,edge)
            val center=w/2f
            var y=top+13f*scale
            val large=size>1.25f

            if(LockWallpaperOptions.selected(cfg,"next")){
                val nextName=cachedNext?.id?.let{PrayerTimes.names[it]}
                val label=if(nextName==null)"الصلاة القادمة" else "باقي على صلاة $nextName"
                val value=cachedNext?.let{clockText(it.at,now)}?:"--:--:--"
                if(large){
                    arabic(canvas,label,center,y,cardWidth-16f*scale,18f*size*scale,ivory,true,labelFont)
                    arabic(canvas,value,center,y+34f*scale,cardWidth-16f*scale,28f*size*scale,gold,true,numberFont)
                }else{
                    arabic(canvas,label,center+cardWidth*.215f,y+12f*scale,cardWidth*.52f,18f*size*scale,ivory,true,labelFont)
                    arabic(canvas,value,center-cardWidth*.245f,y+9f*scale,cardWidth*.43f,21f*size*scale,gold,true,numberFont)
                }
                y+=LockWallpaperOptions.countdownHeight(cfg)*scale
            }
            if(LockWallpaperOptions.selected(cfg,"iqama")){
                val event=cachedIqama
                val threshold=event?.let{it.at+IqamaNativeScheduler.durations(this@PrayerLockWallpaperService,it.id).beforeMs}
                val after=threshold!=null&&now>=threshold
                val label=if(event==null)"الإقامة" else if(after)"مضى على الإقامة" else "باقي على الإقامة"
                val value=if(threshold==null)"00:00" else iqamaCounter(if(after)now-threshold else threshold-now)
                if(large){
                    arabic(canvas,label,center,y,cardWidth-16f*scale,18f*size*scale,ivory,true,labelFont)
                    arabic(canvas,value,center,y+32f*scale,cardWidth-16f*scale,25f*size*scale,gold,true,numberFont)
                }else{
                    arabic(canvas,label,center+cardWidth*.215f,y+9f*scale,cardWidth*.52f,17f*size*scale,ivory,true,labelFont)
                    arabic(canvas,value,center-cardWidth*.245f,y+6f*scale,cardWidth*.43f,20f*size*scale,gold,true,numberFont)
                }
                y+=LockWallpaperOptions.iqamaHeight(cfg)*scale
            }
            if(LockWallpaperOptions.selected(cfg,"date")){
                val date=LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy",Locale.US))
                arabic(canvas,date,center,y,cardWidth-16f*scale,17f*size*scale,ivory,false,numberFont)
                y+=29f*scale
            }
            if(selectedRows.isNotEmpty()){
                arabic(canvas,"مواقيت الصلاة اليوم",center,y+2f*scale,
                    cardWidth-16f*scale,17f*size*scale,ivory,true,labelFont)
                y+=28f*scale
                val rowHeight=LockWallpaperOptions.rowHeight(cfg)*scale
                for(id in selectedRows){
                    if(cachedNext?.id==id){
                        backdrop.color=Color.argb(118,28,120,101)
                        canvas.drawRoundRect(RectF(left+9f*scale,y-2f*scale,
                            right-9f*scale,y+rowHeight-2f*scale),8f*scale,8f*scale,backdrop)
                    }
                    val name=prayers.firstOrNull{it.first==id}?.second?:id
                    arabic(canvas,name,center+cardWidth*.23f,y+4f*scale,
                        cardWidth*.43f,17f*size*scale,ivory,cachedNext?.id==id,labelFont)
                    arabic(canvas,formattedTime(id,cachedToday?.optString(id).orEmpty()),
                        center-cardWidth*.23f,y+4f*scale,cardWidth*.43f,17f*size*scale,
                        gold,cachedNext?.id==id,numberFont)
                    y+=rowHeight
                }
            }
        }
    }
}
