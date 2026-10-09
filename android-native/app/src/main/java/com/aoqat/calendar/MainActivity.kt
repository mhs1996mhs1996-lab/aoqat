package com.aoqat.calendar

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
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
    private var dispatchLock: android.os.PowerManager.WakeLock? = null

    @Synchronized fun releaseDispatchLock() {
        if (dispatchLock?.isHeld == true) dispatchLock?.release()
        dispatchLock = null
    }

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

    // Only native prayer alarms may start a cycle. WebView text is never a clock source.
    fun startCycle(context: android.content.Context, prayerAt: Long, prayerId: String) {
        if(FridaySchedule.suppress(context,prayerId,prayerAt))return
        val age = System.currentTimeMillis() - prayerAt
        if (!IqamaNativeScheduler.enabled(context) || prayerId.isBlank() || age < 0) return
        if (age >= IqamaNativeScheduler.durations(context, prayerId).totalMs) {
            val state = context.getSharedPreferences("iqama_service_state", android.content.Context.MODE_PRIVATE)
            if (state.getLong("prayerAt", 0L) == prayerAt) hide(context)
            return
        }
        ensureChannel(context)
        val intent = Intent(context, IqamaNotificationService::class.java)
            .setAction("START_CYCLE").putExtra("prayerAt", prayerAt).putExtra("prayerId", prayerId)
        synchronized(this) {
            releaseDispatchLock()
            val pm = context.getSystemService(android.content.Context.POWER_SERVICE) as android.os.PowerManager
            dispatchLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "aoqat:iqamaDispatch")
                .apply { setReferenceCounted(false); acquire(15_000L) }
        }
        try { context.startForegroundService(intent) }
        catch (e: Exception) { releaseDispatchLock();android.util.Log.e("IqamaCycle", "Cannot start notification service", e) }
    }

    fun scheduleBoundary(context: android.content.Context, prayerAt: Long, deadline: Long, finish: Boolean) {
        val am = context.getSystemService(android.content.Context.ALARM_SERVICE) as AlarmManager
        val action = if (finish) "EXPIRE" else "PHASE_BOUNDARY"
        val request = if (finish) REQUEST_HIDE else REQUEST_SWITCH
        val intent = Intent(context, IqamaNotificationReceiver::class.java)
            .setAction(action).putExtra("prayerAt", prayerAt)
        val pi = PendingIntent.getBroadcast(context, request, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, deadline, pi)
        } else am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, deadline, pi)
    }

    fun hide(context: android.content.Context) {
        context.getSharedPreferences("iqama_service_state", android.content.Context.MODE_PRIVATE).edit().putBoolean("active", false).apply()
        context.stopService(Intent(context, IqamaNotificationService::class.java))
        val manager = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(NOTIFICATION_ID)
        val am = context.getSystemService(android.content.Context.ALARM_SERVICE) as AlarmManager
        listOf("SWITCH" to REQUEST_SWITCH, "HIDE" to REQUEST_HIDE, "EXPIRE" to REQUEST_HIDE, "PHASE_BOUNDARY" to REQUEST_SWITCH).forEach { (action, request) ->
            val pi = PendingIntent.getBroadcast(context, request, Intent(context, IqamaNotificationReceiver::class.java).setAction(action), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
            if (pi != null) am.cancel(pi)
        }
    }
}

