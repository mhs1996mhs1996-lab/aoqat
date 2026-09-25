package com.aoqat.calendar

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
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
import androidx.core.app.NotificationCompat
import java.io.File
import java.io.FileOutputStream


object IqamaPersistentNotification {
    const val CHANNEL_ID = "iqama_persistent_v122"
    const val NOTIFICATION_ID = 45221
    private const val REQUEST_SWITCH = 45222
    private const val REQUEST_HIDE = 45223

    fun ensureChannel(context: android.content.Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val manager = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(CHANNEL_ID, "إشعار الإقامة", NotificationManager.IMPORTANCE_LOW).apply {
            description = "إشعار ثابت للوقت المتبقي أو المنقضي على الإقامة"
            setSound(null, null)
            enableVibration(false)
            setShowBadge(false)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        }
        manager.createNotificationChannel(channel)
    }

    private fun secondsFrom(text: String): Long {
        val m = Regex("(\\d{1,2}):(\\d{2})").find(text) ?: return 0L
        return (m.groupValues[1].toLongOrNull() ?: 0L) * 60L + (m.groupValues[2].toLongOrNull() ?: 0L)
    }

    fun show(context: android.content.Context, text: String) {
        ensureChannel(context)
        val elapsed = text.contains("مضى على الإقامة")
        val seconds = secondsFrom(text).coerceAtLeast(0L)
        val now = System.currentTimeMillis()
        val base = if (elapsed) now - seconds * 1000L else now + seconds * 1000L
        val intent = Intent(context, IqamaNotificationService::class.java)
            .setAction("SHOW")
            .putExtra("elapsed", elapsed)
            .putExtra("base", base)
        startSafely(context, intent)

        if (elapsed) {
            schedule(context, "HIDE", (10L * 60L - seconds).coerceAtLeast(1L), REQUEST_HIDE)
        } else {
            schedule(context, "SWITCH", seconds.coerceAtLeast(1L), REQUEST_SWITCH)
        }
    }

    fun showElapsed(context: android.content.Context) {
        ensureChannel(context)
        val intent = Intent(context, IqamaNotificationService::class.java)
            .setAction("SHOW")
            .putExtra("elapsed", true)
            .putExtra("base", System.currentTimeMillis())
        startSafely(context, intent)
        schedule(context, "HIDE", 10L * 60L, REQUEST_HIDE)
    }

    private fun startSafely(context: android.content.Context, intent: Intent) {
        try {
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
        } catch (_: Exception) {
            // Never let a foreground-service restriction close the app.
            val manager = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.cancel(NOTIFICATION_ID)
        }
    }

    private fun schedule(context: android.content.Context, action: String, seconds: Long, request: Int) {
        val am = context.getSystemService(android.content.Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, IqamaNotificationReceiver::class.java).setAction(action)
        val pi = PendingIntent.getBroadcast(context, request, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val at = System.currentTimeMillis() + seconds * 1000L
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        }
    }

