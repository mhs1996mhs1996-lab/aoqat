package com.aoqat.calendar

import android.app.*
import android.appwidget.*
import android.content.*
import android.graphics.Color
import android.os.*
import android.widget.RemoteViews
import java.time.*
import java.util.Locale

/**
 * The three independent home-screen widgets share only existing, locally stored
 * prayer/iqama data. Notification layout and alarm delivery are never changed.
 */
class PrayerWidget:AppWidgetProvider(){
    companion object{
        private fun ids(c:Context,provider:Class<*>):IntArray =
            AppWidgetManager.getInstance(c).getAppWidgetIds(ComponentName(c,provider))
        fun exists(c:Context):Boolean = listOf(
            PrayerWidget::class.java, FivePrayerWidget::class.java, FivePrayerCompactWidget::class.java, FivePrayerFeaturedWidget::class.java, PrayerCombinedWidget::class.java, IqamaCountdownWidget::class.java
        ).any{ids(c,it).isNotEmpty()}

        fun views(c:Context,notification:Boolean=false,compact:Boolean=false):RemoteViews{
            val base=if(notification)R.layout.prayer_next_notification else if(compact)R.layout.prayer_widget_compact else R.layout.prayer_widget
            val v=RemoteViews(c.packageName,if(notification)base else WidgetAppearance.counterLayout(c,"next",base))
            val now=System.currentTimeMillis()
            val next=PrayerTimes.events(c).firstOrNull{it.at>now}
            val prayerLabel=if(next==null)"افتح التطبيق لتحميل المواقيت" else if(notification)"${PrayerTimes.names[next.id]} بعد" else "باقي على صلاة ${PrayerTimes.names[next.id]}"
            v.setTextViewText(R.id.widget_prayer,prayerLabel)
            v.setChronometer(R.id.widget_counter,SystemClock.elapsedRealtime()+((next?.at?:now)-now),"%s",next!=null)
            v.setChronometerCountDown(R.id.widget_counter,true)
            if(next==null)v.setTextViewText(R.id.widget_counter,"--:--")
            v.setTextViewText(R.id.widget_date,LocalDate.now().toString())
            // The persistent notification keeps its original appearance and is
            // not affected by the user's independent home-screen widget styling.
            if(notification){
                v.setInt(R.id.prayer_widget_root,"setBackgroundColor",Color.rgb(8,35,47))
                listOf(R.id.widget_prayer,R.id.widget_counter,R.id.widget_date).forEach{v.setTextColor(it,Color.WHITE)}
            }else{
                WidgetAppearance.decorate(c,v,if(compact) R.id.widget_next_card else R.id.prayer_widget_root,mapOf(
                    R.id.widget_prayer to (prayerLabel to if(compact)19f else 23f),
                    R.id.widget_date to (LocalDate.now().toString() to 15f)
                ),"next")
                WidgetAppearance.decorateCounter(c,v,R.id.widget_counter,"next",if(compact)24f else 32f)
            }
            v.setOnClickPendingIntent(R.id.prayer_widget_root,PendingIntent.getActivity(c,60500,
                Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }

        fun update(c:Context){
            val manager=AppWidgetManager.getInstance(c)
            ids(c,PrayerWidget::class.java).forEach{id->
                manager.updateAppWidget(id,views(c,compact=WidgetAppearance.compact(c,"next",manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,300),205)))
            }
            ids(c,FivePrayerWidget::class.java).forEach{id->
                val options=manager.getAppWidgetOptions(id)
                manager.updateAppWidget(id,FivePrayerWidget.views(c,options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,170),layoutOverride="classic"))
            }
            ids(c,FivePrayerCompactWidget::class.java).forEach{id->
                manager.updateAppWidget(id,FivePrayerWidget.views(c,layoutOverride="five_grid"))
            }
            ids(c,FivePrayerFeaturedWidget::class.java).forEach{id->
                manager.updateAppWidget(id,FivePrayerWidget.views(c,layoutOverride="five_featured"))
            }
            ids(c,PrayerCombinedWidget::class.java).forEach{id->manager.updateAppWidget(id,PrayerCombinedWidget.views(c))}
            ids(c,IqamaCountdownWidget::class.java).forEach{id->
                manager.updateAppWidget(id,IqamaCountdownWidget.views(c,compact=WidgetAppearance.compact(c,"iqama",manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,300),260)))
            }
            WidgetRefresh.schedule(c)
        }
    }
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){update(c);AdhanSchedule.schedule(c);Thread{IqamaNativeScheduler.refresh(c)}.start()}
    override fun onAppWidgetOptionsChanged(c:Context,m:AppWidgetManager,id:Int,options:Bundle){PrayerWidget.update(c)}
    override fun onDeleted(c:Context,ids:IntArray){AdhanSchedule.schedule(c)}
}

