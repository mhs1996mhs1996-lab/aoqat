package com.aoqat.calendar

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.os.SystemClock
import android.os.Handler
import android.os.Looper
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import org.json.JSONObject

/**
 * Opt-in lock-screen prayer notification for phones whose lock-screen editor
 * does not host third-party AppWidgets. The user can disable it at any time.
 * Respect Android 13+ notification consent and channel/lock-screen settings.
 */
object LockScreenPrayer {
    private const val PREFS="lockscreen_prayer_v1"
    const val LOCK_NOTIFICATION_ID=60503
    fun enabled(c:Context):Boolean =
        c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getBoolean("enabled",false)

    fun notificationsAllowed(c:Context):Boolean {
        val manager=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel=manager.getNotificationChannel(NextPrayerService.LOCK_CHANNEL)
        return manager.areNotificationsEnabled() &&
            (channel==null || channel.importance!=NotificationManager.IMPORTANCE_NONE) &&
            (Build.VERSION.SDK_INT<33 ||
                c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)
    }

    fun status(c:Context):String {
        val manager=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel=manager.getNotificationChannel(NextPrayerService.LOCK_CHANNEL)
        val active=try { manager.activeNotifications.any{it.id==LOCK_NOTIFICATION_ID} }
            catch (_:Exception){false}
        return JSONObject()
            .put("enabled",enabled(c))
            .put("notificationsAllowed",notificationsAllowed(c))
            .put("channelAllowed",channel==null || channel.importance!=NotificationManager.IMPORTANCE_NONE)
            .put("channelImportance",channel?.importance ?: -1)
            .put("notificationActive",active)
            .toString()
    }

    /** An ordinary ongoing notification survives the WebView and service lifecycle.
     * A foreground service is not needed for Android's native chronometer countdown.
     */
    fun showNow(c:Context):Boolean {
        if(!enabled(c) || !notificationsAllowed(c))return false
        return try {
            val manager=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val renderedAt=System.currentTimeMillis()
            manager.notify(LOCK_NOTIFICATION_ID,NextPrayerService.lockNotification(c, now=renderedAt))
            LockScreenIqamaBoundaryReceiver.schedule(c, renderedAt)
            true
        }catch(e:Exception){
            android.util.Log.w("LockScreenPrayer","Unable to post lock-screen notification",e)
            false
        }
    }