class IqamaNotificationService : android.app.Service() {
    private var prayerAt = 0L
    private var prayerId = ""
    private var startRealtime = 0L
    private var wakeLock: android.os.PowerManager.WakeLock? = null
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())
    private val prefs by lazy { getSharedPreferences("iqama_service_state", MODE_PRIVATE) }
    private var publishedPhase: IqamaCycle.Phase? = null
    private val screenReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: android.content.Context, intent: Intent?) { reconcile(force = true) }
    }
    private val boundary = Runnable { reconcile() }

    override fun onCreate() {
        super.onCreate()
        val filter = android.content.IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(screenReceiver, filter, RECEIVER_NOT_EXPORTED)
        else @Suppress("DEPRECATION") registerReceiver(screenReceiver, filter)
    }

    // SystemUI ticks its Chronometers locally. The app only publishes phase changes
    // or reattaches a surface, avoiding per-second notify() throttling/cached text.
    private fun reconcile(force: Boolean = false) {
        if (prayerAt <= 0L) return
        val display = IqamaCycle.display(startRealtime, android.os.SystemClock.elapsedRealtime(), IqamaNativeScheduler.durations(this, prayerId))
        if (FridaySchedule.suppress(this,prayerId,prayerAt) || !IqamaNativeScheduler.enabled(this) || display == null) {
            finishCycle(); return
        }
        if (force || publishedPhase != display.phase) {
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .notify(IqamaPersistentNotification.NOTIFICATION_ID, buildNotification(display))
            publishedPhase = display.phase
        }
        handler.removeCallbacks(boundary)
        handler.postDelayed(boundary, (display.nextBoundary - android.os.SystemClock.elapsedRealtime()).coerceAtLeast(1L))
    }


    override fun onBind(intent: Intent?) = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val incoming = if (intent?.action == "START_CYCLE") intent.getLongExtra("prayerAt", 0L)
            else prefs.getLong("prayerAt", 0L)
        prayerId = if (intent?.action == "START_CYCLE") intent.getStringExtra("prayerId") ?: ""
            else prefs.getString("prayerId", "") ?: ""
        val boot = Settings.Global.getInt(contentResolver, Settings.Global.BOOT_COUNT, -1)
        // Preserve the monotonic anchor across duplicate alarms and process restarts.
        if (incoming != prayerAt || startRealtime == 0L) {
            prayerAt = incoming
            val storedStart = prefs.getLong("startRealtime", 0L)
            val sameCycle = prefs.getLong("prayerAt", 0L) == prayerAt &&
                prefs.getInt("boot", -2) == boot && boot >= 0 && prefs.contains("startRealtime") && storedStart <= android.os.SystemClock.elapsedRealtime()
            startRealtime = if (sameCycle) storedStart else
                android.os.SystemClock.elapsedRealtime() - (System.currentTimeMillis() - prayerAt)
        }
        val nowRealtime = android.os.SystemClock.elapsedRealtime()
        val durations = IqamaNativeScheduler.durations(this, prayerId)
        val display = IqamaCycle.display(startRealtime, nowRealtime, durations)
        if (prayerAt <= 0L || prayerId.isBlank() || !IqamaNativeScheduler.enabled(this) ||
            display == null) {
            finishCycle(); return START_NOT_STICKY
        }
        prefs.edit().putBoolean("active", true).putLong("prayerAt", prayerAt)
            .putString("prayerId", prayerId)
            .putLong("startRealtime", startRealtime).putInt("boot", boot).commit()
        IqamaPersistentNotification.ensureChannel(this)
        startForeground(IqamaPersistentNotification.NOTIFICATION_ID, buildNotification(display))
        publishedPhase = display.phase
        val remaining = (durations.totalMs - (nowRealtime - startRealtime)).coerceAtLeast(1L)
        if (wakeLock?.isHeld == true) wakeLock?.release()
        run {
            val pm = getSystemService(POWER_SERVICE) as android.os.PowerManager
            wakeLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "aoqat:iqamaCycle")
                .apply { setReferenceCounted(false); acquire(remaining + 5000L) }
        }
        IqamaPersistentNotification.releaseDispatchLock()
        if (display.countDown) IqamaPersistentNotification.scheduleBoundary(this, prayerAt, startRealtime + durations.beforeMs, finish = false)
        IqamaPersistentNotification.scheduleBoundary(this, prayerAt, startRealtime + durations.totalMs, finish = true)
        reconcile()
        return START_STICKY
    }

    private fun buildNotification(display: IqamaCycle.Display): android.app.Notification =
        IqamaNotificationRenderer.build(this, display)

    private fun finishCycle() {
        IqamaPersistentNotification.releaseDispatchLock()
        handler.removeCallbacks(boundary)
        IqamaPersistentNotification.hide(this)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }
    override fun onDestroy() {
        handler.removeCallbacks(boundary)
        IqamaPersistentNotification.releaseDispatchLock()
        unregisterReceiver(screenReceiver)
        if (wakeLock?.isHeld == true) wakeLock?.release()
        wakeLock = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }
}

