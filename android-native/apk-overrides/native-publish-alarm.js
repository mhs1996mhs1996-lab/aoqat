(function(){'use strict';
 const N=window.AndroidNative;if(!N?.enableAlarm)return;
 window.aoqatNativePublishAlarm=true;
 const KEY='aoqatAndroidPublishAlarmEnabled';
 let enabled=!!N.readPublishAlarmEnabled(localStorage.getItem(KEY)==='1');
 localStorage.setItem(KEY,enabled?'1':'0');
 // Native Android is the only audio/snooze owner. No WebAudio or browser alarm survives in the APK.
 window.PrayerTomorrowAlarm={stop:()=>N.stopPublishAlarm?.()};
 function mount(){const panel=document.getElementById('switchPanel');if(!panel||document.getElementById('tomorrowAlarmEnable'))return;
  const b=document.createElement('button');b.id='tomorrowAlarmEnable';b.type='button';b.dataset.androidNativeAlarm='1';
  function draw(){b.setAttribute('aria-pressed',String(enabled));b.dataset.enabled=String(enabled);b.dataset.androidAlarmEnabled=enabled?'1':'0';b.className='switch-control-btn'+(enabled?' enabled is-on':'');b.textContent='🔔 تنبيه النشر على الهاتف: '+(enabled?'تشغيل':'إيقاف');}
  b.onclick=()=>{enabled=!enabled;localStorage.setItem(KEY,enabled?'1':'0');if(enabled)N.enableAlarm();else N.disableAlarm();draw();};
  panel.insertBefore(b,document.getElementById('tomorrowSwitchStatus'));draw();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();window.addEventListener('aoqatModulesReady',mount);
})();
