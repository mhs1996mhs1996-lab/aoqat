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
        // DND is its own user mode. On some OEM phones DND automatically
        // reports RINGER_MODE_SILENT; in that case use the DND switch rather
        // than demanding both switches be on.
        if(nm.currentInterruptionFilter!=NotificationManager.INTERRUPTION_FILTER_ALL)
            return dnd
        return am.ringerMode==AudioManager.RINGER_MODE_NORMAL || silent
    }
    fun enabledFor(settings:JSONObject,id:String,kind:String):Boolean {
        val entry=settings.optJSONObject("soundPolicy")?.optJSONObject(id)
        return entry?.optBoolean(kind,if(kind=="silent")settings.optBoolean("overrideSilent",false) else false)
            ?:if(kind=="silent")settings.optBoolean("overrideSilent",false) else false
    }
}