object IqamaNotificationRenderer {
    fun build(context: android.content.Context, display: IqamaCycle.Display, customTitle: String? = null): android.app.Notification {
        val title = customTitle ?: if (display.phase == IqamaCycle.Phase.ELAPSED) "مضى على الإقامة" else "باقي على الإقامة"
        val open = PendingIntent.getActivity(context, 45220, Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val view = android.widget.RemoteViews(context.packageName, R.layout.notification_iqama)
        view.setTextViewText(R.id.iqama_state, title)
        view.setChronometerCountDown(R.id.iqama_chronometer, display.countDown)
        view.setChronometer(R.id.iqama_chronometer, display.baseRealtime, null, true)
        fun builder() = NotificationCompat.Builder(context, IqamaPersistentNotification.CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setCustomContentView(view).setCustomBigContentView(view).setCustomHeadsUpContentView(view)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setContentTitle(title).setContentIntent(open)
            .setPriority(NotificationCompat.PRIORITY_LOW).setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true).setAutoCancel(false).setOnlyAlertOnce(true).setSilent(true).setShowWhen(false)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        // Explicit public version: lock-screen hosts receive the same running clock,
        // never a separately formatted/cached numeric fallback.
        val n = builder().setPublicVersion(builder().build()).build()
        n.flags = n.flags or android.app.Notification.FLAG_ONGOING_EVENT or
            android.app.Notification.FLAG_NO_CLEAR or android.app.Notification.FLAG_FOREGROUND_SERVICE
        return n
    }
}

class IqamaNotificationReceiver : android.content.BroadcastReceiver() {
    override fun onReceive(context: android.content.Context, intent: Intent?) {
        when (intent?.action) {
            "REFRESH" -> {
                IqamaNativeScheduler.scheduleCached(context)
                val pending = goAsync()
                Thread { try { IqamaNativeScheduler.refresh(context) } finally { pending.finish() } }.start()
            }
            "NATIVE_START" -> {
                val id = intent.getStringExtra("prayerId") ?: ""
                if (id.isNotBlank()) IqamaPersistentNotification.startCycle(context, intent.getLongExtra("prayerAt", 0L), id)
                IqamaNativeScheduler.scheduleCached(context, recoverActive = false)
            }
            "PHASE_BOUNDARY", "EXPIRE" -> {
                val prefs = context.getSharedPreferences("iqama_service_state", android.content.Context.MODE_PRIVATE)
                if (prefs.getBoolean("active", false) && prefs.getLong("prayerAt", 0L) == intent.getLongExtra("prayerAt", -1L)) {
                    // Reconcile from the persisted anchor, including a late delivery.
                    // Do not reset the zero point at the time the alarm is received.
                    val service = Intent(context, IqamaNotificationService::class.java).setAction("RECONCILE")
                    try { context.startForegroundService(service) }
                    catch (e: Exception) {
                        android.util.Log.e("IqamaCycle", "Cannot reconcile phase", e)
                        if (intent.action == "EXPIRE") IqamaPersistentNotification.hide(context)
                    }
                }
            }
            // Old phase alarms must never restart or stop a new cycle after upgrading.
            "SWITCH", "HIDE" -> Unit
        }
    }
}

class MainActivity : Activity() {
    override fun attachBaseContext(base: android.content.Context) {
        super.attachBaseContext(base.createConfigurationContext(DisplayColorPolicy.light(base.resources.configuration)))
    }

    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(DisplayColorPolicy.light(newConfig))
        if (::webView.isInitialized) {
            protectDisplayColors()
            webView.invalidate()
        }
    }

