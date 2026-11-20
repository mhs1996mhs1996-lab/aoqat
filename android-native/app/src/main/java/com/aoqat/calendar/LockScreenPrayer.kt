package com.aoqat.calendar

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.os.SystemClock
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
            manager.notify(LOCK_NOTIFICATION_ID,NextPrayerService.lockNotification(c))
            LockScreenIqamaBoundaryReceiver.schedule(c)
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
            // Remove the previous service's separate notification before posting
            // the new lock-screen reminder; no FGS start is required.
            c.stopService(Intent(c,NextPrayerService::class.java))
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
        private fun pending(c:Context,flags:Int):PendingIntent?=
            PendingIntent.getBroadcast(c,REQUEST,
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

        fun cancel(c:Context){
            val alarm=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            pending(c,PendingIntent.FLAG_NO_CREATE)?.let { alarm.cancel(it);it.cancel() }
            repostIntent(c,PendingIntent.FLAG_NO_CREATE)?.let { alarm.cancel(it);it.cancel() }
        }

        // Android 14+ allows a user to dismiss even ongoing notifications.
        // For the explicitly opt-in lock-screen card, a dismissal requests a
        // delayed republish. Respect phone-level permission and channel blocks.
        private fun scheduleAfterSwipe(c:Context){
            if(!LockScreenPrayer.enabled(c) || !LockScreenPrayer.notificationsAllowed(c))return
            val pref=c.getSharedPreferences("lockscreen_prayer_v1",Context.MODE_PRIVATE)
            val now=System.currentTimeMillis()
            if(now-pref.getLong("lastSwipeRepost",0L) in 0L..14999L)return
            pref.edit().putLong("lastSwipeRepost",now).apply()
            val pi=repostIntent(c,PendingIntent.FLAG_UPDATE_CURRENT)?:return
            val alarm=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarm.set(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime()+8_000L,pi)
        }
        fun schedule(c:Context){
            cancel(c)
            if(!LockScreenPrayer.enabled(c))return
            val now=System.currentTimeMillis()
            // Schedule prayer start even when the WebView and service are closed.
            val boundary=LockScreenSupplement.nextRefreshAt(c,now)?:return
            val delay=boundary-now
            if(delay<=0L)return
            val pi=pending(c,PendingIntent.FLAG_UPDATE_CURRENT)?:return
            val alarm=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val at=SystemClock.elapsedRealtime()+delay
            if(Build.VERSION.SDK_INT<Build.VERSION_CODES.S||alarm.canScheduleExactAlarms())
                alarm.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,at,pi)
            else alarm.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,at,pi)
        }
    }
    override fun onReceive(c:Context,intent:Intent?){
        when(intent?.action){
            ACTION,REPOST -> if(LockScreenPrayer.enabled(c) && LockScreenPrayer.notificationsAllowed(c))
                LockScreenPrayer.showNow(c)
            DISMISSED -> scheduleAfterSwipe(c)
        }
    }
}
