package com.aoqat.calendar

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {

    private val appUrl = "https://aoqat.vercel.app/?androidNativeLauncher=1"
    private var exactAlarmPrompted = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildNativeLauncher()
        requestNotificationPermissionIfNeeded()
        AlarmScheduler.scheduleFromDatabase(this)
    }

    override fun onResume() {
        super.onResume()
        AlarmScheduler.scheduleFromDatabase(this)
    }

    private fun buildNativeLauncher() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 64, 48, 64)
            setBackgroundColor(Color.rgb(5, 24, 34))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        val title = TextView(this).apply {
            text = "تقاويم الصلاة Android"
            textSize = 26f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 18)
        }

        val info = TextView(this).apply {
            text = "نسخة Android مستقلة للتنبيه الدقيق.\nواجهة البرنامج تفتح من الموقع الأصلي بدون WebView."
            textSize = 16f
            setTextColor(Color.rgb(210, 225, 232))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 28)
        }

        val openButton = Button(this).apply {
            text = "فتح برنامج تقاويم الصلاة"
            textSize = 18f
            setOnClickListener { openProjectInBrowser() }
        }

        val alarmButton = Button(this).apply {
            text = "تفعيل تنبيه Android الأصلي"
            textSize = 18f
            setOnClickListener { enableNativeAlarm() }
        }

        val status = TextView(this).apply {
            text = "المنبّه يعتمد على وقت العشاء في قاعدة البيانات + 35 دقيقة."
            textSize = 14f
            setTextColor(Color.rgb(160, 220, 185))
            gravity = Gravity.CENTER
            setPadding(0, 28, 0, 0)
        }

        root.addView(title)
        root.addView(info)
        root.addView(openButton, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = 18 })
        root.addView(alarmButton, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ))
        root.addView(status)

        setContentView(root)
    }

    private fun openProjectInBrowser() {
        val uri = Uri.parse(appUrl)
        val preferredPackages = listOf(
            "com.android.chrome",
            "com.microsoft.emmx",
            "com.sec.android.app.sbrowser",
            "org.mozilla.firefox"
        )

        for (pkg in preferredPackages) {
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                setPackage(pkg)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (intent.resolveActivity(packageManager) != null) {
                startActivity(intent)
                return
            }
        }

        startActivity(Intent(Intent.ACTION_VIEW, uri))
    }

    private fun enableNativeAlarm() {
        requestNotificationPermissionIfNeeded()
        requestExactAlarmPermissionIfNeeded()
        AlarmScheduler.scheduleFromDatabase(this)
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 2001)
        }
    }

    private fun requestExactAlarmPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarm = getSystemService(ALARM_SERVICE) as AlarmManager
            if (!alarm.canScheduleExactAlarms() && !exactAlarmPrompted) {
                exactAlarmPrompted = true
                startActivity(
                    Intent(
                        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:$packageName")
                    )
                )
            }
        }
    }
}
