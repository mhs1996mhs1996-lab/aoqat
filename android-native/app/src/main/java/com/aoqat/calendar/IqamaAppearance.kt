package com.aoqat.calendar

import android.content.Context
import android.content.res.Configuration
import android.graphics.Color

object IqamaAppearance {
    private val modes = setOf("white", "dark", "transparent")
    fun mode(c: Context): String = c.getSharedPreferences("iqama_schedule", Context.MODE_PRIVATE)
        .getString("appearance", "transparent")?.takeIf { it in modes } ?: "transparent"
    fun save(c: Context, mode: String) {
        if(mode in modes)c.getSharedPreferences("iqama_schedule", Context.MODE_PRIVATE).edit().putString("appearance",mode).commit()
    }
    fun colors(c: Context): Pair<Int,Int> = when(mode(c)) {
        "white" -> Color.WHITE to Color.rgb(23,55,71)
        "dark" -> Color.rgb(23,55,71) to Color.WHITE
        else -> Color.TRANSPARENT to if(c.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES) Color.WHITE else Color.rgb(23,55,71)
    }
}
