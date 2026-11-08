package com.aoqat.calendar

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.text.style.RelativeSizeSpan
import android.text.style.StyleSpan
import android.text.style.TypefaceSpan
import android.util.TypedValue
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * Isolated styling for the six existing launcher widgets.
 * Labels and numbers have distinct fonts, sizes, weights and colors.
 * No prayer times, alarms, notifications or Quran content is changed.
 */
object WidgetAppearance {
    private const val KEY = "appearance"
    private val ids = setOf("next","times","five_grid","five_featured","iqama","combined")
    private val backgrounds = setOf("transparent","mist","blue","dark","cream")
    private val fonts = setOf("sans","serif","condensed","medium")
    private val weights = setOf("normal","bold")
    private val namedColors = mapOf(
        "white" to "#ffffff", "ivory" to "#fff6d6", "gold" to "#ffdb80",
        "navy" to "#123143", "black" to "#1c2327", "emerald" to "#237f60"
    )

    private fun fontDefaults(color:String, font:String, size:Int):JSONObject =
        JSONObject().put("font",font).put("size",size).put("weight","bold").put("color",color)

    fun defaults(id:String):JSONObject = JSONObject()
        .put("background",if(id=="times" || id=="combined")"mist" else "transparent")
        .put("color","white").put("font","sans").put("scale",105)
        .put("layout",if(id=="times")"classic" else "classic")
        .put("labels",fontDefaults("white","sans",105))
        .put("numbers",fontDefaults("white","sans",105))

    private fun prefs(c:Context) = c.getSharedPreferences("aoqat_widget_appearance_v1",Context.MODE_PRIVATE)
    private fun validColor(value:String):Boolean = value in namedColors ||
        Regex("^#[0-9a-fA-F]{6}$").matches(value)

