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
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

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
            text = "تحديثات النسخة التجريبية"
            textSize = 21f
            setTextColor(ink)
            setPadding(0, 0, 0, dp(14))
        }
        status = TextView(this).apply {
            text = "ملف ZIP احتياطي"
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
        val select = Button(this).apply {
            text = "اختيار ملف ZIP"
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
            text = "إعادة فتح التطبيق"
            setOnClickListener {
                if (working) return@setOnClickListener
                startActivity(Intent(this@OwnerPilotActivity, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                })
                finish()
            }
        }
        val inspect = Button(this).apply {
            text = "التحقق من تحديث جديد"
            setOnClickListener { checkPublishedPilotUpdate() }
        }
        val advanced = Button(this).apply {
            text = "خيارات متقدمة (ZIP احتياطي)"
            textSize = 13f
            setOnClickListener {
                val show = select.visibility != View.VISIBLE
                select.visibility = if (show) View.VISIBLE else View.GONE
                status.visibility = if (show) View.VISIBLE else View.GONE
                text = if (show) "إخفاء الخيارات المتقدمة" else "خيارات متقدمة (ZIP احتياطي)"
            }
        }
        select.visibility = View.GONE
        status.visibility = View.GONE
        listOf(title, pilotState, inspect, reopen, advanced, select, status).forEach {
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
        val prefs = getSharedPreferences("web_updates_v3_owner_pilot", MODE_PRIVATE)
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
        pilotState.text = "التحديث المفعّل: $last\n$state"
    }

    /** Display published sequence only; WebUpdates still verifies the signed
     * manifest and is solely responsible for downloading/activating OTA. */
    private fun checkPublishedPilotUpdate() {
        if (working) return
        working = true
        pilotState.text = "جارٍ التحقق..."
        Thread {
            val result = try {
                val address = URL("https://raw.githubusercontent.com/mhs1996mhs1996-lab/aoqat/owner-pilot-ota/android-updates/owner-pilot/build-150/manifest.json")
                val connection = address.openConnection() as HttpURLConnection
                connection.connectTimeout = 7000
                connection.readTimeout = 7000
                connection.useCaches = false
                try {
                    if (connection.responseCode != 200) error("Unavailable feed")
                    val payload = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
                    require(payload.length in 1..131072)
                    val manifest = JSONObject(payload)
                    require(manifest.optString("channel") == "owner-pilot")
                    require(manifest.optInt("nativeBuild") == 150)
                    require(manifest.optString("signature").length >= 70)
                    val latest = manifest.getLong("sequence")
                    val last = getSharedPreferences("web_updates_v3_owner_pilot", MODE_PRIVATE)
                        .getLong("lastSequence", 0L)
                    if (latest > last)
                        "إصدار $latest متوفر؛ يُفحص توقيعه ويُستلم داخل التطبيق."
                    else "لا يوجد تحديث أحدث من $last."
                } finally { connection.disconnect() }
            } catch (_: Exception) {
                "تعذّر التحقق الآن. التطبيق يعمل دون إنترنت."
            }
            runOnUiThread {
                if (!isFinishing && !isDestroyed) pilotState.text = result
                working = false
            }
        }.start()
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
