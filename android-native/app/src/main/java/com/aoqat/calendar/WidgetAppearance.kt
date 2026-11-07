package com.aoqat.calendar

import android.content.Context
import android.graphics.Color
import android.text.SpannableString
import android.text.Spanned
import android.text.style.TypefaceSpan
import android.util.TypedValue
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * User-controlled home-screen card appearance. Does not change prayer times,
 * notification cards, audio settings, or any scheduling data.
 *
 * Android launchers own widget bounds. The user can resize every widget by dragging
 * its handles; this setting controls content scale and styling inside those bounds.
 */
object WidgetAppearance {
    private const val KEY = "appearance"
    private val ids = setOf("next", "times", "iqama", "combined")
    private val backgrounds = setOf("transparent", "mist", "blue", "dark", "cream")
    private val colors = setOf("white", "ivory", "gold", "navy", "black")
    private val fonts = setOf("sans", "serif", "condensed", "medium")

    fun defaults(id: String): JSONObject = JSONObject()
        .put("background", if (id == "times" || id == "combined") "mist" else "transparent")
        .put("color", "white")
        .put("font", "sans")
        .put("scale", 105)
        .put("layout", if (id == "times") "grid" else "classic")

    private fun preferences(c: Context) = c.getSharedPreferences("aoqat_widget_appearance_v1", Context.MODE_PRIVATE)
    fun all(c: Context): JSONObject {
        val prefs = preferences(c)
        val saved = try { JSONObject(prefs.getString(KEY, "{}")) } catch (_: Exception) { JSONObject() }
        // Migrate the old implicit tall list once; future classic selections remain respected.
        if (!prefs.getBoolean("times_grid_v182_migrated", false)) {
            val times = saved.optJSONObject("times") ?: JSONObject()
            if (times.optString("layout", "classic") == "classic") {
                times.put("layout", "grid")
                saved.put("times", times)
            }
            prefs.edit().putString(KEY, saved.toString())
                .putBoolean("times_grid_v182_migrated", true).commit()
        }
        val valid = JSONObject()
        for (id in ids) {
            val input = saved.optJSONObject(id) ?: JSONObject()
            valid.put(id, normalized(id, input))
        }
        return valid
    }
    fun normalized(id: String, input: JSONObject): JSONObject {
        val o = defaults(id)
        val bg = input.optString("background", "")
        val color = input.optString("color", "")
        val font = input.optString("font", "")
        if (bg in backgrounds) o.put("background", bg)
        if (color in colors) o.put("color", color)
        if (font in fonts) o.put("font", font)
        if (input.has("scale")) o.put("scale", input.optInt("scale", 105).coerceIn(75, 145))
        if (id == "times" && input.optString("layout") in setOf("classic", "grid", "featured")) o.put("layout", input.optString("layout"))
        return o
    }
    @Synchronized fun configure(c: Context, json: String): Boolean {
        val patch = try { JSONObject(json) } catch (_: Exception) { return false }
        val saved = all(c)
        for (id in ids) {
            if (patch.has(id)) saved.put(id, normalized(id, patch.optJSONObject(id) ?: JSONObject()))
        }
        if (!preferences(c).edit().putString(KEY, saved.toString()).commit()) return false
        PrayerWidget.update(c)
        return true
    }
    fun item(c: Context, id: String): JSONObject = all(c).getJSONObject(id)

    /**
     * Default one-line label/timer rows consume less launcher space.
     * At enlarged text sizes (or insufficient width) use the existing
     * vertically stacked layout so text and countdown never collide.
     */
    fun compact(c: Context, kind: String, widthDp: Int, minimumWidthDp: Int): Boolean {
        val scale = item(c,kind).optInt("scale",105)
        return scale < 125 && (widthDp <= 0 || widthDp >= minimumWidthDp)
    }

    private fun paletteColor(key: String): Int = when (key) {
        "ivory" -> Color.rgb(255, 246, 214)
        "gold" -> Color.rgb(255, 219, 128)
        "navy" -> Color.rgb(18, 49, 67)
        "black" -> Color.rgb(28, 35, 39)
        else -> Color.WHITE
    }
    private fun bgResource(key: String): Int = when(key) {
        "mist" -> R.drawable.aoqat_widget_mist
        "blue" -> R.drawable.aoqat_widget_blue
        "dark" -> R.drawable.aoqat_widget_dark
        "cream" -> R.drawable.aoqat_widget_cream
        else -> android.R.color.transparent
    }
    fun decorateCounter(c: Context, views: RemoteViews, textId: Int, kind: String, baseSize: Float) {
        val style=item(c,kind)
        views.setTextColor(textId,paletteColor(style.optString("color","white")))
        views.setTextViewTextSize(textId,TypedValue.COMPLEX_UNIT_SP,
            (baseSize * (style.optInt("scale",105).coerceIn(75,145)/100f)).coerceIn(14f,53f))
    }
    fun decorate(c: Context, views: RemoteViews, rootId: Int, labels: Map<Int, Pair<String, Float>>, kind: String) {
        val style = item(c, kind)
        val bg = style.optString("background", "transparent")
        views.setInt(rootId, "setBackgroundResource", bgResource(bg))
        val color = paletteColor(style.optString("color", "white"))
        val font = when (style.optString("font", "sans")) {
            "serif" -> "serif"
            "condensed" -> "sans-serif-condensed"
            "medium" -> "sans-serif-medium"
            else -> "sans-serif"
        }
        val scale = style.optInt("scale",105).coerceIn(75,145) / 100f
        for ((id, label) in labels) {
            val span = SpannableString(label.first)
            span.setSpan(TypefaceSpan(font),0,span.length,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            views.setTextViewText(id,span)
            views.setTextColor(id,color)
            views.setTextViewTextSize(id,TypedValue.COMPLEX_UNIT_SP,(label.second * scale).coerceIn(11f,49f))
        }
    }
}
