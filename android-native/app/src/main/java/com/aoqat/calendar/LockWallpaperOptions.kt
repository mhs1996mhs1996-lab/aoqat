package com.aoqat.calendar

import android.content.Context
import org.json.JSONObject
import kotlin.math.max

/** Independent wallpaper-only configuration; never changes alarm or home-widget preferences. */
object LockWallpaperOptions {
    private const val PREFS="prayer_lock_wallpaper"
    private const val KEY="config_v2"
    val prayerIds=listOf("fajr","sunrise","dhuhr","asr","maghrib","isha")
    val ids=listOf("next","iqama","date")+prayerIds
    private val fontChoices=setOf("sans","serif","condensed","medium")
    private val validColor=Regex("^#[0-9A-Fa-f]{6}$")

    fun defaults(c:Context):JSONObject {
        val legacyTimes=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
            .getBoolean("show_times",true)
        val items=JSONObject()
        ids.forEach{items.put(it,it=="next"||(it in prayerIds && legacyTimes))}
        return JSONObject().put("items",items).put("size",100)
            .put("labelFont","sans").put("numberFont","sans")
            .put("labelColor","#FFF7DE").put("numberColor","#F8D37E")
            .put("background","emerald")
    }
    private fun clean(c:Context,raw:JSONObject):JSONObject {
        val cfg=defaults(c)
        val out=cfg.getJSONObject("items")
        val supplied=raw.optJSONObject("items")
        ids.forEach{if(supplied?.has(it)==true)out.put(it,supplied.optBoolean(it))}
        cfg.put("size",raw.optInt("size",100).coerceIn(65,160))
        for(key in listOf("labelFont","numberFont")){
            val font=raw.optString(key)
            if(font in fontChoices)cfg.put(key,font)
        }
        for(key in listOf("labelColor","numberColor")){
            val color=raw.optString(key)
            if(validColor.matches(color))cfg.put(key,color)
        }
        val background=raw.optString("background")
        if(background in setOf("emerald","navy","transparent"))cfg.put("background",background)
        return cfg
    }
    fun read(c:Context):JSONObject {
        val raw=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(KEY,null)
        val parsed=try{if(raw==null)null else JSONObject(raw)}catch(_:Exception){null}
        return if(parsed==null)defaults(c) else clean(c,parsed)
    }
    fun configure(c:Context,json:String):Boolean=try{
        val source=JSONObject(json)
        if(source.optJSONObject("items")==null)false
        else{
            val cfg=clean(c,source)
            if(ids.none{selected(cfg,it)})false
            else c.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
                .edit().putString(KEY,cfg.toString()).commit()
        }
    }catch(_:Exception){false}
    fun selected(cfg:JSONObject,id:String):Boolean=
        id in ids && cfg.optJSONObject("items")?.optBoolean(id)==true
    fun visiblePrayers(cfg:JSONObject)=prayerIds.filter{selected(cfg,it)}
    fun rowHeight(cfg:JSONObject)=34f*max(1f,cfg.optInt("size",100)/100f*.88f)
    fun countdownHeight(cfg:JSONObject)=if(cfg.optInt("size",100)>125)84f else 54f
    fun iqamaHeight(cfg:JSONObject)=if(cfg.optInt("size",100)>125)74f else 48f
    fun cardHeight(cfg:JSONObject):Float{
        val rows=visiblePrayers(cfg).size
        return 26f+(if(selected(cfg,"next"))countdownHeight(cfg) else 0f)+
            (if(selected(cfg,"iqama"))iqamaHeight(cfg) else 0f)+
            (if(selected(cfg,"date"))29f else 0f)+
            (if(rows>0)28f+rows*rowHeight(cfg) else 0f)
    }
}