/** Today's five prayers, taken from the project's chosen cached time table. */
class FivePrayerWidget:AppWidgetProvider(){
    companion object{
        private fun display(minutes:Int):String{
            val hour=minutes/60
            return String.format(Locale.US,"%d:%02d %s",if(hour%12==0)12 else hour%12,
                minutes%60,if(hour<12)"ص" else "م")
        }
        fun views(c:Context,heightDp:Int=190,layoutOverride:String?=null):RemoteViews{
            val selected=WidgetAppearance.item(c,"times").optString("layout","grid")
            // Never crop the old five-line design when the launcher reduces height.
            val requested=layoutOverride ?: selected
            // Launchers can grant less space than the requested minHeight. Keep every time visible.
            // A very short widget switches to the existing 3+3 grid rather than cropping rows.
            val layout=if(requested=="classic" && heightDp in 1..164) "grid" else requested
            val compact=layout=="grid" || layout=="five_grid"
            val compressedClassic=layout=="classic" && heightDp in 1..259
            val kind=when(layout){"five_grid"->"five_grid";"five_featured"->"five_featured";else->"times"}
            val base=when(layout){
                "grid" -> R.layout.prayer_times_widget_grid
                "featured" -> R.layout.prayer_times_widget_featured
                "five_grid" -> R.layout.prayer_five_widget_grid
                "five_featured" -> R.layout.prayer_five_widget_featured
                "classic" -> if(compressedClassic)R.layout.prayer_times_widget_classic_compact else R.layout.prayer_times_widget_classic_next
                else -> R.layout.prayer_times_widget
            }
            val v=RemoteViews(c.packageName,if(layout=="classic")WidgetAppearance.counterLayout(c,kind,base) else base)
            val today=LocalDate.now()
            val rows=PrayerTimes.rows(c)
            val row=(0 until rows.length()).mapNotNull{rows.optJSONObject(it)}.firstOrNull{
                it.optInt("gregorian_month")==today.monthValue && it.optInt("gregorian_day")==today.dayOfMonth}
            val items=listOf("fajr" to R.id.widget_times_fajr, "dhuhr" to R.id.widget_times_dhuhr,
                "asr" to R.id.widget_times_asr, "maghrib" to R.id.widget_times_maghrib,
                "isha" to R.id.widget_times_isha)
            val labels=mutableMapOf<Int,Pair<String,Float>>(R.id.widget_times_header to ("مواقيت الصلاة اليوم" to if(compact)16f else 19f))
            val numberLabels=mutableMapOf<Int,Pair<String,Float>>()
            val cellData=mutableListOf<Triple<Int,String,String>>()
            if (layout!="classic") {
                val all=listOf("fajr" to R.id.widget_times_fajr, "sunrise" to R.id.widget_times_sunrise,
                    "dhuhr" to R.id.widget_times_dhuhr, "asr" to R.id.widget_times_asr,
                    "maghrib" to R.id.widget_times_maghrib, "isha" to R.id.widget_times_isha)
                for ((prayer,id) in all) {
                    val minutes=row?.let{PrayerTimes.minutes(it.optString(prayer),prayer)}
                    val name=if(prayer=="sunrise") "الشروق" else PrayerTimes.names[prayer] ?: prayer
                    labels[id]="$name\n${minutes?.let(::display) ?: "—"}" to if(compact)14f else 15f
                    cellData.add(Triple(id,name,minutes?.let(::display) ?: "—"))
                }
            }
            if (layout=="classic") {
                val now=System.currentTimeMillis()
                val next=PrayerTimes.events(c).firstOrNull{it.at>now}
                labels[R.id.widget_times_next_label]=(if(next==null) "الصلاة القادمة" else "باقي على صلاة ${PrayerTimes.names[next.id]}") to if(compressedClassic)12f else 17f
                v.setChronometer(R.id.widget_times_next_counter,
                    SystemClock.elapsedRealtime()+((next?.at?:now)-now),"%s",next!=null)
                v.setChronometerCountDown(R.id.widget_times_next_counter,true)
                if(next==null)v.setTextViewText(R.id.widget_times_next_counter,"--:--")
                val names=listOf("fajr" to R.id.widget_times_fajr,
                    "sunrise" to R.id.widget_times_sunrise,"dhuhr" to R.id.widget_times_dhuhr,
                    "asr" to R.id.widget_times_asr,"maghrib" to R.id.widget_times_maghrib,
                    "isha" to R.id.widget_times_isha)
                val clockIds=listOf(R.id.widget_time_clock_fajr,R.id.widget_time_clock_sunrise,
                    R.id.widget_time_clock_dhuhr,R.id.widget_time_clock_asr,
                    R.id.widget_time_clock_maghrib,R.id.widget_time_clock_isha)
                val rowIds=listOf(R.id.widget_times_row_fajr,R.id.widget_times_row_sunrise,
                    R.id.widget_times_row_dhuhr,R.id.widget_times_row_asr,
                    R.id.widget_times_row_maghrib,R.id.widget_times_row_isha)
                names.forEachIndexed{index,(prayer,id)->
                    val minutes=row?.let{PrayerTimes.minutes(it.optString(prayer),prayer)}
                    labels[id]=(if(prayer=="sunrise")"الشروق" else PrayerTimes.names[prayer] ?: prayer) to if(compressedClassic)12f else 16f
                    numberLabels[clockIds[index]]=(minutes?.let(::display) ?: "—") to if(compressedClassic)12f else 17f
                    // RemoteViews updates can reuse the old launcher views. Clear every row
                    // before applying the sole upcoming prayer background.
                    v.setInt(rowIds[index],"setBackgroundResource",
                        if(prayer==next?.id)R.drawable.aoqat_times_upcoming_row else android.R.color.transparent)
                }
            }
            WidgetAppearance.decorate(c,v,R.id.widget_times_card,labels,kind)
            if(layout=="classic"){
                for((id,number) in numberLabels)
                    WidgetAppearance.decorateNumber(c,v,id,kind,number.first,number.second)
                WidgetAppearance.decorateCounter(c,v,R.id.widget_times_next_counter,kind,if(compressedClassic)15f else 20f)
            }else{
                for((id,name,time) in cellData)
                    WidgetAppearance.decorateCell(c,v,id,kind,name,time,if(compact)14f else 15f)
            }
            v.setOnClickPendingIntent(R.id.widget_times_root,PendingIntent.getActivity(c,60530,
                Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){PrayerWidget.update(c);AdhanSchedule.schedule(c)}
    override fun onAppWidgetOptionsChanged(c:Context,m:AppWidgetManager,id:Int,options:Bundle){PrayerWidget.update(c)}
    override fun onDeleted(c:Context,ids:IntArray){AdhanSchedule.schedule(c)}
}

class FivePrayerCompactWidget:AppWidgetProvider(){
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){PrayerWidget.update(c)}
    override fun onAppWidgetOptionsChanged(c:Context,m:AppWidgetManager,id:Int,options:Bundle){PrayerWidget.update(c)}
}
class FivePrayerFeaturedWidget:AppWidgetProvider(){
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){PrayerWidget.update(c)}
    override fun onAppWidgetOptionsChanged(c:Context,m:AppWidgetManager,id:Int,options:Bundle){PrayerWidget.update(c)}
}

/**
 * Counts down to the next iqama and, during the existing native cycle,
 * shows the same before/after zero point as the persistent iqama notification.
 */
class IqamaCountdownWidget:AppWidgetProvider(){
    companion object{
        /**
         * Independently calculate the two native phases from saved prayer times.
         * A launcher widget must not depend on an iqama notification appearing;
         * that notification can be blocked by the device or user.
         */
        fun views(c:Context,compact:Boolean=false):RemoteViews{
            val base=if(compact)R.layout.prayer_iqama_widget_compact else R.layout.prayer_iqama_widget
            val v=RemoteViews(c.packageName,WidgetAppearance.counterLayout(c,"iqama",base))
            val now=System.currentTimeMillis()
            val active=if(IqamaNativeScheduler.enabled(c)){
                PrayerTimes.events(c,LocalDate.now().minusDays(1)).lastOrNull{event->
                    val d=IqamaNativeScheduler.durations(c,event.id)
                    !FridaySchedule.suppress(c,event.id,event.at) &&
                        now>=event.at && now<event.at+d.totalMs
                }
            }else null
            val next=if(active==null)PrayerTimes.events(c).firstOrNull{it.at>now} else null
            val prayerName=PrayerTimes.names[active?.id ?: next?.id] ?: ""
            val caption=when {
                !IqamaNativeScheduler.enabled(c) -> "إعداد الإقامة متوقف"
                active==null && next!=null -> ""
                active==null -> "لا توجد مواقيت محفوظة"
                else -> "الإقامة — ${PrayerTimes.names[active.id]}"
            }
            val titles=mapOf(
                R.id.widget_iqama_prayer to (prayerName to if(compact)23f else 25f),
                R.id.widget_iqama_before_title to ("باقي على الإقامة" to if(compact)17f else 19f),
                R.id.widget_iqama_elapsed_title to ("مضى على الإقامة" to if(compact)17f else 19f),
                R.id.widget_iqama_state to (caption to if(compact)11f else 13f)
            )
            WidgetAppearance.decorate(c,v,if(compact) R.id.widget_iqama_card else R.id.widget_iqama_root,titles,"iqama")
            // Hide the explanatory footer in the home widget: the two counters are self-explanatory.
            v.setViewVisibility(R.id.widget_iqama_state,android.view.View.GONE)
            val beforeId=R.id.widget_iqama_before_counter
            val elapsedId=R.id.widget_iqama_elapsed_counter
            fun stopped(id:Int) {
                v.setChronometer(id,SystemClock.elapsedRealtime(),"%s",false)
                v.setTextViewText(id,"00:00")
            }
            if(active!=null){
                val threshold=active.at+IqamaNativeScheduler.durations(c,active.id).beforeMs
                if(now<threshold){
                    v.setChronometer(beforeId,SystemClock.elapsedRealtime()+(threshold-now),"%s",true)
                    v.setChronometerCountDown(beforeId,true)
                    stopped(elapsedId)
                }else{
                    stopped(beforeId)
                    v.setChronometer(elapsedId,SystemClock.elapsedRealtime()-(now-threshold),"%s",true)
                    v.setChronometerCountDown(elapsedId,false)
                }
            }else{
                stopped(beforeId)
                stopped(elapsedId)
            }
            WidgetAppearance.decorateCounter(c,v,beforeId,"iqama",if(compact)21f else 29f)
            WidgetAppearance.decorateCounter(c,v,elapsedId,"iqama",if(compact)21f else 29f)
            v.setOnClickPendingIntent(R.id.widget_iqama_root,PendingIntent.getActivity(c,60531,
                Intent(c,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
    override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){PrayerWidget.update(c);AdhanSchedule.schedule(c)}
    override fun onAppWidgetOptionsChanged(c:Context,m:AppWidgetManager,id:Int,options:Bundle){PrayerWidget.update(c)}
    override fun onDeleted(c:Context,ids:IntArray){AdhanSchedule.schedule(c)}
}

class NextPrayerService:Service(){
    companion object {
        const val LOCK_CHANNEL = "next_prayer_lockscreen_v2"
        const val NOTIFICATION_ID = 60502
        fun wanted(c:Context):Boolean =
            AdhanSchedule.settings(c).optBoolean("persistent") &&
                (BuildConfig.OWNER_PILOT_ENABLED || !LockScreenPrayer.enabled(c))
        fun start(c:Context) {
            if(!wanted(c))return
            if (BuildConfig.OWNER_PILOT_ENABLED) {
                // Foreground-service starts from BOOT_COMPLETED and on package
                // replacement are restricted on recent Android/OEM builds.
                // This silent native notification is driven by saved consent
                // and AlarmManager, not WebView or an Activity.
                if (!LockScreenPrayer.notificationsAllowed(c)) return
                try {
                    (c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                        .notify(NOTIFICATION_ID,lockNotification(c,true))
                    LockScreenIqamaBoundaryReceiver.schedule(c)
                } catch (e:Exception) {
                    android.util.Log.w("NextPrayer","Pilot notification post failed",e)
                }
                return
            }
            try {
                androidx.core.content.ContextCompat.startForegroundService(
                    c,Intent(c,NextPrayerService::class.java))
            } catch(e:Exception) {
                android.util.Log.w("NextPrayer","Cannot start background notification",e)
            }
        }
        /** Android's native live countdown is readable on lock screens where
         * the owner allows public notification contents. No audio or wakeups. */
        fun lockNotification(c:Context, persistent:Boolean=false):Notification {
            val manager=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(NotificationChannel(
                LOCK_CHANNEL,"الصلاة القادمة على شاشة القفل",NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                setSound(null,null)
                enableVibration(false)
                setShowBadge(false)
                lockscreenVisibility=Notification.VISIBILITY_PUBLIC
                description="إشعار ثابت وصامت بمواقيت الصلاة وعدّاد رقمي متجدد"
            })
            val now=System.currentTimeMillis()
            val next=PrayerTimes.events(c).firstOrNull{it.at>now}
            val prayerName=next?.let{PrayerTimes.names[it.id]}?:"الصلاة القادمة"
            val title=if(next!=null)"باقي على صلاة $prayerName" else "مواقيت الصلاة في الحويجة"
            val remain=((next?.at?:now)-now).coerceAtLeast(0L)
            val seconds=(remain+999L)/1000L
            val fallback=if(next==null)"--:--:--" else String.format(java.util.Locale.US,
                "%02d:%02d:%02d",seconds/3600L,seconds/60L%60L,seconds%60L)
            // Only one short supplemental line: iqama or Friday, never both.
            // Android's own chronometer counts without WebView or polling.
            val extra=LockScreenSupplement.current(c,now)
            val extraMs=extra?.elapsedMillis(now)?:0L
            val extraSeconds=(extraMs+999L)/1000L
            val extraClock=String.format(java.util.Locale.US,"%02d:%02d",
                extraSeconds/60L,extraSeconds%60L)
            val lockDetail=if(extra!=null)"${extra.title} $extraClock" else ""
            val description=if(extra!=null)"$fallback • $lockDetail" else "$fallback — أوقات الصلاة في الحويجة"
            val views=RemoteViews(c.packageName,R.layout.notification_lock_next)
            if (BuildConfig.OWNER_PILOT_ENABLED) {
                // Custom RemoteViews otherwise inherit a dark teal XML color
                // even when the phone displays a dark notification surface.
                val dark = (c.resources.configuration.uiMode and
                    android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
                    android.content.res.Configuration.UI_MODE_NIGHT_YES
                val cardText = if (dark) Color.WHITE else Color.rgb(23,55,71)
                for (id in intArrayOf(R.id.lock_prayer_title,
                    R.id.lock_prayer_clock,R.id.lock_prayer_fallback,
                    R.id.lock_iqama_title,R.id.lock_iqama_clock)) {
                    views.setTextColor(id,cardText)
                }
            }
            views.setTextViewText(R.id.lock_prayer_title,title)
            views.setTextViewText(R.id.lock_prayer_fallback,fallback)
            if(BuildConfig.OWNER_PILOT_ENABLED){
                // Both colored symbols are owned by the SAME custom layout:
                // same right-hand icon column, same size, different rows.
                // The required Android small icon stays monochrome in the
                // separate notification header to avoid a third colored symbol.
                views.setViewVisibility(R.id.lock_prayer_state_icon,android.view.View.VISIBLE)
                views.setImageViewResource(R.id.lock_prayer_state_icon,R.drawable.pilot_notify_exact_wait)
                views.setViewVisibility(R.id.lock_iqama_state_icon,
                    if(extra!=null)android.view.View.VISIBLE else android.view.View.GONE)
                if(extra!=null){
                    views.setImageViewResource(R.id.lock_iqama_state_icon,
                        if(extra.countDown)R.drawable.pilot_notify_exact_wait else R.drawable.pilot_notify_exact_elapsed)
                }
            }else{
                views.setViewVisibility(R.id.lock_prayer_state_icon,android.view.View.GONE)
                views.setViewVisibility(R.id.lock_iqama_state_icon,android.view.View.GONE)
            }
            views.setViewVisibility(R.id.lock_iqama_row,
                if(extra!=null)android.view.View.VISIBLE else android.view.View.GONE)
            if(extra!=null){
                views.setTextViewText(R.id.lock_iqama_title,extra.title)
                views.setChronometer(R.id.lock_iqama_clock,
                    if(extra.countDown)
                        SystemClock.elapsedRealtime()+extraMs
                    else SystemClock.elapsedRealtime()-extraMs,
                    "%s",true)
                views.setChronometerCountDown(R.id.lock_iqama_clock,extra.countDown)
            }

            if(next!=null){
                views.setViewVisibility(R.id.lock_prayer_clock,android.view.View.VISIBLE)
                views.setViewVisibility(R.id.lock_prayer_fallback,android.view.View.GONE)
                views.setChronometer(R.id.lock_prayer_clock,
                    SystemClock.elapsedRealtime()+remain,"%s",true)
                views.setChronometerCountDown(R.id.lock_prayer_clock,true)
            }else{
                views.setViewVisibility(R.id.lock_prayer_clock,android.view.View.GONE)
                views.setViewVisibility(R.id.lock_prayer_fallback,android.view.View.VISIBLE)
            }

            // Keep equal-sized colored icons on two aligned right-side rows:
            // top is always next-prayer waiting; bottom follows only the
            // active iqama / Friday phase and disappears with its countdown.
            // The fixed-width left clock columns do not move with title length.
            // Both enabled notification surfaces use the EXACT SAME two-row
            // RemoteViews. Android's ordinary notification panel must not
            // hide the supplemental line while the lock-screen shows it.
            // The second symbol, label and chronometer all share one
            // visibility condition (extra != null) in 'views' above.
            val compactViews = views
            // Android's mandatory system notification icon is independent
            // of the custom counter row. The colored top icon always means
            // next prayer, and the optional lower icon follows extra.countDown.
            // Never repeat the orange hourglass in the system header and row.
            val tap=PendingIntent.getActivity(c,60501,Intent(c,MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            val public=Notification.Builder(c,LOCK_CHANNEL)
                .setSmallIcon(if(BuildConfig.OWNER_PILOT_ENABLED)
                    PilotNotificationIcons.smallAppMarker()
                    else android.R.drawable.ic_lock_idle_alarm)
                // Keep Android's required status icon in its normal header.
                // DecoratedCustomViewStyle promotes that icon to a second,
                // large, button-looking tile on Honor's lock screen. The
                // ORIGINAL phase artwork is already rendered once beside
                // each active countdown in notification_lock_next.xml.
                .setContentTitle(if(BuildConfig.OWNER_PILOT_ENABLED) "أوقات الصلاة في الحويجة" else title)
                .setContentText(if(BuildConfig.OWNER_PILOT_ENABLED) "" else description)
                .setShowWhen(!BuildConfig.OWNER_PILOT_ENABLED && next!=null)
                .setWhen(next?.at?:now)
                .setUsesChronometer(!BuildConfig.OWNER_PILOT_ENABLED && next!=null)
                .setChronometerCountDown(true)
                .setCustomContentView(compactViews)
                .setCustomBigContentView(views)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setOnlyAlertOnce(true)
                .build()
            return Notification.Builder(c,LOCK_CHANNEL)
                .setSmallIcon(if(BuildConfig.OWNER_PILOT_ENABLED)
                    PilotNotificationIcons.smallAppMarker()
                    else android.R.drawable.ic_lock_idle_alarm)
                // Keep Android's required status icon in its normal header.
                // DecoratedCustomViewStyle promotes that icon to a second,
                // large, button-looking tile on Honor's lock screen. The
                // ORIGINAL phase artwork is already rendered once beside
                // each active countdown in notification_lock_next.xml.
                .setContentTitle(if(BuildConfig.OWNER_PILOT_ENABLED) "أوقات الصلاة في الحويجة" else title)
                .setContentText(if(BuildConfig.OWNER_PILOT_ENABLED) "" else description)
                .setShowWhen(!BuildConfig.OWNER_PILOT_ENABLED && next!=null)
                .setWhen(next?.at?:now)
                .setUsesChronometer(!BuildConfig.OWNER_PILOT_ENABLED && next!=null)
                .setChronometerCountDown(true)
                .setCustomContentView(compactViews)
                .setCustomBigContentView(views)
                .setPublicVersion(public)
                .setCategory(Notification.CATEGORY_STATUS)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setDeleteIntent(LockScreenIqamaBoundaryReceiver.deleteIntent(c))
                .setContentIntent(tap)
                .build()
        }
    }
    override fun onBind(i:Intent?) : IBinder?=null
    override fun onStartCommand(i:Intent?,flags:Int,startId:Int):Int {
        if(!wanted(this)){stopSelf();return START_NOT_STICKY}
        // The old "persistent next prayer" toggle is still supported; for the
        // isolated owner-pilot APK render it with the SAME new colored card as
        // the optional lock-screen notification. Previously this branch used
        // the legacy clock icon and hid all the selected state icons.
        val n=if(BuildConfig.OWNER_PILOT_ENABLED || LockScreenPrayer.enabled(this))lockNotification(this,BuildConfig.OWNER_PILOT_ENABLED) else {
            val nm=getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(NotificationChannel(
                "next_prayer","الصلاة القادمة",NotificationManager.IMPORTANCE_LOW
            ).apply{setSound(null,null)})
            val views=PrayerWidget.views(this,true)
            Notification.Builder(this,"next_prayer")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("الصلاة القادمة")
                .setCustomContentView(views).setCustomBigContentView(views)
                .setPublicVersion(Notification.Builder(this,"next_prayer")
                    .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                    .setCustomContentView(views).build())
                .setVisibility(Notification.VISIBILITY_PUBLIC).setOngoing(true)
                .setOnlyAlertOnce(true)
                .setContentIntent(PendingIntent.getActivity(this,60501,
                    Intent(this,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE))
                .build()
        }
        startForeground(NOTIFICATION_ID,n)
        // Native phase boundaries must update the already-visible foreground
        // notification, not just the separate opt-in lock-screen notification.
        if (BuildConfig.OWNER_PILOT_ENABLED) LockScreenIqamaBoundaryReceiver.schedule(this)
        return START_STICKY
    }
    override fun onDestroy(){stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy()}
}