    fun hide(context: android.content.Context) {
        context.getSharedPreferences("iqama_service_state", android.content.Context.MODE_PRIVATE).edit().putBoolean("active", false).apply()
        context.stopService(Intent(context, IqamaNotificationService::class.java))
        val manager = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(NOTIFICATION_ID)
        val am = context.getSystemService(android.content.Context.ALARM_SERVICE) as AlarmManager
        listOf("SWITCH" to REQUEST_SWITCH, "HIDE" to REQUEST_HIDE).forEach { (action, request) ->
            val pi = PendingIntent.getBroadcast(context, request, Intent(context, IqamaNotificationReceiver::class.java).setAction(action), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
            if (pi != null) am.cancel(pi)
        }
    }
}

class IqamaNotificationService : android.app.Service() {
    private var elapsed=false
    private var base=0L
    private var wakeLock: android.os.PowerManager.WakeLock? = null
    private val handler=android.os.Handler(android.os.Looper.getMainLooper())
    private val prefs by lazy { getSharedPreferences("iqama_service_state", android.content.Context.MODE_PRIVATE) }
    private val ticker=object:Runnable{
        override fun run(){
            val now=System.currentTimeMillis()
            if(!elapsed && now>=base){
                elapsed=true
                prefs.edit().putBoolean("elapsed",true).putLong("base",base).apply()
            }
            if(elapsed && now-base>=10L*60L*1000L){ stopSelf(); return }
            val n=buildNotification(now)
            (getSystemService(android.content.Context.NOTIFICATION_SERVICE) as NotificationManager).notify(IqamaPersistentNotification.NOTIFICATION_ID,n)
            handler.postDelayed(this,1000L-(System.currentTimeMillis()%1000L))
        }
    }
    override fun onBind(intent:Intent?)=null
    override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int{
        if(intent?.action=="SHOW"){
            elapsed=intent.getBooleanExtra("elapsed",false);base=intent.getLongExtra("base",System.currentTimeMillis())
            prefs.edit().putBoolean("active",true).putBoolean("elapsed",elapsed).putLong("base",base).apply()
        }else{elapsed=prefs.getBoolean("elapsed",false);base=prefs.getLong("base",System.currentTimeMillis())}
        startForeground(IqamaPersistentNotification.NOTIFICATION_ID,buildNotification(System.currentTimeMillis()))
        val pm=getSystemService(android.content.Context.POWER_SERVICE) as android.os.PowerManager
        if(wakeLock?.isHeld!=true) wakeLock=pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK,"aoqat:iqamaCountdown").apply{setReferenceCounted(false);acquire(25L*60L*1000L)}
        handler.removeCallbacks(ticker);handler.post(ticker)
        return START_STICKY
    }
    private fun clock(now:Long):String{
        val s=(if(elapsed)(now-base)/1000L else (base-now+999L)/1000L).coerceAtLeast(0L)
        val h=s/3600;val m=(s%3600)/60;val sec=s%60
        return if(h>0) String.format(java.util.Locale.US,"%02d:%02d:%02d",h,m,sec) else String.format(java.util.Locale.US,"%02d:%02d",m,sec)
    }
    private fun buildNotification(now:Long):android.app.Notification{
        val title=if(elapsed)"مضى على الإقامة" else "باقي على الإقامة";val value=clock(now)
        val openPending=PendingIntent.getActivity(this,45220,Intent(this,MainActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n=NotificationCompat.Builder(this,IqamaPersistentNotification.CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(title).setContentText(value)
            .setContentIntent(openPending).setPriority(NotificationCompat.PRIORITY_LOW).setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setOngoing(true).setAutoCancel(false).setOnlyAlertOnce(true).setSilent(true)
            .setShowWhen(false).build()
        n.flags=n.flags or android.app.Notification.FLAG_ONGOING_EVENT or android.app.Notification.FLAG_NO_CLEAR or android.app.Notification.FLAG_FOREGROUND_SERVICE
        return n
    }
    override fun onTaskRemoved(rootIntent:Intent?){super.onTaskRemoved(rootIntent)}
    override fun onDestroy(){handler.removeCallbacks(ticker);if(wakeLock?.isHeld==true)wakeLock?.release();wakeLock=null;prefs.edit().putBoolean("active",false).apply();stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy()}
}
class IqamaNotificationReceiver : android.content.BroadcastReceiver() {
    override fun onReceive(context: android.content.Context, intent: Intent?) {
        when (intent?.action) {
            "NATIVE_START" -> {
                val base = intent.getLongExtra("base", System.currentTimeMillis())
                val nativeIntent = Intent(context, IqamaNotificationService::class.java).setAction("SHOW").putExtra("elapsed", false).putExtra("base", base)
                try { if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(nativeIntent) else context.startService(nativeIntent) } catch (_: Exception) {}
                val seconds = ((base - System.currentTimeMillis()) / 1000L).coerceAtLeast(1L)
                val am = context.getSystemService(android.content.Context.ALARM_SERVICE) as AlarmManager
                val sw = Intent(context, IqamaNotificationReceiver::class.java).setAction("SWITCH")
                val pi = PendingIntent.getBroadcast(context, 45222, sw, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + seconds * 1000L, pi)
            }
            "SWITCH" -> IqamaPersistentNotification.showElapsed(context)
            "HIDE" -> IqamaPersistentNotification.hide(context)
        }
    }
}

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
        requestExactAlarmAccessIfNeeded()
        AlarmScheduler.scheduleFromDatabase(this)
        IqamaNativeScheduler.schedule(this)
        restoreIqamaServiceIfActive()

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
        IqamaNativeScheduler.schedule(this)
        if (::webView.isInitialized) {
            webView.postDelayed({ applyAndroidCompatibilityFixes(webView) }, 250L)
        }
    }

    private fun requestExactAlarmAccessIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = getSystemService(ALARM_SERVICE) as AlarmManager
            if (!am.canScheduleExactAlarms()) {
                try {
                    startActivity(Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, android.net.Uri.parse("package:$packageName")))
                } catch (_: Exception) {}
            }
        }
    }

    private fun restoreIqamaServiceIfActive() {
        val prefs = getSharedPreferences("iqama_service_state", MODE_PRIVATE)
        if (!prefs.getBoolean("active", false)) return
        val elapsed = prefs.getBoolean("elapsed", false)
        val base = prefs.getLong("base", 0L)
        if (base <= 0L) return
        val now = System.currentTimeMillis()
        val stillValid = if (elapsed) now - base < 10L * 60L * 1000L else base > now
        if (!stillValid) {
            IqamaPersistentNotification.hide(this)
            return
        }
        val intent = Intent(this, IqamaNotificationService::class.java)
            .setAction("SHOW")
            .putExtra("elapsed", elapsed)
            .putExtra("base", base)
        try {
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent) else startService(intent)
        } catch (_: Exception) {}
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
                        if (text.indexOf('تنبيه النشر على الهاتف') === -1) return;
                        if (button.dataset.androidNativeAlarm === '1') return;

                        var clean = button.cloneNode(true);
                        clean.dataset.androidNativeAlarm = '1';
                        button.parentNode.replaceChild(clean, button);

                        function draw(enabled) {
                            clean.dataset.androidAlarmEnabled = enabled ? '1' : '0';
                            clean.style.setProperty('background', enabled ? '#12a957' : '#7f9191', 'important');
                            clean.style.setProperty('border-color', enabled ? '#0b8f48' : '#708181', 'important');
                            clean.style.setProperty('color', '#fff', 'important');
                            clean.innerHTML = enabled
                                ? '🔔 تنبيه النشر على الهاتف <span style="margin-inline-start:12px;padding:4px 14px;border-radius:999px;background:rgba(255,255,255,.16)">تشغيل</span>'
                                : '🔔 تنبيه النشر على الهاتف <span style="margin-inline-start:12px;padding:4px 14px;border-radius:999px;background:rgba(255,255,255,.16)">إيقاف</span>';
                        }

                        var enabled = localStorage.getItem('aoqatAndroidPublishAlarmEnabled') === '1';
                        draw(enabled);

                        clean.addEventListener('click', function (event) {
                            event.preventDefault();
                            event.stopPropagation();
                            event.stopImmediatePropagation();
                            var next = clean.dataset.androidAlarmEnabled !== '1';
                            if (next) {
                                if (window.AndroidNative && AndroidNative.enableAlarm) AndroidNative.enableAlarm();
                                localStorage.setItem('aoqatAndroidPublishAlarmEnabled', '1');
                            } else {
                                if (window.AndroidNative && AndroidNative.disableAlarm) AndroidNative.disableAlarm();
                                localStorage.setItem('aoqatAndroidPublishAlarmEnabled', '0');
                            }
                            draw(next);
                            setTimeout(nativeStatus, 50);
                            setTimeout(nativeStatus, 1000);
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
        fun disableAlarm() {
            runOnUiThread {
                AlarmScheduler.cancel(this@MainActivity)
                Toast.makeText(this@MainActivity, "تم إيقاف منبّه النشر على الهاتف", Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun showIqamaNotification(text: String) {
            runOnUiThread {
                requestNotificationPermissionIfNeeded()
                IqamaPersistentNotification.show(this@MainActivity, text)
            }
        }

        @JavascriptInterface
        fun hideIqamaNotification() {
            runOnUiThread {
                IqamaPersistentNotification.hide(this@MainActivity)
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
