package com.aoqat.calendar

import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import org.json.JSONObject

/**
 * Two per-prayer switches shared by ADHAN and PRAYER ALARM.
 * Legacy settings remain compatible until the user first saves audibility.
 * DND and ringer mode are independent; both permissions are required when
 * both states are active. The Android notification-only service is independent.
 */
object PrayerSoundPolicy {
    fun chosen(settings:JSONObject, id:String, kind:String, forAlarm:Boolean=false):Boolean {
        if(id !in PrayerTimes.ids) return true
        val selection=settings.optJSONObject("audibility")?.optJSONObject(id)
        if(selection!=null) return selection.optBoolean(kind,false)
        // Preserve behaviour for existing installations until preferences migrate.
        return if(forAlarm) true else if(kind=="silent") settings.optBoolean("overrideSilent",false) else true
    }

    fun allowed(c:Context, id:String, forAlarm:Boolean=false):Boolean {
        if(id !in PrayerTimes.ids) return true // Friday, last-third keep existing behaviour
        val config=AdhanSchedule.settings(c)
        val audio=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val dnd=nm.currentInterruptionFilter!=NotificationManager.INTERRUPTION_FILTER_ALL
        val silent=audio.ringerMode!=AudioManager.RINGER_MODE_NORMAL
        // App-owned silent-at-adhan must not prevent an independently enabled
        // adhan recording; user-set silent mode still follows the switch.
        val owned= !forAlarm && AtAdhanQuiet.ownsActiveRinger(c,id,
            c.getSharedPreferences("adhan_settings",Context.MODE_PRIVATE).getLong("expectedPrayerAt",0L))
        return (!silent || owned || chosen(config,id,"silent",forAlarm)) &&
            (!dnd || chosen(config,id,"dnd",forAlarm))
    }

    fun status(c:Context):JSONObject {
        val audio=c.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val nm=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return JSONObject().put("ringer",audio.ringerMode)
            .put("dnd",nm.currentInterruptionFilter)
            .put("policyPermission",nm.isNotificationPolicyAccessGranted)
    }
}
