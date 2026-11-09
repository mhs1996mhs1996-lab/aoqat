package com.aoqat.calendar

import android.Manifest
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
    fun enabled(c:Context):Boolean =
        c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getBoolean("enabled",false)

    fun notificationsAllowed(c:Context):Boolean {
        val manager=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return manager.areNotificationsEnabled() &&
            (Build.VERSION.SDK_INT<33 ||
                c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)
    }

    fun status(c:Context):String {
        val manager=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel=manager.getNotificationChannel(NextPrayerService.LOCK_CHANNEL)
        val active=try { manager.activeNotifications.any{it.id==NextPrayerService.NOTIFICATION_ID} }
            catch (_:Exception){false}
        return JSONObject()
            .put("enabled",enabled(c))
            .put("notificationsAllowed",notificationsAllowed(c))
            .put("channelAllowed",channel==null || channel.importance!=NotificationManager.IMPORTANCE_NONE)
            .put("channelImportance",channel?.importance ?: -1)
            .put("notificationActive",active)
            .toString()
    }

    /** Explicit foreground user action. Also posts a normal notification immediately
     * in case the OEM delays/rejects the foreground service launch. Same ID avoids
     * duplicates when the Android service successfully takes it over.
     */
    fun showNow(c:Context):Boolean {
        if(!enabled(c) || !notificationsAllowed(c))return false
        return try {
            val manager=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(NextPrayerService.NOTIFICATION_ID,NextPrayerService.lockNotification(c))
            NextPrayerService.start(c)
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
            if(notificationsAllowed(c))showNow(c)
        }else if(AdhanSchedule.settings(c).optBoolean("persistent")){
            NextPrayerService.start(c) // restore the user's original persistent prayer card
        }else{
            c.stopService(Intent(c,NextPrayerService::class.java))
            (c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .cancel(NextPrayerService.NOTIFICATION_ID)
        }
        AdhanSchedule.schedule(c)
        return true
    }
}
