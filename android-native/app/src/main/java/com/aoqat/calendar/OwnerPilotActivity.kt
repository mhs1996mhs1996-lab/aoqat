package com.aoqat.calendar

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * QA package is a separate app ID, never the user's installed production app.
 * Only explicitly selected, owner-signed local ZIPs may enter this activity.
 */
class OwnerPilotActivity : Activity() {
    private lateinit var status: TextView
    private var working = false
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!BuildConfig.OWNER_PILOT_ENABLED) { finish(); return }
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 48, 28, 24)
            layoutDirection = android.view.View.LAYOUT_DIRECTION_RTL
        }
        val title = TextView(this).apply {
            text = "تجربة تحديث موقّع — هاتف المالك فقط"
            textSize = 21f
        }
        val instructions = TextView(this).apply {
            text = "اختر حزمة ZIP الموقّعة من المالك بعد اجتياز الفحص. لا يوجد تنزيل تلقائي أو نشر للمستخدمين. " +
                "تطبيق التجربة مستقل عن أوقات الصلاة المثبّت أصلاً. بعد الاستيراد افتح النسخة التجريبية من جديد."
            textSize = 15f
        }
        status = TextView(this).apply { text = "لم يتم استيراد أي تحديث تجريبي."; textSize = 15f }
        val select = Button(this).apply {
            text = "اختيار ZIP موقع وتجربته"
            setOnClickListener {
                if (working) return@setOnClickListener
                val request = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    type = "application/zip"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                startActivityForResult(request, 9901)
            }
        }
        val reopen = Button(this).apply {
            text = "إعادة فتح التطبيق التجريبي لتفعيل المعاينة"
            setOnClickListener {
                if (working) return@setOnClickListener
                startActivity(Intent(this@OwnerPilotActivity, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                })
                finish()
            }
        }
        listOf(title, instructions, select, status, reopen).forEach {
            layout.addView(it, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
        setContentView(layout)
    }

    @Deprecated("Android picker callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 9901 || resultCode != RESULT_OK || working) return
        val uri = data?.data ?: return
        working = true
        status.text = "جاري فحص التوقيع وبصمات الملفات، بدون أي اتصال أو نشر..."
        Thread {
            try {
                val revision = contentResolver.openInputStream(uri)?.use {
                    WebUpdates(this).stageOwnerPilotZip(it)
                } ?: error("Could not open selected ZIP")
                runOnUiThread {
                    status.text = "تمت مراجعة الحزمة وتخزينها للتجربة فقط. المراجعة: " +
                        revision.take(12) + "…\nأعد فتح تطبيق التجربة. لا نشر تلقائي."
                }
            } catch (_: Exception) {
                runOnUiThread {
                    status.text = "رفض النظام الحزمة: تحقق من توقيع المالك، رقم البناء، " +
                        "تسلسل التحديث وبصمات جميع الملفات. لم يتغير تطبيق الصلاة الأصلي."
                }
            } finally { runOnUiThread { working = false } }
        }.start()
    }
}
