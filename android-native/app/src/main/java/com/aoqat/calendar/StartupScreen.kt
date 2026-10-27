package com.aoqat.calendar

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

/** Local, lightweight launch surface; no network, fonts or Quran assets required. */
class StartupScreen(context: Context) : FrameLayout(context) {
    init {
        background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(Color.rgb(8, 49, 48), Color.rgb(14, 76, 66), Color.rgb(5, 32, 36)))
        isClickable = true
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
        val column = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(28), dp(24), dp(28), dp(24))
        }
        addView(column, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT, Gravity.CENTER))
        column.addView(ImageView(context).apply {
            setImageResource(R.mipmap.app_icon)
            contentDescription = "شعار أوقات الصلاة"
            scaleType = ImageView.ScaleType.FIT_CENTER
        }, LinearLayout.LayoutParams(dp(264), dp(264)))
        column.addView(TextView(context).apply {
            text = "أوقات الصلاة في الحويجة"
            textSize = 25f
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(249, 241, 213))
            setPadding(0, dp(30), 0, dp(12))
        })
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
