package com.aoqat.calendar

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray

/**
 * Opt-in, temporary audio exception for a selected prayer under a user DND
 * schedule. Never permanently changes the user's scheduled DND rule.
 *
 * A recovery alarm is committed BEFORE lifting the interruption filter; if
 * Android kills both playback services, the previous filter is still restored.
 * Do not use this for the prayer notification-only path.
 */
object PrayerAudioDnd {
    private const val NAME="prayer_audio_dnd_session_v1"
    private const val SLOT=70888
    private const val MAX_MS=10L*60000L
    private const val ACTION="com.aoqat.calendar.RESTORE_DND_AUDIO"

    private fun pref(c:Context)=c.getSharedPreferences(NAME,Context.MODE_PRIVATE)
    private fun nm(c:Context)=c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    private fun pending(c:Context)=PendingIntent.getBroadcast(c,SLOT,
        Intent(c,PrayerAudioDndReceiver::class.java).setAction(ACTION),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    private fun schedule(c:Context,at:Long):Boolean {
        val am=c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if(Build.VERSION.SDK_INT>=31&&!am.canScheduleExactAlarms())return false
        return try{
            val show=PendingIntent.getActivity(c,SLOT,Intent(c,MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            am.setAlarmClock(AlarmManager.AlarmClockInfo(at,show),pending(c))
            true
        }catch(e:Exception){android.util.Log.w("PrayerAudioDnd","Cannot schedule DND recovery",e);false}
    }
    private fun cancel(c:Context){
        try {(c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pending(c))}
        catch(_:Exception){}
    }
    fun effectiveDndFilter(c:Context):Int {
        val p=pref(c)
        return if(p.getBoolean("active",false))
            p.getInt("previous",NotificationManager.INTERRUPTION_FILTER_ALL)
        else nm(c).currentInterruptionFilter
    }
    @Synchronized fun begin(c:Context,owner:String):Boolean {
        val n=nm(c);val p=pref(c)
        if(p.getBoolean("active",false)){
            val previous=p.getStringSet("owners",emptySet())?.toMutableSet()?:mutableSetOf()
            previous.add(owner)
            p.edit().putStringSet("owners",previous).commit()
            return true
        }
        val filter=n.currentInterruptionFilter
        if(filter==NotificationManager.INTERRUPTION_FILTER_ALL)return true
        if(!n.isNotificationPolicyAccessGranted)return false
        val end=System.currentTimeMillis()+MAX_MS
        if(!schedule(c,end))return false
        if(!p.edit().putBoolean("active",true).putInt("previous",filter)
            .putLong("until",end).putStringSet("owners",setOf(owner)).commit()) {
            cancel(c);return false
        }
        return try {
            n.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
            if(n.currentInterruptionFilter==NotificationManager.INTERRUPTION_FILTER_ALL)true
            else {p.edit().clear().commit();cancel(c);false}
        }catch(e:Exception){
            android.util.Log.w("PrayerAudioDnd","Android refused DND audio exception",e)
            p.edit().clear().commit();cancel(c);false
        }
    }
    @Synchronized fun end(c:Context,owner:String) {
        val p=pref(c)
        if(!p.getBoolean("active",false))return
        val owners=p.getStringSet("owners",emptySet())?.toMutableSet()?:mutableSetOf()
        owners.remove(owner)
        if(owners.isNotEmpty()){p.edit().putStringSet("owners",owners).commit();return}
        restore(c)
    }
    @Synchronized fun restore(c:Context) {
        val p=pref(c);if(!p.getBoolean("active",false))return
        val n=nm(c)
        val original=p.getInt("previous",NotificationManager.INTERRUPTION_FILTER_ALL)
        try{
            // The user may have changed DND manually during the audio.
            // Never overwrite a new filter selected by the user.
            if(n.currentInterruptionFilter==NotificationManager.INTERRUPTION_FILTER_ALL &&
                n.isNotificationPolicyAccessGranted)
                n.setInterruptionFilter(original)
            if(n.currentInterruptionFilter==original ||
               n.currentInterruptionFilter!=NotificationManager.INTERRUPTION_FILTER_ALL){
                p.edit().clear().commit();cancel(c);return
            }
        }catch(e:Exception){android.util.Log.w("PrayerAudioDnd","DND restore delayed",e)}
        if(!schedule(c,System.currentTimeMillis()+60000L))
            android.util.Log.e("PrayerAudioDnd","DND restore requires system alarm permission")
    }
    fun recover(c:Context) {
        val p=pref(c)
        if(p.getBoolean("active",false)){
            val until=p.getLong("until",0L)
            if(until<=System.currentTimeMillis())restore(c)
            else schedule(c,until)
        }
    }
}
class PrayerAudioDndReceiver:BroadcastReceiver(){
    override fun onReceive(context:Context,intent:Intent?) {
        PrayerAudioDnd.restore(context)
    }
}
