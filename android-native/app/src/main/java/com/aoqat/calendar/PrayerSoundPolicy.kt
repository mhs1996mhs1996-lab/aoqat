package com.aoqat.calendar

import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import org.json.JSONObject

/** Two separate user decisions for each prayer: bypass ringer silent and bypass DND. */
object PrayerSoundPolicy {
    fun allowed(settings:JSONObject,id:String,am:AudioManager,nm:NotificationManager):Boolean {
        val entry=settings.optJSONObject("soundPolicy")?.optJSONObject(id)
        val silent=entry?.optBoolean("silent",settings.optBoolean("overrideSilent",false))
            ?:settings.optBoolean("overrideSilent",false)
        val dnd=entry?.optBoolean("dnd",false)?:false
        if(am.ringerMode!=AudioManager.RINGER_MODE_NORMAL && !silent)return false
        if(nm.currentInterruptionFilter!=NotificationManager.INTERRUPTION_FILTER_ALL && !dnd)return false
        return true
    }
    fun enabledFor(settings:JSONObject,id:String,kind:String):Boolean {
        val entry=settings.optJSONObject("soundPolicy")?.optJSONObject(id)
        return entry?.optBoolean(kind,if(kind=="silent")settings.optBoolean("overrideSilent",false) else false)
            ?:if(kind=="silent")settings.optBoolean("overrideSilent",false) else false
    }
}
