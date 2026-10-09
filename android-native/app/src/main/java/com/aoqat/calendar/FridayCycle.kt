package com.aoqat.calendar

/** All three phases share the database's second adhan time; delays never restart clocks. */
object FridayCycle {
    data class Timing(val second: Long, val reminder: Int = 15, val sermon: Int = 35) {
        val first get() = second - 900_000L
        val start get() = first - reminder.coerceIn(1,180) * 60_000L
        val end get() = second + sermon.coerceIn(1,120) * 60_000L
    }
    data class Frame(val title: String, val base: Long, val down: Boolean, val boundary: Long)
    fun frame(t: Timing, now: Long): Frame? = when {
        now < t.start || now >= t.end -> null
        now < t.first -> Frame("باقي على أذان الجمعة الأول",t.first,true,t.first)
        now < t.second -> Frame("باقي على الخطبة",t.second,true,t.second)
        else -> Frame("مضى على الخطبة",t.second,false,t.end)
    }
}
