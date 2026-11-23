package com.aoqat.calendar

import android.content.Context
import android.graphics.Color
import android.util.TypedValue
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * B151: Persist individual lock-notification typography per prayer/iqama/Friday
 * countdown. Only existing RemoteViews are styled. No new services, channels,
 * permissions, clocks, sounds, alarms or user-data migrations are introduced.
 */
object LockScreenTextStyle {
    private const val PREFS = "aoqat_lock_notification_text_style_v1"
    private val STATES = setOf(
        "prayer", "iqama_wait", "iqama_elapsed",
        "friday_first", "sermon_wait", "sermon_elapsed"
    )
    data class Style(val title:Int, val clock:Int, val color:Int)
    fun validState(state:String):Boolean = state in STATES

    private fun defaults(state:String):Style =
        if(state == "prayer") Style(16,17,2) else Style(15,16,2)

    fun read(c:Context,state:String):JSONObject {
        require(validState(state)) { "Invalid notification state" }
        val fallback=defaults(state)
        val prefs=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
        return JSONObject()
            .put("title",prefs.getInt(state+"_title",fallback.title).coerceIn(12,24))
            .put("clock",prefs.getInt(state+"_clock",fallback.clock).coerceIn(12,24))
            .put("color",prefs.getInt(state+"_color",fallback.color).coerceIn(0,3))
    }
    fun configure(c:Context,state:String,title:Int,clock:Int,color:Int):Boolean {
        if(!validState(state)||title !in 12..24||clock !in 12..24||color !in 0..3)return false
        val ok=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit()
            .putInt(state+"_title",title)
            .putInt(state+"_clock",clock)
            .putInt(state+"_color",color)
            .commit()
        if(ok && LockScreenPrayer.enabled(c))LockScreenPrayer.showNow(c)
        return ok
    }
    private fun stored(c:Context,state:String):Style? {
        if(!validState(state))return null
        val prefs=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
        if(!prefs.contains(state+"_title"))return null
        return Style(
            prefs.getInt(state+"_title",16).coerceIn(12,24),
            prefs.getInt(state+"_clock",17).coerceIn(12,24),
            prefs.getInt(state+"_color",2).coerceIn(0,3)
        )
    }
    private fun textColor(index:Int):Int = when(index){
        0->Color.WHITE
        1->Color.rgb(255,243,213)
        3->Color.BLACK
        else->Color.rgb(23,55,71)
    }
    private fun style(view:RemoteViews,titleId:Int,clockId:Int,style:Style,otherClockId:Int?=null){
        view.setTextViewTextSize(titleId,TypedValue.COMPLEX_UNIT_SP,style.title.toFloat())
        view.setTextViewTextSize(clockId,TypedValue.COMPLEX_UNIT_SP,style.clock.toFloat())
        view.setTextColor(titleId,textColor(style.color))
        view.setTextColor(clockId,textColor(style.color))
        if(otherClockId!=null){
            view.setTextViewTextSize(otherClockId,TypedValue.COMPLEX_UNIT_SP,style.clock.toFloat())
            view.setTextColor(otherClockId,textColor(style.color))
        }
    }
    fun applyPrayer(c:Context,view:RemoteViews,iqamaPhase:LockScreenIqama.Phase?){
        stored(c,"prayer")?.let { style(view,R.id.lock_prayer_title,R.id.lock_prayer_clock,it,R.id.lock_prayer_fallback) }
        val state=when(iqamaPhase){
            LockScreenIqama.Phase.REMAINING -> "iqama_wait"
            LockScreenIqama.Phase.ELAPSED -> "iqama_elapsed"
            null -> null
        }
        state?.let{stored(c,it)}?.let{style(view,R.id.lock_iqama_title,R.id.lock_iqama_clock,it)}
    }
    fun applyIqama(c:Context,view:RemoteViews,title:String) {
        val state=when(title){
            "باقي على الإقامة"->"iqama_wait"
            "مضى على الإقامة"->"iqama_elapsed"
            "باقي على أذان الجمعة الأول"->"friday_first"
            "باقي على الخطبة"->"sermon_wait"
            "مضى على الخطبة"->"sermon_elapsed"
            else->null
        }
        state?.let { stored(c,it) }?.let { style(view,R.id.iqama_state,R.id.iqama_chronometer,it) }
    }
}
