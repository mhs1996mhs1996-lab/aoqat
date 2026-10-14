package com.aoqat.calendar

import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

/** Local, lightweight launch surface; no network, fonts or Quran assets required. */
class StartupScreen(context: Context) : FrameLayout(context) {
    init {
        setBackgroundColor(Color.rgb(5, 24, 34))
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
        }, LinearLayout.LayoutParams(dp(148), dp(148)))
        column.addView(TextView(context).apply {
            text = "أوقات الصلاة في الحويجة"
            textSize = 25f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            setPadding(0, dp(30), 0, dp(12))
        })
        column.addView(TextView(context).apply {
            text = "جارٍ تجهيز البرنامج"
            textSize = 16f
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(222, 204, 155))
        })
        column.addView(ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = true
            indeterminateTintList = android.content.res.ColorStateList.valueOf(Color.rgb(204, 167, 77))
        }, LinearLayout.LayoutParams(dp(200), dp(6)).apply { topMargin = dp(28) })
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
