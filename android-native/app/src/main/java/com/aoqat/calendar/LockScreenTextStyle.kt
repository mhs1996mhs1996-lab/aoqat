package com.aoqat.calendar

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.graphics.Color
import android.content.res.ColorStateList
import android.os.Build
import android.text.InputType
import android.util.TypedValue
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.RemoteViews
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import org.json.JSONObject

/**
 * Independent per-state title/time typography. NEVER alters a countdown base,
 * phase selection, notification opt-in, or row visibility.
 * Works only in the isolated owner-pilot build.
 */
internal object LockScreenTextStyle {
    private const val NAME="owner_pilot_lockscreen_text_v1"
    private val keys=arrayOf("prayer","iqama_wait","iqama_elapsed",
        "friday_first","sermon_wait","sermon_elapsed")
    private val labels=arrayOf("باقي على الصلاة","باقي على الإقامة",
        "مضى على الإقامة","باقي على أذان الجمعة الأول",
        "باقي على الخطبة","مضى على الخطبة")
    private val palette=intArrayOf(Color.WHITE,0xFFFFF2D6.toInt(),
        0xFF152F40.toInt(),Color.BLACK)
    private val palettes=arrayOf("أبيض (افتراضي)","عاجي","كحلي","أسود")
    private fun pref(c:Context)=c.getSharedPreferences(NAME,Context.MODE_PRIVATE)
    private fun size(c:Context,key:String,field:String,default:Int):Int=
        pref(c).getInt(key+"_"+field,default).coerceIn(12,24)
    fun apply(c:Context,v:RemoteViews,key:String,title:Int,clock:Int,fallback:Int?=null){
        if(!BuildConfig.OWNER_PILOT_ENABLED)return
        val prefs=pref(c)
        val color=palette[prefs.getInt(key+"_color",0).coerceIn(0,palette.lastIndex)]
        val titleSize=size(c,key,"title",16).toFloat()
        val clockSize=size(c,key,"clock",17).toFloat()
        // On Android 12+/Honor the notification host can replace a plain
        // text-color int with its dynamic (dark) notification palette.
        // Supply a ColorStateList as well for ALL three countdown text views.
        fun tint(id:Int,sp:Float){
            v.setTextColor(id,color)
            if(Build.VERSION.SDK_INT>=31)
                v.setColorStateList(id,"setTextColor",ColorStateList.valueOf(color))
            v.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,sp)
        }
        tint(title,titleSize)
        tint(clock,clockSize)
        fallback?.let{tint(it,clockSize)}
    }
    /** Exact owner-only state bridge for the web subpage, never alters timing. */
    fun readState(c:Context,key:String):String {
        if(!BuildConfig.OWNER_PILOT_ENABLED || key !in keys)return "{}"
        val p=pref(c)
        return JSONObject().put("title",size(c,key,"title",16))
            .put("clock",size(c,key,"clock",17))
            .put("color",p.getInt(key+"_color",0).coerceIn(0,palette.lastIndex))
            .toString()
    }
    fun updateState(c:Context,key:String,title:Int,clock:Int,color:Int):Boolean {
        if(!BuildConfig.OWNER_PILOT_ENABLED || key !in keys)return false
        if(title !in 12..24 || clock !in 12..24 || color !in palette.indices)return false
        return pref(c).edit()
            .putInt(key+"_title",title)
            .putInt(key+"_clock",clock)
            .putInt(key+"_color",color)
            .commit()
    }
    fun showEditor(activity:Activity){
        if(!BuildConfig.OWNER_PILOT_ENABLED)return
        val dp={n:Int->(n*activity.resources.displayMetrics.density+0.5f).toInt()}
        val root=LinearLayout(activity).apply{
            orientation=LinearLayout.VERTICAL
            layoutDirection=View.LAYOUT_DIRECTION_RTL
            setPadding(dp(18),dp(10),dp(18),dp(6))
        }
        fun heading(s:String)=TextView(activity).apply {
            text=s; textSize=15f; setPadding(0,dp(9),0,dp(3))
        }
        val kind=Spinner(activity).apply{
            adapter=ArrayAdapter(activity,android.R.layout.simple_spinner_dropdown_item,labels.toList())
        }
        val titleSize=EditText(activity).apply{
            inputType=InputType.TYPE_CLASS_NUMBER;setSingleLine(true)
        }
        val clockSize=EditText(activity).apply{
            inputType=InputType.TYPE_CLASS_NUMBER;setSingleLine(true)
        }
        val color=Spinner(activity).apply{
            adapter=ArrayAdapter(activity,android.R.layout.simple_spinner_dropdown_item,palettes.toList())
        }
        root.addView(heading("نوع العدّاد"))
        root.addView(kind)
        root.addView(heading("حجم كتابة العنوان (12–24)"))
        root.addView(titleSize)
        root.addView(heading("حجم أرقام العدّاد (12–24)"))
        root.addView(clockSize)
        root.addView(heading("لون الكتابة والعدّاد"))
        root.addView(color)
        root.addView(heading("احفظ تنسيق هذه الحالة وحدها. لا تتغير أوقات ظهور العدّادات ولا ترتيبها."))
        fun load(position:Int) {
            val key=keys[position.coerceIn(0,keys.lastIndex)]
            titleSize.setText(size(activity,key,"title",16).toString())
            clockSize.setText(size(activity,key,"clock",17).toString())
            color.setSelection(pref(activity).getInt(key+"_color",0).coerceIn(0,palette.lastIndex))
        }
        kind.onItemSelectedListener=object:AdapterView.OnItemSelectedListener{
            override fun onItemSelected(parent:AdapterView<*>?,view:View?,position:Int,id:Long){
                load(position)
            }
            override fun onNothingSelected(parent:AdapterView<*>?){}
        }
        load(0)
        val scroll=ScrollView(activity).apply{addView(root)}
        AlertDialog.Builder(activity).setTitle("تنسيق خطوط إشعار شاشة القفل")
            .setView(scroll).setNegativeButton("إلغاء",null)
            .setPositiveButton("حفظ"){_,_->
                val key=keys[kind.selectedItemPosition.coerceIn(0,keys.lastIndex)]
                val h=(titleSize.text.toString().toIntOrNull()?:16).coerceIn(12,24)
                val n=(clockSize.text.toString().toIntOrNull()?:17).coerceIn(12,24)
                pref(activity).edit().putInt(key+"_title",h)
                    .putInt(key+"_clock",n)
                    .putInt(key+"_color",color.selectedItemPosition.coerceIn(0,palette.lastIndex))
                    .commit()
                if(LockScreenPrayer.enabled(activity)) LockScreenPrayer.showNow(activity)
                if(NextPrayerService.wanted(activity)) NextPrayerService.start(activity)
            }.show()
    }
}
