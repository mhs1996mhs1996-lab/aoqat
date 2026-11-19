package com.aoqat.calendar

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.util.zip.ZipException

/**
 * QA package is a separate app ID, never the user's installed production app.
 * Only explicitly selected, owner-signed local ZIPs may enter this activity.
 *
 * The production app theme uses a dark window. This review-only screen
 * explicitly sets accessible contrast so failures can actually be read.
 */
class OwnerPilotActivity : Activity() {
    private lateinit var status: TextView
    private lateinit var pilotState: TextView
    private lateinit var timingState: TextView
    private var working = false
    private val ink = Color.rgb(20, 53, 61)
    private val page = Color.rgb(244, 249, 249)
    private val errorInk = Color.rgb(147, 32, 39)
    private val successInk = Color.rgb(15, 105, 72)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!BuildConfig.OWNER_PILOT_ENABLED) { finish(); return }
        window.statusBarColor = Color.rgb(232, 242, 244)
        window.navigationBarColor = Color.rgb(232, 242, 244)
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or
            View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR

        val scroll = ScrollView(this).apply { setBackgroundColor(page) }
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(page)
            setPadding(dp(18), dp(28), dp(18), dp(30))
            layoutDirection = View.LAYOUT_DIRECTION_RTL
        }
        val title = TextView(this).apply {
            text = "تجربة تحديث موقّع — هاتف المالك فقط"
            textSize = 21f
            setTextColor(ink)
            setPadding(0, 0, 0, dp(14))
        }
        val instructions = TextView(this).apply {
            text = "اختر حزمة ZIP الموقّعة من المالك بعد اجتياز الفحص. لا يوجد تنزيل تلقائي أو نشر للمستخدمين. " +
                "تطبيق التجربة مستقل عن أوقات الصلاة المثبّت أصلاً. بعد الاستيراد افتح النسخة التجريبية من جديد."
            textSize = 16f
            setTextColor(ink)
            setPadding(0, 0, 0, dp(14))
        }
        status = TextView(this).apply {
            text = "لم يتم استيراد أي تحديث تجريبي."
            textSize = 16f
            setTextColor(ink)
            setBackgroundColor(Color.rgb(225, 238, 240))
            setPadding(dp(12), dp(14), dp(12), dp(14))
        }
        pilotState = TextView(this).apply {
            textSize = 15f
            setTextColor(ink)
            setBackgroundColor(Color.rgb(226, 240, 244))
            setPadding(dp(12), dp(12), dp(12), dp(12))
        }
        refreshPilotState()
        timingState = TextView(this).apply {
            textSize = 14f
            setTextColor(ink)
            setBackgroundColor(Color.rgb(235, 244, 238))
            setPadding(dp(12), dp(12), dp(12), dp(12))
            visibility = View.GONE
        }
        val inspectTimes = Button(this).apply {
            text = "فحص مدد مضى على الإقامة والصامت — قراءة فقط"
            setOnClickListener {
                refreshTimingState()
                timingState.visibility = View.VISIBLE
            }
        }
        val select = Button(this).apply {
            text = "اختيار ZIP موقّع وتجربته"
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
        val inspect = Button(this).apply {
            text = "عرض حالة التحديث التجريبي (بدون أي تغيير)"
            setOnClickListener { refreshPilotState() }
        }
        listOf(title, instructions, pilotState, inspect, inspectTimes, timingState,
            select, status, reopen).forEach {
            layout.addView(it, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
        scroll.addView(layout, android.widget.FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        setContentView(scroll)
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density + 0.5f).toInt()

    private fun refreshPilotState() {
        // Read-only, owner QA package-private preferences. No reset, approval,
        // signature bypass, import or production app access.
        val prefs = getSharedPreferences("web_updates_v2_owner_qa", MODE_PRIVATE)
        val last = prefs.getLong("lastSequence", 0L)
        val pending = prefs.getString("pending", null)
        val active = prefs.getString("active", null)
        val trial = prefs.getString("trial", null)
        val state = when {
            pending != null -> "توجد حزمة معلّقة؛ افتح التطبيق التجريبي لإكمال تنشيطها."
            trial != null -> "هناك تشغيل اختباري قيد التحقق."
            active != null && prefs.getBoolean("trialConfirmed", false) ->
                "يوجد تحديث مسجّل نشط، ووصلت إشارة بدء التشغيل."
            active != null -> "يوجد تحديث مسجّل نشط، دون تأكيد بدء تشغيل موثوق."
            else -> "ماكو تحديث نشط مسجّل حالياً."
        }
        pilotState.text = "حالة قناة التجربة — قراءة فقط\n" +
            "أعلى تسلسل مُفعّل سابقاً: $last\n" +
            "أي تحديث جديد لازم يحمل تسلسلاً أكبر من $last، وتوقيع المالك الصحيح.\n" +
            state + "\nهاي الحالة لا تعني اجتياز اختبارات الأذان والتنبيهات أو موافقة النشر."
    }

    private fun refreshTimingState() {
        // Owner QA only; never modify preferences or any alarm schedules.
        val prefs = getSharedPreferences("iqama_schedule", MODE_PRIVATE)
        val elapsedSaved = try {
            org.json.JSONObject(prefs.getString("afterMinutes", "{}") ?: "{}")
        } catch (_: Exception) { org.json.JSONObject() }
        val quiet = AdhanSchedule.settings(this).optJSONObject("afterIqamaSilent")
        val quietMinutes = quiet?.optJSONObject("minutes")
        val quietEnabled = quiet?.optBoolean("enabled") == true
        val names = listOf(
            "fajr" to "الفجر", "dhuhr" to "الظهر", "asr" to "العصر",
            "maghrib" to "المغرب", "isha" to "العشاء")
        val lines = names.map { (id, label) ->
            val iqama = IqamaNativeScheduler.durations(this, id)
            val elapsedOrigin = if (elapsedSaved.has(id)) "محفوظ" else "افتراضي"
            val silentValue = quietMinutes?.optInt(id, 0)?.coerceIn(0, 120) ?: 0
            "$label: قبل الإقامة " + iqama.beforeMinutes + " | مضى " +
                iqama.afterMinutes + " (" + elapsedOrigin + ") | الصامت " +
                silentValue + " دقيقة"
        }
        timingState.text = "قيم أندرويد الفعلية — بدون أي تعديل\n" +
            "إشعار الإقامة: " +
            (if (IqamaNativeScheduler.enabled(this)) "مفعّل\n" else "معطّل\n") +
            "صامت بعد الإقامة: " +
            (if (quietEnabled) "مفعّل\n" else "معطّل\n") +
            lines.joinToString("\n") +
            "\nإذا شاشة مضى تعرض رقماً مختلفاً، فربما توجد قيم قديمة " +
            "في واجهة الويب تختلف عن إعدادات أندرويد. لا يتغير أي إعداد هنا."
    }

    private fun updateStatus(text: String, color: Int, background: Int) {
        status.text = text
        status.setTextColor(color)
        status.setBackgroundColor(background)
    }

    private fun rejectionMessage(problem: Exception): String {
        // Only controlled error classifications: never display private data,
        // file paths, credentials or raw exception messages.
        val reason = when {
            problem is ZipException -> "ملف ZIP غير سليم أو تالف."
            else -> when (problem.message) {
                "ZIP belongs to another build" ->
                    "ملف ZIP لا يحتوي حزمة البناء 150 المطلوبة. احتمال اخترت ملف الأرشيف الخارجي بدل الحزمة الداخلية."
                "Forbidden OTA member", "Duplicate / excessive files",
                "OTA package contains missing or unexpected files",
                "Unsupported OTA paths" ->
                    "داخل ZIP ملفات إضافية أو مسارات غير مسموحة لهذا التحديث."
                "Missing signed manifest" -> "ملف ZIP لا يحتوي manifest.json الموقّع."
                "Pilot build mismatch" -> "رقم البناء داخل الحزمة لا يساوي بناء التطبيق التجريبي."
                "Pilot sequence not newer" ->
                    "تسلسل الحزمة قديم أو سبق تثبيته على نسخة التجربة."
                "Pilot manifest expired" -> "انتهت صلاحية توقيع هذه الحزمة."
                "Publisher signature invalid" ->
                    "توقيع الناشر الرقمي غير مطابق للمفتاح العام الموثوق."
                "Checksum mismatch" -> "بصمة SHA-256 لأحد الملفات غير متطابقة."
                "Deleted file requires full APK" ->
                    "الحزمة تحذف ملفاً مفعّلاً سابقاً؛ هذا يتطلب APK كاملاً، وليس OTA جزئياً."
                "Finish earlier pilot first" -> "يوجد تحديث تجريبي جاهز؛ افتح التطبيق التجريبي أولاً."
                "Staged snapshot invalid", "Could not stage verified package",
                "Cannot save pilot activation state" ->
                    "فشل حفظ النسخة التجريبية محلياً بعد الفحص."
                else -> "تعذر استيراد الملف. تأكد من اختيار حزمة ZIP الداخلية الصحيحة."
            }
        }
        return "لم يتم قبول حزمة الاختبار.\nالسبب: $reason\nلم يتغير تطبيق أوقات الصلاة الرئيسي، ولا يوجد نشر للمستخدمين."
    }

    @Deprecated("Android picker callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 9901 || resultCode != RESULT_OK || working) return
        val uri = data?.data ?: return
        working = true
        updateStatus("جاري فحص التوقيع وبصمات الملفات، بدون أي اتصال أو نشر...",
            ink, Color.rgb(225, 238, 240))
        Thread {
            try {
                val revision = contentResolver.openInputStream(uri)?.use {
                    WebUpdates(this).stageOwnerPilotZip(it)
                } ?: error("Could not open selected ZIP")
                runOnUiThread {
                    refreshPilotState()
                    updateStatus("تمت مراجعة الحزمة وتخزينها للتجربة فقط. المراجعة: " +
                        revision.take(12) + "…\nأعد فتح تطبيق التجربة. لا نشر تلقائي.",
                        successInk, Color.rgb(222, 246, 234))
                }
            } catch (error: Exception) {
                runOnUiThread {
                    refreshPilotState()
                    updateStatus(rejectionMessage(error), errorInk, Color.rgb(255, 234, 233))
                }
            } finally { runOnUiThread { working = false } }
        }.start()
    }
}
