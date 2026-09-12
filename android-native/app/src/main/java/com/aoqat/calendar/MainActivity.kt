package com.aoqat.calendar

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import java.io.File
import java.io.FileOutputStream

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = Color.rgb(5, 24, 34)
        window.navigationBarColor = Color.rgb(4, 18, 26)
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(true)
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(5, 24, 34))
        }
        setContentView(webView)

        configureWebView()
        requestNotificationPermissionIfNeeded()
        AlarmScheduler.scheduleFromDatabase(this)

        webView.loadUrl("file:///android_asset/www/index.html")

        // Android-only startup assistance. We do not modify the original web project.
        listOf(250L, 700L, 1400L, 2500L, 4500L).forEach { delay ->
            webView.postDelayed({
                if (!isFinishing && ::webView.isInitialized) {
                    applyAndroidCompatibilityFixes(webView)
                }
            }, delay)
        }
    }

    override fun onResume() {
        super.onResume()
        AlarmScheduler.scheduleFromDatabase(this)
        if (::webView.isInitialized) {
            webView.postDelayed({ applyAndroidCompatibilityFixes(webView) }, 250L)
        }
    }

    private fun configureWebView() {
        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true
            cacheMode = WebSettings.LOAD_DEFAULT
            builtInZoomControls = false
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = false
            mediaPlaybackRequiresUserGesture = false
        }

        webView.addJavascriptInterface(AndroidBridge(), "AndroidNative")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageCommitVisible(view: WebView, url: String) {
                super.onPageCommitVisible(view, url)
                applyAndroidCompatibilityFixes(view)
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                applyAndroidCompatibilityFixes(view)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = filePathCallback

                val intent = try {
                    fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "image/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    }
                } catch (_: Exception) {
                    Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "image/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    }
                }

                return try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST)
                    true
                } catch (_: Exception) {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = null
                    false
                }
            }
        }
    }

    private fun applyAndroidCompatibilityFixes(view: WebView) {
        val js = """
            (function () {
                function makeReady() {
                    if (!document.body) return;
                    document.body.classList.remove('aoqat-booting');
                    document.body.classList.add('aoqat-ready');
                    var app = document.querySelector('.app');
                    var workspace = document.querySelector('.workspace');
                    var sidebar = document.querySelector('.sidebar');
                    if (app) { app.style.visibility = 'visible'; app.style.opacity = '1'; }
                    if (workspace) { workspace.style.visibility = 'visible'; workspace.style.opacity = '1'; }
                    if (sidebar) { sidebar.style.visibility = 'visible'; sidebar.style.opacity = '1'; }
                }

                function nativeStatus() {
                    var status = document.getElementById('serverPushStatus');
                    if (!status) return;
                    var text = '✅ داخل نسخة Android يتم استخدام منبّه Android الأصلي، وليس إشعارات المتصفح.';
                    if (status.textContent !== text) status.textContent = text;
                    if (status.style.color !== 'rgb(131, 226, 173)') status.style.color = '#83e2ad';
                    status.style.borderLeftColor = '#2dbe73';
                }

                function wireNativeAlarm() {
                    document.querySelectorAll('button').forEach(function (button) {
                        var text = (button.innerText || '').trim();
                        if (text.indexOf('تفعيل تنبيه النشر على الهاتف') === -1) return;
                        if (button.dataset.androidNativeAlarm === '1') return;

                        var clean = button.cloneNode(true);
                        clean.dataset.androidNativeAlarm = '1';
                        button.parentNode.replaceChild(clean, button);
                        clean.addEventListener('click', function (event) {
                            event.preventDefault();
                            event.stopPropagation();
                            event.stopImmediatePropagation();
                            if (window.AndroidNative && AndroidNative.enableAlarm) {
                                AndroidNative.enableAlarm();
                                setTimeout(nativeStatus, 50);
                                setTimeout(nativeStatus, 1000);
                            }
                        }, true);
                    });
                }

                // Do NOT observe the whole DOM here. A previous MutationObserver reacted
                // to its own status updates and could keep the WebView main thread busy,
                // making the screen visible but untouchable.
                if (!window.__aoqatAndroidPeriodicFix) {
                    window.__aoqatAndroidPeriodicFix = true;
                    var runs = 0;
                    var timer = setInterval(function () {
                        makeReady();
                        wireNativeAlarm();
                        nativeStatus();
                        runs++;
                        if (runs >= 12) clearInterval(timer);
                    }, 500);
                }

                if (!window.__aoqatAndroidAnchorPatched) {
                    window.__aoqatAndroidAnchorPatched = true;
                    var originalClick = HTMLAnchorElement.prototype.click;
                    HTMLAnchorElement.prototype.click = function () {
                        var anchor = this;
                        var href = anchor.href || '';
                        var filename = anchor.download || 'prayer-preview.jpg';

                        if (anchor.download && href.indexOf('blob:') === 0 && window.AndroidNative) {
                            try {
                                fetch(href).then(function (response) { return response.blob(); }).then(function (blob) {
                                    var reader = new FileReader();
                                    reader.onloadend = function () {
                                        try { AndroidNative.saveDataUrl(String(reader.result || ''), filename); } catch (e) {}
                                    };
                                    reader.readAsDataURL(blob);
                                }).catch(function () { originalClick.call(anchor); });
                                return;
                            } catch (e) {}
                        }

                        if (anchor.download && href.indexOf('data:image/') === 0 && window.AndroidNative) {
                            try {
                                AndroidNative.saveDataUrl(href, filename);
                                return;
                            } catch (e) {}
                        }

                        return originalClick.call(anchor);
                    };
                }

                makeReady();
                wireNativeAlarm();
                nativeStatus();
            })();
        """.trimIndent()
        view.evaluateJavascript(js, null)
    }

    inner class AndroidBridge {
        @JavascriptInterface
        fun enableAlarm() {
            runOnUiThread {
                requestNotificationPermissionIfNeeded()
                openExactAlarmSettingsIfNeeded()
                AlarmScheduler.scheduleFromDatabase(this@MainActivity)
                Toast.makeText(
                    this@MainActivity,
                    "تم تفعيل منبّه Android الأصلي وسيُجدول حسب وقت العشاء + 35 دقيقة",
                    Toast.LENGTH_LONG
                ).show()
                webView.postDelayed({ applyAndroidCompatibilityFixes(webView) }, 100L)
            }
        }

        @JavascriptInterface
        fun saveDataUrl(dataUrl: String, filename: String) {
            Thread {
                try {
                    val comma = dataUrl.indexOf(',')
                    if (comma <= 0) throw IllegalArgumentException("Invalid data URL")
                    val header = dataUrl.substring(0, comma)
                    val encoded = dataUrl.substring(comma + 1)
                    val mime = when {
                        header.contains("image/png") -> "image/png"
                        header.contains("image/webp") -> "image/webp"
                        else -> "image/jpeg"
                    }
                    val extension = when (mime) {
                        "image/png" -> ".png"
                        "image/webp" -> ".webp"
                        else -> ".jpg"
                    }
                    val safeName = filename.ifBlank { "prayer-preview$extension" }.let {
                        if (it.contains('.')) it else it + extension
                    }
                    val bytes = Base64.decode(encoded, Base64.DEFAULT)
                    saveImage(bytes, mime, safeName)
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "تم حفظ الصورة في الهاتف", Toast.LENGTH_LONG).show()
                    }
                } catch (_: Exception) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "تعذر حفظ الصورة، أعد المحاولة", Toast.LENGTH_LONG).show()
                    }
                }
            }.start()
        }
    }

    private fun saveImage(bytes: ByteArray, mime: String, filename: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, filename)
                put(MediaStore.Images.Media.MIME_TYPE, mime)
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/TaqawimAlSalah")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
            val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Unable to create image")
            contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                ?: throw IllegalStateException("Unable to write image")
            values.clear()
            values.put(MediaStore.Images.Media.IS_PENDING, 0)
            contentResolver.update(uri, values, null, null)
        } else {
            if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread {
                    requestPermissions(arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), STORAGE_PERMISSION_REQUEST)
                }
                throw SecurityException("Storage permission required")
            }
            val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "TaqawimAlSalah")
            if (!dir.exists()) dir.mkdirs()
            FileOutputStream(File(dir, filename)).use { it.write(bytes) }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != FILE_CHOOSER_REQUEST) return

        val result = if (resultCode == RESULT_OK) {
            WebChromeClient.FileChooserParams.parseResult(resultCode, data)
        } else {
            null
        }
        fileCallback?.onReceiveValue(result)
        fileCallback = null
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_PERMISSION_REQUEST)
        }
    }

    private fun openExactAlarmSettingsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = getSystemService(ALARM_SERVICE) as AlarmManager
            if (!alarmManager.canScheduleExactAlarms()) {
                try {
                    startActivity(
                        Intent(
                            Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                            Uri.parse("package:$packageName")
                        )
                    )
                } catch (_: Exception) {
                    startActivity(Intent(Settings.ACTION_SETTINGS))
                }
            }
        }
    }

    companion object {
        private const val FILE_CHOOSER_REQUEST = 3011
        private const val NOTIFICATION_PERMISSION_REQUEST = 2001
        private const val STORAGE_PERMISSION_REQUEST = 2002
    }
}
