package com.aoqat.calendar

import org.json.JSONObject
import java.time.LocalDate

/** Same default/custom rules as the reviewed web controls; rows already include user offsets. */
object AzkarReminderPlan {
    val titles = linkedMapOf("morning" to "أذكار الصباح", "evening" to "أذكار المساء", "prayer" to "أذكار بعد الصلاة", "sleep" to "أذكار النوم", "waking" to "أذكار الاستيقاظ", "tasbih" to "التسبيح والاستغفار والصلاة على النبي ﷺ")
    private val clocks = mapOf("morning" to listOf("06:00"), "evening" to listOf("17:00"), "prayer" to listOf("05:30","12:30","15:30","18:30","20:00"), "sleep" to listOf("22:00"), "waking" to listOf("07:00"), "tasbih" to listOf("09:00","16:00"))
    fun events(date: LocalDate, settings: JSONObject, row: JSONObject?, durations: (String) -> IqamaCycle.Durations): List<JSONObject> {
        val out = mutableListOf<JSONObject>()
        fun prayer(id: String) = PrayerTimes.minutes(row?.optString(id) ?: "", id)
        fun finish(id: String): Int? { val at=prayer(id) ?: return null; val d=durations(id); return at+d.beforeMinutes+d.afterMinutes }
        fun add(kind: String, slot: String, minute: Int?) {
            if(minute==null)return
            val key="azkar:$kind:$date:$slot"
            out.add(JSONObject().put("id",key).put("key",key).put("sourceDate",date.toString()).put("kind","azkar-reminder").put("section","azkar").put("topicId",kind).put("action","detail").put("at",date.atStartOfDay(CommunityReminderPlan.zone).plusMinutes(minute.toLong()).toInstant().toEpochMilli()).put("title","تذكير: "+titles[kind]).put("body","حان وقت "+titles[kind]+". اضغط لفتح الأذكار."))
        }
        for(kind in titles.keys) {
            val s=settings.optJSONObject(kind) ?: JSONObject()
            if(!s.optBoolean("enabled",true))continue
            val custom=s.optString("mode")=="custom"
            if(kind in listOf("sleep","waking") || custom && s.optString("type")=="clock") {
                for((i,default) in clocks.getValue(kind).withIndex()) {
                    val requested=if(custom)s.optJSONArray("times")?.optString(i) else null
                    add(kind,i.toString(),CommunityReminderPlan.clock(requested ?: "") ?: CommunityReminderPlan.clock(default))
                }
                continue
            }
            val offset=if(custom)s.optInt("offset",0).coerceIn(-120,120) else 0
            fun shift(at:Int?)=at?.plus(offset)
            when(kind) {
                "morning" -> add(kind,"0",shift(finish("fajr")))
                "evening" -> add(kind,"0",prayer("maghrib")?.let{it-20+offset})
                "prayer" -> PrayerTimes.ids.forEach{add(kind,it,shift(finish(it)))}
                "tasbih" -> {add(kind,"0",prayer("sunrise")?.let{it+120+offset});add(kind,"1",shift(finish("asr")))}
            }
        }
        return out.sortedBy{it.getLong("at")}
    }
}
