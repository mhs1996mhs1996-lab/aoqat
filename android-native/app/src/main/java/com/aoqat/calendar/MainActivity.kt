package com.aoqat.calendar

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.addJavascriptInterface(NativeAlarmBridge(), "AndroidAlarm")
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectNativeAlarmButtonBridge()
            }
        }
        webView.webChromeClient = WebChromeClient()
        webView.loadUrl("https://aoqat.vercel.app")
        setContentView(webView)

        requestNotificationPermissionIfNeeded()
        requestExactAlarmPermissionIfNeeded()
        AlarmScheduler.scheduleFromDatabase(this)
    }

    override fun onResume() {
        super.onResume()
        AlarmScheduler.scheduleFromDatabase(this)
        if (::webView.isInitialized) injectNativeAlarmButtonBridge()
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 2001)
        }
    }

    private fun requestExactAlarmPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarm = getSystemService(ALARM_SERVICE) as AlarmManager
            if (!alarm.canScheduleExactAlarms()) {
                startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$packageName")))
            }
        }
    }

    private fun injectNativeAlarmButtonBridge() {
        if (!::webView.isInitialized) return
        val script = """
            (function(){
              if(window.__aoqatNativeAlarmBridgeInstalled){
                if(window.__aoqatNativeAlarmRefresh) window.__aoqatNativeAlarmRefresh();
                return;
              }
              window.__aoqatNativeAlarmBridgeInstalled=true;
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
                if(!b)return;
                localStorage.setItem(KEY,'1');
                b.classList.add('enabled');
                b.textContent='⏰ تنبيه Android: تشغيل';
                const el=statusElement();
                if(el){
                  el.textContent='✅ تنبيه Android الأصلي مفعّل. لا يعتمد على إشعارات المتصفح.';
                  el.style.color='#83e2ad';
                }
              }
              window.__aoqatNativeAlarmRefresh=refresh;

              document.addEventListener('click',function(event){
                const b=event.target && event.target.closest ? event.target.closest('#tomorrowAlarmEnable') : null;
                if(!b)return;
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                try{
                  if(window.AndroidAlarm && AndroidAlarm.enableNativeAlarm){
                    AndroidAlarm.enableNativeAlarm();
                    refresh();
                  }
                }catch(e){
                  const el=statusElement();
                  if(el){el.textContent='تعذر تفعيل تنبيه Android.';el.style.color='#ff9b9b';}
                }
              },true);

              const observer=new MutationObserver(refresh);
              observer.observe(document.documentElement,{childList:true,subtree:true});
              setTimeout(refresh,250);
              setTimeout(refresh,1000);
              setTimeout(refresh,2500);
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    inner class NativeAlarmBridge {
        @JavascriptInterface
        fun enableNativeAlarm(): String {
            runOnUiThread {
                requestNotificationPermissionIfNeeded()
                requestExactAlarmPermissionIfNeeded()
                AlarmScheduler.scheduleFromDatabase(this@MainActivity)
            }
            return "ok"
        }
    }
}