    fun configure(c:Context,on:Boolean):Boolean {
        if(!c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit()
                .putBoolean("enabled",on).commit())return false
        if(on){
            // Both toggles are independent in the owner's trial:
            // the ordinary next-prayer card and the opt-in lock-screen card
            // keep separate IDs and their own visual state symbols.
            if(!BuildConfig.OWNER_PILOT_ENABLED) {
                c.stopService(Intent(c,NextPrayerService::class.java))
            } else if(NextPrayerService.wanted(c)) {
                NextPrayerService.start(c)
            }
            // Hide a separate Friday countdown; its phases now share the
            // supplemental line in this one opt-in lock notification.
            c.stopService(Intent(c,FridayNotificationService::class.java))
            if(notificationsAllowed(c))showNow(c)
        }else{
            (c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .cancel(LOCK_NOTIFICATION_ID)
            LockScreenIqamaBoundaryReceiver.cancel(c)
            if(AdhanSchedule.settings(c).optBoolean("persistent"))
                NextPrayerService.start(c) // restore the user's former notification
            else c.stopService(Intent(c,NextPrayerService::class.java))
        }
        AdhanSchedule.schedule(c)
        return true
    }
}

/** Refreshes the ONE existing notification at iqama and Friday phase transitions. */
class LockScreenIqamaBoundaryReceiver:BroadcastReceiver() {
    companion object {
        private const val ACTION="com.aoqat.calendar.LOCK_IQAMA_BOUNDARY"
        private const val DISMISSED="com.aoqat.calendar.LOCK_DISMISSED"
        private const val REPOST="com.aoqat.calendar.LOCK_REPOST"
        private const val REQUEST=60533
        private const val DISMISS_REQUEST=60534
        private const val REPOST_REQUEST=60535
        private const val ACTIVE_REQUEST=60536
        private const val BOUNDARY_KEY="armed_boundary_at_v2"
        private val handler by lazy { Handler(Looper.getMainLooper()) }
        private var refreshTask:Runnable?=null
        private fun boundaryPrefs(c:Context)=
            c.getSharedPreferences("lockscreen_prayer_v1",Context.MODE_PRIVATE)

        // Never replace an overdue or earlier pending transition with a later
        // one merely because another component recalculated the schedule.
        internal fun earliestBoundary(planned:Long?,armed:Long):Long? =
            listOfNotNull(planned,armed.takeIf{it>0L}).minOrNull()

        private fun pending(c:Context,flags:Int,request:Int=REQUEST):PendingIntent?=
            PendingIntent.getBroadcast(c,request,
                Intent(c,LockScreenIqamaBoundaryReceiver::class.java).setAction(ACTION),
                flags or PendingIntent.FLAG_IMMUTABLE)
        fun deleteIntent(c:Context):PendingIntent =
            PendingIntent.getBroadcast(c,DISMISS_REQUEST,
                Intent(c,LockScreenIqamaBoundaryReceiver::class.java).setAction(DISMISSED),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        private fun repostIntent(c:Context,flags:Int):PendingIntent? =
            PendingIntent.getBroadcast(c,REPOST_REQUEST,
                Intent(c,LockScreenIqamaBoundaryReceiver::class.java).setAction(REPOST),
                flags or PendingIntent.FLAG_IMMUTABLE)

        @Synchronized private fun cancelBoundary(c:Context){
            val alarm=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            for(request in listOf(REQUEST,ACTIVE_REQUEST))
                pending(c,PendingIntent.FLAG_NO_CREATE,request)?.let { alarm.cancel(it);it.cancel() }
            refreshTask?.let { handler.removeCallbacks(it) }
            refreshTask=null
            boundaryPrefs(c).edit().remove(BOUNDARY_KEY).apply()
        }
        fun cancel(c:Context){
            cancelBoundary(c)
            val alarm=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            repostIntent(c,PendingIntent.FLAG_NO_CREATE)?.let { alarm.cancel(it);it.cancel() }
        }

        // Android 14+ allows a user to dismiss even ongoing notifications.
        // For the explicitly opt-in lock-screen card, a dismissal requests a
        // delayed republish. Respect phone-level permission and channel blocks.
        private fun usesPilotPersistentCard(c:Context):Boolean =
            BuildConfig.OWNER_PILOT_ENABLED && NextPrayerService.wanted(c)

        private fun scheduleAfterSwipe(c:Context){
            // On Android 14+ a user can also dismiss an ongoing foreground
            // notification. Repost only if they already opted in to that card.
            if((!LockScreenPrayer.enabled(c) && !usesPilotPersistentCard(c)) ||
                !LockScreenPrayer.notificationsAllowed(c))return
            val pref=c.getSharedPreferences("lockscreen_prayer_v1",Context.MODE_PRIVATE)
            val now=System.currentTimeMillis()
            if(now-pref.getLong("lastSwipeRepost",0L) in 0L..14999L)return
            pref.edit().putLong("lastSwipeRepost",now).apply()
            val pi=repostIntent(c,PendingIntent.FLAG_UPDATE_CURRENT)?:return
            val alarm=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val at=SystemClock.elapsedRealtime()+4_000L
            if(Build.VERSION.SDK_INT<Build.VERSION_CODES.S||alarm.canScheduleExactAlarms())
                alarm.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,at,pi)
            else alarm.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,at,pi)
        }
        @Synchronized fun schedule(c:Context,renderedAt:Long=System.currentTimeMillis()){
            if(!LockScreenPrayer.enabled(c) && !usesPilotPersistentCard(c)){
                cancelBoundary(c)
                return
            }
            // Use the same timestamp as the rendered card when available.
            // A notification rendered just before zero must not lose its
            // zero transition if AlarmManager is armed just after zero.
            val phase=LockScreenSupplement.nextRefreshAt(c,renderedAt)
            val safety=if(BuildConfig.OWNER_PILOT_ENABLED) renderedAt+10*60_000L else null
            val adhanIconEnd=if(BuildConfig.OWNER_PILOT_ENABLED)
                PrayerTimes.events(c,java.time.LocalDate.now().minusDays(1))
                    .asSequence().map { it.at+90_000L }
                    .filter { it>renderedAt && it<=renderedAt+90_000L }.minOrNull()
                else null
            val planned=listOfNotNull(phase,safety,adhanIconEnd).minOrNull()
            val armed=boundaryPrefs(c).getLong(BOUNDARY_KEY,0L)
            val boundary=earliestBoundary(planned,armed)?:return
            val now=System.currentTimeMillis()
            val delay=(boundary-now).coerceAtLeast(1L)
            val context=c.applicationContext

            // A handler provides a live-process fallback. A separate regular
            // exact alarm covers active-device delivery without the
            // allow-while-idle quota. Keep the wakeup alarm for sleep/Doze.
            refreshTask?.let { handler.removeCallbacks(it) }
            val task=Runnable { refresh(context) }
            refreshTask=task
            handler.postDelayed(task,delay)
            val existing=pending(c,PendingIntent.FLAG_NO_CREATE)
            val existingActive=pending(c,PendingIntent.FLAG_NO_CREATE,ACTIVE_REQUEST)
            if(armed==boundary && boundary>now && existing!=null && existingActive!=null)return

            val alarm=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val idle=pending(c,PendingIntent.FLAG_UPDATE_CURRENT)?:return
            val active=pending(c,PendingIntent.FLAG_UPDATE_CURRENT,ACTIVE_REQUEST)?:return
            val at=SystemClock.elapsedRealtime()+delay
            boundaryPrefs(c).edit().putLong(BOUNDARY_KEY,boundary).apply()
            val exact=Build.VERSION.SDK_INT<Build.VERSION_CODES.S||alarm.canScheduleExactAlarms()
            try {
                if(exact) {
                    alarm.setExact(AlarmManager.ELAPSED_REALTIME,at,active)
                    alarm.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,at,idle)
                } else {
                    alarm.set(AlarmManager.ELAPSED_REALTIME,at,active)
                    alarm.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,at,idle)
                }
            } catch (_:SecurityException) {
                // Permission may change between the check and scheduling.
                alarm.set(AlarmManager.ELAPSED_REALTIME,at,active)
                alarm.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,at,idle)
            }
        }
        private fun refresh(c:Context){
            // All three delivery routes converge here; clear the consumed
            // transition before rendering the current phase and arming its end.
            cancelBoundary(c)
            if(!LockScreenPrayer.notificationsAllowed(c))return
            if(LockScreenPrayer.enabled(c)) LockScreenPrayer.showNow(c)
            if(usesPilotPersistentCard(c)) NextPrayerService.start(c)
        }
    }
    override fun onReceive(c:Context,intent:Intent?){
        when(intent?.action){
            ACTION,REPOST -> refresh(c)
            DISMISSED -> scheduleAfterSwipe(c)
        }
    }
}