    private fun protectDisplayColors() {
        if (Build.VERSION.SDK_INT >= 29) {
            window.decorView.isForceDarkAllowed = false
            webView.isForceDarkAllowed = false
            @Suppress("DEPRECATION")
            webView.settings.forceDark = WebSettings.FORCE_DARK_OFF
        }
        if (Build.VERSION.SDK_INT >= 33) webView.settings.isAlgorithmicDarkeningAllowed = false
    }


    private lateinit var webView: WebView
    private val ADHAN_AUDIO_REQUEST = 812
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = Color.rgb(5, 24, 34)
        window.navigationBarColor = Color.rgb(4, 18, 26)
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(true)
        }

        webView = WebView(this).apply {
            if (Build.VERSION.SDK_INT >= 29) isForceDarkAllowed = false
            setBackgroundColor(Color.rgb(5, 24, 34))
        }
        setContentView(webView)

        if (Build.VERSION.SDK_INT >= 29) window.decorView.isForceDarkAllowed = false
        configureWebView()
        protectDisplayColors()
        requestNotificationPermissionIfNeeded()
        requestExactAlarmAccessIfNeeded()
        AlarmScheduler.scheduleFromDatabase(this)
        IqamaNativeScheduler.schedule(this)
        AdhanSchedule.schedule(this)
        if (!AdhanPlaybackService.running) AdhanPlaybackService.restoreVolume(this)
        AdhanPlaybackService.restoreRingerIfExpired(this)
        if (AdhanSchedule.settings(this).optBoolean("persistent")) NextPrayerService.start(this)
        restoreIqamaServiceIfActive()
        if (AdhanSchedule.enabled(this)) requestIqamaBackgroundAccessIfNeeded(forAdhan = true)
        else if (IqamaNativeScheduler.enabled(this)) requestIqamaBackgroundAccessIfNeeded()

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
        if (::webView.isInitialized) protectDisplayColors()
        if (!PrayerAlarmAudio.running) PrayerAlarmAudio.restore(this)
        PrayerAlarm.schedule(this)
        if(::webView.isInitialized)webView.evaluateJavascript("window.aoqatPrayerAlarmNativeSettings?.("+PrayerAlarm.settings(this).toString()+")",null)
        AlarmScheduler.scheduleFromDatabase(this)
        IqamaNativeScheduler.schedule(this)
        AdhanSchedule.schedule(this)
        if (!AdhanPlaybackService.running) AdhanPlaybackService.restoreVolume(this)
        AdhanPlaybackService.restoreRingerIfExpired(this)
        if (AdhanSchedule.settings(this).optBoolean("persistent")) NextPrayerService.start(this)
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

    private fun requestIqamaBackgroundAccessIfNeeded(force: Boolean = false, forAdhan: Boolean = false) {
        val pm = getSystemService(POWER_SERVICE) as android.os.PowerManager
        if (pm.isIgnoringBatteryOptimizations(packageName)) return
        val asked = getSharedPreferences("iqama_schedule", MODE_PRIVATE)
        val key = if (forAdhan) "adhanBackgroundAccessRequestedV126" else "backgroundAccessRequestedV125"
        if (!force && asked.getBoolean(key, false)) return
        asked.edit().putBoolean(key, true).apply()
        try {
            Toast.makeText(this, if (forAdhan) "اسمح بالعمل في الخلفية حتى يعمل الأذان بدون فتح البرنامج" else "اسمح بالعمل في الخلفية حتى يظهر إشعار الإقامة بدون فتح البرنامج", Toast.LENGTH_LONG).show()
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        } catch (e: Exception) { android.util.Log.w("IqamaCycle", "Cannot open background access settings", e) }
    }

    private fun restoreIqamaServiceIfActive() {
        val prefs = getSharedPreferences("iqama_service_state", MODE_PRIVATE)
        if (!prefs.getBoolean("active", false)) return
        val prayerAt = prefs.getLong("prayerAt", 0L)
        if (prayerAt <= 0L) { IqamaPersistentNotification.hide(this); return }
        val id = prefs.getString("prayerId", "") ?: ""
        if (id.isBlank()) IqamaPersistentNotification.hide(this)
        else IqamaPersistentNotification.startCycle(this, prayerAt, id)
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
            // Keep the prayer designs in their authored colors even when the phone uses dark mode.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                isAlgorithmicDarkeningAllowed = false
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                @Suppress("DEPRECATION")
                forceDark = WebSettings.FORCE_DARK_OFF
            }
        }

        webView.addJavascriptInterface(AndroidBridge(), "AndroidNative")

        val mushafStore = MushafAssetStore(this)
        if (Build.VERSION.SDK_INT >= 33) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, phoneBackCallback)
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: android.webkit.WebResourceRequest): android.webkit.WebResourceResponse? {
                return if (request.method == "GET") mushafStore.response(request.url) else null
            }

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
        @JavascriptInterface fun readIqamaTiming():String {
            val prefs=getSharedPreferences("iqama_schedule",MODE_PRIVATE)
            return org.json.JSONObject().put("enabled",prefs.getBoolean("enabled",false))
                .put("minutes",org.json.JSONObject(prefs.getString("minutes","{}")?:"{}"))
                .put("afterMinutes",org.json.JSONObject(prefs.getString("afterMinutes","{}")?:"{}")).toString()
        }
        @JavascriptInterface fun iqamaNotificationPermission():Boolean {
            val manager=getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            return manager.areNotificationsEnabled() && manager.getNotificationChannel(IqamaPersistentNotification.CHANNEL_ID)?.importance != NotificationManager.IMPORTANCE_NONE
        }
        @JavascriptInterface fun iqamaBackgroundPermission():Boolean =
            (getSystemService(POWER_SERVICE) as android.os.PowerManager).isIgnoringBatteryOptimizations(packageName)
        @JavascriptInterface fun requestIqamaBackgroundPermission() { runOnUiThread { requestIqamaBackgroundAccessIfNeeded(force = true) } }

        @JavascriptInterface fun prayerAlarmReadiness():String {
            val am=getSystemService(ALARM_SERVICE) as AlarmManager
            if(Build.VERSION.SDK_INT>=31&&!am.canScheduleExactAlarms())return "الرنين يحتاج السماح بالمنبّهات الدقيقة من إعدادات الهاتف"
            val nm=getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            if(!nm.areNotificationsEnabled()||nm.getNotificationChannel("prayer_alarm_v1")?.importance==NotificationManager.IMPORTANCE_NONE)return "اسمح بإشعارات منبّه الصلاة حتى يظهر المنبّه على الهاتف"
            if(PrayerAlarm.events(this@MainActivity).none{it.at>System.currentTimeMillis()})return "المواقيت غير متوفرة: اتصل بالإنترنت مرة لتحديثها"
            return "الرنين يعمل بالخلفية حسب المواقيت المحفوظة"
        }
        @JavascriptInterface fun readPrayerAlarmSettings():String = PrayerAlarm.settings(this@MainActivity).toString()
        @JavascriptInterface fun configurePrayerAlarm(json:String){runOnUiThread{try{val s=org.json.JSONObject(json);PrayerAlarm.configure(this@MainActivity,json);if(s.optBoolean("enabled")){requestNotificationPermissionIfNeeded();requestExactAlarmAccessIfNeeded();requestIqamaBackgroundAccessIfNeeded(forAdhan=true);if(Build.VERSION.SDK_INT>=34&&!(getSystemService(NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent())startActivity(Intent(android.provider.Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,Uri.parse("package:$packageName")))};}catch(_:Exception){Toast.makeText(this@MainActivity,"تعذر حفظ المنبّه",Toast.LENGTH_LONG).show()}}}
        @JavascriptInterface fun previewPrayerAlarm(id:String){runOnUiThread{if(id in PrayerAlarm.ids){requestNotificationPermissionIfNeeded();PrayerAlarm.start(this@MainActivity,id,preview=true)}}}
        @JavascriptInterface fun stopPrayerAlarm(){stopService(Intent(this@MainActivity,PrayerAlarmService::class.java))}
        @JavascriptInterface fun choosePrayerAlarmTone(id:String,system:Boolean){runOnUiThread{if(id in PrayerAlarm.ids){prayerAlarmToneId=id;val pick=if(system)Intent(android.media.RingtoneManager.ACTION_RINGTONE_PICKER).putExtra(android.media.RingtoneManager.EXTRA_RINGTONE_TYPE,android.media.RingtoneManager.TYPE_ALARM) else Intent(Intent.ACTION_OPEN_DOCUMENT).apply{type="audio/*";addCategory(Intent.CATEGORY_OPENABLE)};startActivityForResult(pick,if(system)8202 else 8201)}}}
        @JavascriptInterface fun readAdhanSettings(): String = AdhanSchedule.settings(this@MainActivity).toString()
        @JavascriptInterface fun configureAdhan(json: String) { runOnUiThread {
            try {
                val settings=org.json.JSONObject(json)
                if(settings.optBoolean("enabled") || settings.optJSONObject("friday")?.optBoolean("enabled")==true || settings.optBoolean("persistent")) { requestNotificationPermissionIfNeeded(); requestExactAlarmAccessIfNeeded() }
                if((settings.optInt("afterSilent")>0 || settings.optJSONObject("afterIqamaSilent")?.optBoolean("enabled")==true) && !(getSystemService(NOTIFICATION_SERVICE) as NotificationManager).isNotificationPolicyAccessGranted) {
                    settings.put("afterSilent",0)
                    settings.optJSONObject("afterIqamaSilent")?.put("enabled",false)
                    startActivity(Intent(android.provider.Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS))
                    webView.evaluateJavascript("window.aoqatAdhanStatus?.('امنح إذن التحكم بوضع الصامت ثم حدّد المدة مرة أخرى')",null)
                }
                if(settings.optBoolean("screen") && Build.VERSION.SDK_INT>=34 && !(getSystemService(NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()) {
                    settings.put("screen",false)
                    startActivity(Intent(android.provider.Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,Uri.parse("package:$packageName")))
                }
                if(settings.optJSONObject("friday")?.optBoolean("enabled")==true&&settings.optJSONObject("friday")?.optBoolean("quiet",true)==true&&!(getSystemService(NOTIFICATION_SERVICE) as NotificationManager).isNotificationPolicyAccessGranted){settings.getJSONObject("friday").put("quiet",false);startActivity(Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS));webView.evaluateJavascript("window.aoqatAdhanStatus?.('امنح إذن الصامت ثم فعّل صامت الجمعة مرة أخرى')",null)}
                AdhanSchedule.configure(this@MainActivity,settings.toString())
                if(settings.optBoolean("enabled") || settings.optJSONObject("friday")?.optBoolean("enabled")==true) requestIqamaBackgroundAccessIfNeeded(forAdhan = true)
                if(settings.toString()!=org.json.JSONObject(json).toString())webView.evaluateJavascript("window.aoqatNativeAdhanSettings?.("+settings.toString()+")",null)
            } catch(e:Exception){Toast.makeText(this@MainActivity,"تعذر حفظ إعدادات الأذان",Toast.LENGTH_LONG).show()}
        } }
        @JavascriptInterface fun readQuranAsset(name:String):String {
            if (name !in listOf("quran.json", "quran-pages.json")) return "null"
            return assets.open("www/assets/$name").bufferedReader().use { it.readText() }
        }
        @JavascriptInterface fun readPrayerRows():String = PrayerTimes.rows(this@MainActivity).toString()
        @JavascriptInterface fun cachePrayerRows(json:String){AdhanSchedule.storeRows(this@MainActivity,json)}
        @JavascriptInterface fun previewAdhan(json:String){runOnUiThread{requestNotificationPermissionIfNeeded();try{val s=org.json.JSONObject(json);androidx.core.content.ContextCompat.startForegroundService(this@MainActivity,Intent(this@MainActivity,AdhanPlaybackService::class.java).putExtra("settings",json).putExtra("preview",true).putExtra("prayerId",s.optString("prayerId","fajr")))}catch(_:Exception){Toast.makeText(this@MainActivity,"تعذر تشغيل الصوت",Toast.LENGTH_LONG).show()}}}
        @JavascriptInterface fun stopAdhan(){stopService(Intent(this@MainActivity,AdhanPlaybackService::class.java))}
        @JavascriptInterface fun chooseAdhanAudio(){runOnUiThread{startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply{type="audio/*";addCategory(Intent.CATEGORY_OPENABLE)},ADHAN_AUDIO_REQUEST)}}
        @JavascriptInterface fun pinPrayerWidget(){runOnUiThread{val manager=android.appwidget.AppWidgetManager.getInstance(this@MainActivity);if(manager.isRequestPinAppWidgetSupported)manager.requestPinAppWidget(ComponentName(this@MainActivity,PrayerWidget::class.java),null,null)else Toast.makeText(this@MainActivity,"أضف ودجت أوقات الصلاة من قائمة الودجات في الشاشة الرئيسية",Toast.LENGTH_LONG).show()}}
        @JavascriptInterface fun openQibla(){runOnUiThread{startActivity(Intent(this@MainActivity,QiblaActivity::class.java))}}
        @JavascriptInterface fun adhanPermissions(){runOnUiThread{requestNotificationPermissionIfNeeded();requestExactAlarmAccessIfNeeded();val nm=getSystemService(NOTIFICATION_SERVICE) as NotificationManager;if(!nm.isNotificationPolicyAccessGranted)startActivity(Intent(android.provider.Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS))else if(Build.VERSION.SDK_INT>=34&&!nm.canUseFullScreenIntent())startActivity(Intent(android.provider.Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,Uri.parse("package:$packageName")))else Toast.makeText(this@MainActivity,"أذونات الأذان وشاشة القفل متاحة",Toast.LENGTH_LONG).show()}}

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
        fun configureIqamaNotifications(enabled: Boolean, minutes: String) {
            configureIqamaTiming(enabled, minutes, "{}")
        }

        @JavascriptInterface
        fun configureIqamaTiming(enabled: Boolean, minutes: String, afterMinutes: String) {
            runOnUiThread {
                if (enabled) {
                    requestNotificationPermissionIfNeeded()
                    requestExactAlarmAccessIfNeeded()
                }
                if(enabled){
                    IqamaPersistentNotification.ensureChannel(this@MainActivity)
                    val manager=getSystemService(NOTIFICATION_SERVICE) as NotificationManager
                    if(manager.getNotificationChannel(IqamaPersistentNotification.CHANNEL_ID)?.importance==NotificationManager.IMPORTANCE_NONE){
                        startActivity(Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,packageName).putExtra(Settings.EXTRA_CHANNEL_ID,IqamaPersistentNotification.CHANNEL_ID))
                    }else if(!manager.areNotificationsEnabled()&&(Build.VERSION.SDK_INT<33||checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)){
                        startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,packageName))
                    }
                }
                IqamaNativeScheduler.configure(this@MainActivity, enabled, minutes, afterMinutes)
                if(enabled)requestIqamaBackgroundAccessIfNeeded()
            }
        }

        // Compatibility bridge only. UI text never owns the native clock lifecycle.
        @JavascriptInterface
        fun showIqamaNotification(text: String) = Unit

        @JavascriptInterface
        fun hideIqamaNotification() = Unit

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

    private var prayerAlarmToneId=""
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if(requestCode==8201||requestCode==8202){
            val id=prayerAlarmToneId;val uri=if(resultCode==RESULT_OK){if(requestCode==8202)data?.getParcelableExtra<Uri>(android.media.RingtoneManager.EXTRA_RINGTONE_PICKED_URI)else data?.data}else null
            if(uri!=null&&id in PrayerAlarm.ids)Thread{try{
                var name="نغمة الهاتف"
                if(requestCode==8201){val temp=File(filesDir,"prayer-alarm-$id.tmp");contentResolver.openInputStream(uri)?.use{input->FileOutputStream(temp).use{out->val buf=ByteArray(8192);var count=0L;while(true){val n=input.read(buf);if(n<0)break;count+=n;if(count>25*1024*1024)throw IllegalArgumentException();out.write(buf,0,n)}}}?:throw IllegalArgumentException();val retriever=android.media.MediaMetadataRetriever();try{retriever.setDataSource(temp.absolutePath);if(retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()==null)throw IllegalArgumentException()}finally{retriever.release()};if(!temp.renameTo(File(filesDir,"prayer-alarm-$id")))throw IllegalStateException();contentResolver.query(uri,arrayOf(android.provider.OpenableColumns.DISPLAY_NAME),null,null,null)?.use{if(it.moveToFirst())name=it.getString(0)}}else name=android.media.RingtoneManager.getRingtone(this,uri)?.getTitle(this)?:name
                val tone=org.json.JSONObject().put("kind",if(requestCode==8201)"custom"else"system").put("value",if(requestCode==8202)uri.toString()else"").put("name",name)
                runOnUiThread{webView.evaluateJavascript("window.aoqatPrayerAlarmToneChosen?.("+org.json.JSONObject.quote(id)+","+tone.toString()+")",null)}
            }catch(_:Exception){runOnUiThread{Toast.makeText(this,"اختر صوتًا صالحًا أقل من 25 ميغابايت",Toast.LENGTH_LONG).show()}}}.start()
            return
        }
        if(requestCode==ADHAN_AUDIO_REQUEST){
            val uri=if(resultCode==RESULT_OK)data?.data else null
            if(uri!=null)Thread{
                try{
                    val temp=File(filesDir,"custom-adhan.tmp")
                    contentResolver.openInputStream(uri)?.use{input->FileOutputStream(temp).use{out->val buf=ByteArray(8192);var count=0L;while(true){val n=input.read(buf);if(n<0)break;count+=n;if(count>25*1024*1024)throw IllegalArgumentException("Audio too large");out.write(buf,0,n)}}}?:throw IllegalArgumentException("Cannot read audio")
                    val retriever=android.media.MediaMetadataRetriever();try{retriever.setDataSource(temp.absolutePath);if(retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()==null)throw IllegalArgumentException("Invalid audio")}finally{retriever.release()}
                    val target=File(filesDir,"custom-adhan");if(!temp.renameTo(target))throw IllegalStateException("Cannot store audio")
                    var name="صوت من الهاتف";contentResolver.query(uri,arrayOf(android.provider.OpenableColumns.DISPLAY_NAME),null,null,null)?.use{cursor->if(cursor.moveToFirst())name=cursor.getString(0)}
                    runOnUiThread{webView.evaluateJavascript("window.aoqatAudioChosen?.("+org.json.JSONObject.quote(name)+")",null)}
                }catch(_:Exception){runOnUiThread{Toast.makeText(this,"اختر ملفًا صوتيًا صالحًا أقل من 25 ميغابايت",Toast.LENGTH_LONG).show()}}
            }.start()
            return
        }
        if (requestCode != FILE_CHOOSER_REQUEST) return

        val result = if (resultCode == RESULT_OK) {
            WebChromeClient.FileChooserParams.parseResult(resultCode, data)
        } else {
            null
        }
        fileCallback?.onReceiveValue(result)
        fileCallback = null
    }

    private var backPending = false
    private val phoneBackCallback by lazy { android.window.OnBackInvokedCallback { handlePhoneBack() } }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() = handlePhoneBack()

    private fun handlePhoneBack() {
        if (backPending || isFinishing || isDestroyed) return
        if (!::webView.isInitialized) { moveTaskToBack(true); return }
        backPending = true
        webView.evaluateJavascript("Boolean(window.aoqatHandleBack && window.aoqatHandleBack())") { handled ->
            backPending = false
            if (!isDestroyed && handled != "true") {
                if (webView.canGoBack()) webView.goBack() else moveTaskToBack(true)
            }
        }
    }

    override fun onDestroy() {
        if (Build.VERSION.SDK_INT >= 33) onBackInvokedDispatcher.unregisterOnBackInvokedCallback(phoneBackCallback)
        super.onDestroy()
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