    private fun normalizeGroup(input:JSONObject?,legacyColor:String,legacyFont:String,legacyScale:Int):JSONObject {
        val value=input ?: JSONObject()
        val group=fontDefaults(legacyColor,legacyFont,legacyScale)
        val font=value.optString("font","")
        if(font in fonts)group.put("font",font)
        val weight=value.optString("weight","")
        if(weight in weights)group.put("weight",weight)
        val color=value.optString("color","")
        if(validColor(color))group.put("color",color)
        if(value.has("size"))group.put("size",value.optInt("size",105).coerceIn(65,170))
        return group
    }
    fun normalized(id:String,input:JSONObject):JSONObject {
        val out=defaults(id)
        val bg=input.optString("background","")
        if(bg in backgrounds)out.put("background",bg)
        val color=input.optString("color","")
        val font=input.optString("font","")
        if(validColor(color))out.put("color",color)
        if(font in fonts)out.put("font",font)
        val scale=input.optInt("scale",105).coerceIn(75,145)
        out.put("scale",scale)
        if(id=="times" && input.optString("layout") in setOf("classic","grid","featured"))out.put("layout",input.optString("layout"))
        out.put("labels",normalizeGroup(input.optJSONObject("labels"),out.optString("color","white"),
            out.optString("font","sans"),scale))
        out.put("numbers",normalizeGroup(input.optJSONObject("numbers"),out.optString("color","white"),
            out.optString("font","sans"),scale))
        return out
    }
    fun all(c:Context):JSONObject {
        val saved=try{JSONObject(prefs(c).getString(KEY,"{}"))}catch(_:Exception){JSONObject()}
        val out=JSONObject()
        for(id in ids)out.put(id,normalized(id,saved.optJSONObject(id)?:JSONObject()))
        return out
    }
    @Synchronized fun configure(c:Context,json:String):Boolean {
        val patch=try{JSONObject(json)}catch(_:Exception){return false}
        val updated=all(c)
        for(id in ids)if(patch.has(id)){
            val item=patch.optJSONObject(id) ?: return false
            updated.put(id,normalized(id,item))
        }
        if(!prefs(c).edit().putString(KEY,updated.toString()).commit())return false
        PrayerWidget.update(c)
        return true
    }
    fun item(c:Context,id:String):JSONObject=all(c).getJSONObject(id)
    fun compact(c:Context,kind:String,widthDp:Int,minWidthDp:Int):Boolean {
        val labels=item(c,kind).optJSONObject("labels")?:JSONObject()
        val digits=item(c,kind).optJSONObject("numbers")?:JSONObject()
        return labels.optInt("size",105)<125 && digits.optInt("size",105)<130 &&
            (widthDp<=0 || widthDp>=minWidthDp)
    }
    private fun group(c:Context,kind:String,key:String):JSONObject =
        item(c,kind).getJSONObject(key)
    private fun family(key:String):String=when(key){
        "serif"->"serif"
        "condensed"->"sans-serif-condensed"
        "medium"->"sans-serif-medium"
        else->"sans-serif"
    }
    private fun color(key:String):Int=try{
        Color.parseColor(namedColors[key]?:key)
    }catch(_:Exception){Color.WHITE}
    private fun bgResource(key:String):Int=when(key){
        "mist"->R.drawable.aoqat_widget_mist
        "blue"->R.drawable.aoqat_widget_blue
        "dark"->R.drawable.aoqat_widget_dark
        "cream"->R.drawable.aoqat_widget_cream
        else->android.R.color.transparent
    }
    /**
     * The live Android Chronometer redraws digits every second. Its font face and
     * weight are chosen from XML layout variants so they survive every tick.
     */
    fun counterLayout(c:Context,kind:String,base:Int):Int {
        val baseName=try{c.resources.getResourceEntryName(base)}catch(_:Exception){return base}
        val n=group(c,kind,"numbers")
        val suffix="_num_"+n.optString("font","sans")+"_"+n.optString("weight","bold")
        val candidate=c.resources.getIdentifier(baseName+suffix,"layout",c.packageName)
        return if(candidate!=0)candidate else base
    }
    private fun styled(text:String,config:JSONObject):SpannableString {
        val span=SpannableString(text)
        if(span.isNotEmpty()){
            span.setSpan(TypefaceSpan(family(config.optString("font","sans"))),0,span.length,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            if(config.optString("weight","bold")=="bold")
                span.setSpan(StyleSpan(Typeface.BOLD),0,span.length,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
        return span
    }
    private fun size(config:JSONObject,base:Float):Float =
        (base*(config.optInt("size",105).coerceIn(65,170)/100f)).coerceIn(10f,56f)
    fun decorateCounter(c:Context,views:RemoteViews,id:Int,kind:String,base:Float){
        val n=group(c,kind,"numbers")
        views.setTextColor(id,color(n.optString("color","white")))
        views.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,size(n,base))
    }
    fun decorate(c:Context,views:RemoteViews,rootId:Int,labels:Map<Int,Pair<String,Float>>,kind:String){
        views.setInt(rootId,"setBackgroundResource",bgResource(item(c,kind).optString("background","transparent")))
        val l=group(c,kind,"labels")
        for((id,p) in labels){
            views.setTextViewText(id,styled(p.first,l))
            views.setTextColor(id,color(l.optString("color","white")))
            views.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,size(l,p.second))
        }
    }
    fun decorateNumber(c:Context,views:RemoteViews,id:Int,kind:String,text:String,base:Float){
        val n=group(c,kind,"numbers")
        views.setTextViewText(id,styled(text,n))
        views.setTextColor(id,color(n.optString("color","white")))
        views.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,size(n,base))
    }
    /** Split label and numeric time styling even in the existing two-line 3x3 cells. */
    fun decorateCell(c:Context,views:RemoteViews,id:Int,kind:String,label:String,time:String,base:Float){
        val l=group(c,kind,"labels")
        val n=group(c,kind,"numbers")
        val value=SpannableString("$label\n$time")
        val split=label.length
        val cut=split+1
        value.setSpan(TypefaceSpan(family(l.optString("font","sans"))),0,split,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        value.setSpan(TypefaceSpan(family(n.optString("font","sans"))),cut,value.length,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        value.setSpan(ForegroundColorSpan(color(l.optString("color","white"))),0,split,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        value.setSpan(ForegroundColorSpan(color(n.optString("color","white"))),cut,value.length,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        value.setSpan(RelativeSizeSpan(l.optInt("size",105)/100f),0,split,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        value.setSpan(RelativeSizeSpan(n.optInt("size",105)/100f),cut,value.length,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        if(l.optString("weight","bold")=="bold")value.setSpan(StyleSpan(Typeface.BOLD),0,split,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        if(n.optString("weight","bold")=="bold")value.setSpan(StyleSpan(Typeface.BOLD),cut,value.length,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        views.setTextViewText(id,value)
        views.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,base)
    }
}
