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
import android.webkit.JavascriptInterface
import android.webkit.JsResult
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var pageReady = false
    private var alarmPermissionPrompted = false
    private var nativeCleanupDone = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT

        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(5, 24, 34))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = false
            settings.textZoom = 100
            settings.setSupportZoom(false)
            settings.builtInZoomControls = false
            settings.displayZoomControls = false
            settings.cacheMode = WebSettings.LOAD_NO_CACHE
            clearCache(true)
            clearHistory()
            addJavascriptInterface(NativeAlarmBridge(), "AndroidAlarm")
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    if (!nativeCleanupDone) {
                        nativeCleanupDone = true
                        performNativeWebCleanup()
                        return
                    }
                    pageReady = true
                    forceWebUiVisible()
                    injectNativeAlarmButtonBridge()
                    requestNotificationPermissionIfNeeded()
                    AlarmScheduler.scheduleFromDatabase(this@MainActivity)
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                    if (message?.contains("هذا المتصفح لا يدعم إشعارات الهاتف") == true) {
                        enableNativeAlarmFromUi()
                        result?.confirm()
                        injectNativeAlarmButtonBridge()
                        return true
                    }
                    return super.onJsAlert(view, url, message, result)
                }
            }
        }

        ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(0, bars.top, 0, bars.bottom)
            insets
        }

        setContentView(webView)
        ViewCompat.requestApplyInsets(webView)
        webView.loadUrl("https://aoqat.vercel.app/?nativeAndroid=1&nativeVersion=15")
    }

    private fun performNativeWebCleanup() {
        val cleanupScript = """
            (async function(){
              try {
                if ('serviceWorker' in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(regs.map(r => r.unregister()));
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map(k => caches.delete(k)));
                }
              } catch(e) {}
              location.replace('https://aoqat.vercel.app/?nativeAndroid=1&nativeVersion=15&clean=1');
            })();
        """.trimIndent()
        webView.evaluateJavascript(cleanupScript, null)
    }

    private fun forceWebUiVisible() {
        if (!::webView.isInitialized) return
        val script = """
            (function(){
              function showUi(){
                try{
                  document.body.classList.remove('aoqat-booting');
                  document.body.classList.add('aoqat-ready');
                  document.querySelectorAll('.workspace,.sidebar,.app').forEach(function(el){
                    el.style.setProperty('visibility','visible','important');
                    el.style.setProperty('opacity','1','important');
                  });
                  const app=document.querySelector('.app');
                  if(app) app.style.removeProperty('display');
                }catch(e){}
              }
              showUi();
              setTimeout(showUi,250);
              setTimeout(showUi,800);
              setTimeout(showUi,1600);
              setTimeout(showUi,3000);
              setTimeout(showUi,6000);
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            ViewCompat.requestApplyInsets(webView)
            if (pageReady) {
                forceWebUiVisible()
                injectNativeAlarmButtonBridge()
                AlarmScheduler.scheduleFromDatabase(this)
            }
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 2001)
        }
    }

    private fun requestExactAlarmPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarm = getSystemService(ALARM_SERVICE) as AlarmManager
            if (!alarm.canScheduleExactAlarms() && !alarmPermissionPrompted) {
                alarmPermissionPrompted = true
                startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$packageName")))
            }
        }
    }

    private fun enableNativeAlarmFromUi() {
        requestNotificationPermissionIfNeeded()
        requestExactAlarmPermissionIfNeeded()
        AlarmScheduler.scheduleFromDatabase(this)
    }

    private fun injectNativeAlarmButtonBridge() {
        if (!::webView.isInitialized || !pageReady) return
        val script = """
            (function(){
              const KEY='prayerTomorrowAlarmEnabledV1';
              function statusElement(){
                let el=document.getElementById('serverPushStatus');
                const button=document.getElementById('tomorrowAlarmEnable');
                if(!button)return null;
                if(!el){
                  el=document.createElement('div');
                  el.id='serverPushStatus';
                  el.style.cssText='margin-top:6px;font-size:11px;line-height:1.6;opacity:.9;text-align:center;color:#83e2ad';
                  button.insertAdjacentElement('afterend',el);
                }
                return el;
              }
              function refresh(){
                const b=document.getElementById('tomorrowAlarmEnable');
                if(!b)return false;
                localStorage.setItem(KEY,'1');
                b.classList.add('enabled');
                b.textContent='⏰ تنبيه Android: تشغيل';
                const el=statusElement();
                if(el){el.textContent='✅ تنبيه Android الأصلي مفعّل. لا يعتمد على إشعارات المتصفح.';el.style.color='#83e2ad';}
                return true;
              }
              window.__aoqatNativeAlarmRefresh=refresh;
              window.__AOQAT_NATIVE_ANDROID__=true;
              if(!window.__aoqatNativeAlarmClickInstalled){
                window.__aoqatNativeAlarmClickInstalled=true;
                document.addEventListener('click',function(event){
                  const b=event.target && event.target.closest ? event.target.closest('#tomorrowAlarmEnable') : null;
                  if(!b)return;
                  event.preventDefault();
                  event.stopPropagation();
                  event.stopImmediatePropagation();
                  localStorage.setItem(KEY,'1');
                  try{if(window.AndroidAlarm && AndroidAlarm.enableNativeAlarm){AndroidAlarm.enableNativeAlarm();}}catch(e){}
                  refresh();
                },true);
              }
              if(!window.__aoqatNativeAlarmObserver){
                window.__aoqatNativeAlarmObserver=new MutationObserver(function(){refresh();});
                window.__aoqatNativeAlarmObserver.observe(document.documentElement,{childList:true,subtree:true});
              }
              refresh(); setTimeout(refresh,300); setTimeout(refresh,1000); setTimeout(refresh,2500);
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    inner class NativeAlarmBridge {
        @JavascriptInterface
        fun enableNativeAlarm(): String {
            runOnUiThread {
                enableNativeAlarmFromUi()
                injectNativeAlarmButtonBridge()
            }
            return "ok"
        }
        @JavascriptInterface
        fun isNativeAndroid(): Boolean = true
    }
}
