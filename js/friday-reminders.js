(function(){'use strict';
  if(window.AndroidNative?.configureAdhan)return;
  const C=window.AoqatFridayRemindersCore,KEY='aoqatFridayRemindersV1',SENT='aoqatFridayRemindersSentV1';
  if(!C)return;
  function read(){try{return C.normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){return C.defaults();}}
  let settings=read();
  function row(now){const d=C.dateParts(now);return typeof cachedAnnualPrayer==='function'?cachedAnnualPrayer(d.month,d.day):null;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}draw();}
  function currentEvents(now=new Date()){return C.events(now,settings,row(now));}
  function draw(){const host=document.getElementById('fridayReminderHost');if(!host)return;
    const toggle=host.querySelector('#frReminderToggle');toggle.textContent='🔔 تنبيه سنن يوم الجمعة: '+(settings.enabled?'تشغيل':'إيقاف');toggle.setAttribute('aria-pressed',String(settings.enabled));toggle.setAttribute('aria-expanded',String(settings.enabled));host.querySelector('#frReminderSettings').hidden=!settings.enabled;
    for(const kind of ['sunnah','kahf']){const b=host.querySelector('[data-friday-reminder="'+kind+'"]');b.setAttribute('aria-pressed',String(settings[kind]));b.querySelector('span').textContent=settings[kind]?'تشغيل':'إيقاف';}
    host.querySelector('#frSunnahDelay').value=settings.afterMaghrib;host.querySelector('#frKahfTime').value=settings.kahfTime;
    const now=new Date(),events=currentEvents(now),d=C.dateParts(now);
    let note='التنبيهات المحلية تعمل أثناء فتح الموقع؛ إغلاق الصفحة يوقفها. يمكن عرض إشعار الهاتف إذا سمحت للمتصفح.';
    if(d.weekday===5&&settings.kahf&&!events.some(x=>x.kind==='kahf'))note+=' اختر وقت الكهف بين الفجر والمغرب؛ يلزم توفر مواقيت اليوم.';
    host.querySelector('#frReminderStatus').textContent=note;
  }
  async function requestPermission(){if(typeof Notification==='undefined')return;try{if(Notification.permission==='default')await Notification.requestPermission();}catch(_){}draw();}
  function install(card){if(!card||card.querySelector('#fridayReminderHost'))return;
    const host=document.createElement('section');host.id='fridayReminderHost';host.className='ad-card';
    host.innerHTML='<button type="button" id="frReminderToggle" class="main-action" aria-expanded="true" aria-pressed="true" aria-controls="frReminderSettings">🔔 تنبيه سنن يوم الجمعة</button><div id="frReminderSettings" hidden><h4>تنبيهات الجمعة</h4><button type="button" class="main-action" data-friday-reminder="sunnah" aria-pressed="false">تذكير سنن الجمعة ليلة الجمعة <span></span></button><label>الخميس بعد المغرب (دقيقة)<input id="frSunnahDelay" type="number" min="0" max="120" step="1"></label><button type="button" class="main-action" data-friday-reminder="kahf" aria-pressed="false">تذكير قراءة سورة الكهف <span></span></button><label>وقت الجمعة بتوقيت العراق<input id="frKahfTime" type="time" step="60"></label><p class="ad-note">الساعة 9 صباحاً موعد مقترح للتذكير، وليست ساعة ذات أفضلية شرعية. القراءة متاحة خلال نهار الجمعة.</p><a href="https://binbaz.org.sa/fatwas/11148" target="_blank" rel="noopener noreferrer">مصدر وقت قراءة سورة الكهف</a><p id="frReminderStatus" class="ad-note" role="status"></p><button type="button" id="frReminderPreview" class="main-action">معاينة التذكير</button></div>';
    card.appendChild(host);const toggle=host.querySelector('#frReminderToggle');toggle.onclick=()=>{settings.enabled=!settings.enabled;save();if(settings.enabled)requestPermission();};
    host.querySelectorAll('[data-friday-reminder]').forEach(b=>b.onclick=()=>{const k=b.dataset.fridayReminder;settings[k]=!settings[k];save();if(settings[k])requestPermission();});
    host.querySelector('#frSunnahDelay').onchange=e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=0&&n<=120){settings.afterMaghrib=n;save();}else draw();};
    host.querySelector('#frKahfTime').onchange=e=>{const n=C.clock(e.target.value),r=row(new Date()),f=C.prayerMinutes(r?.fajr,'fajr'),m=C.prayerMinutes(r?.maghrib,'maghrib');if(n===null||(f!==null&&m!==null&&(n<f||n>=m))){e.target.setCustomValidity('اختر وقتاً خلال نهار الجمعة بين الفجر والمغرب.');e.target.reportValidity();e.target.value=settings.kahfTime;return;}e.target.setCustomValidity('');settings.kahfTime=e.target.value;save();};
    host.querySelector('#frReminderPreview').onclick=()=>notify({kind:'preview',title:'معاينة تذكير الجمعة',body:'تذكير بسنن الجمعة وقراءة سورة الكهف، مع المصادر داخل حقيبة المسلم.'});draw();
  }
  function banner(event){document.getElementById('fridayReminderBanner')?.remove();const el=document.createElement('aside');el.id='fridayReminderBanner';el.setAttribute('role','alert');const title=document.createElement('strong'),body=document.createElement('p'),close=document.createElement('button');title.textContent=event.title;body.textContent=event.body;close.type='button';close.textContent='إغلاق';close.onclick=()=>el.remove();el.append(title,body,close);document.body.appendChild(el);}
  async function notify(event){const entry=window.AoqatReminderInbox?.add(event);banner(event);if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
    const options={body:event.body,tag:'aoqat-friday-'+event.kind,icon:'assets/icons/app-icon.svg',data:{kind:'friday-reminder',id:entry?.id,entry,url:location.origin+'/?reminder='+encodeURIComponent(entry?.id||'')}};
    try{const reg=await navigator.serviceWorker?.getRegistration();if(reg)await reg.showNotification(event.title,options);else {const n=new Notification(event.title,options);n.onclick=()=>{window.focus();if(entry)window.aoqatOpenNotification?.(entry.id);n.close();};}}catch(_){} }
  function tick(now=new Date()){let sent;try{sent=JSON.parse(localStorage.getItem(SENT)||'{}');}catch(_){sent={};}if(!sent||typeof sent!=='object'||Array.isArray(sent))sent={};
    for(const event of currentEvents(now)){const age=+now-event.at;if(age<0||age>120000||sent[event.key])continue;sent[event.key]=+now;
      for(const key of Object.keys(sent))if(+now-Number(sent[key])>15*86400000)delete sent[key];
      try{localStorage.setItem(SENT,JSON.stringify(sent));}catch(_){}notify(event);
    }
  }
  function init(){const style=document.createElement('style');style.textContent='#fridayReminderHost{margin-top:16px}body.design-menu-open #webDrawerSub #fridayReminderHost #frReminderToggle{background:#7f9191!important;color:#fff!important}body.design-menu-open #webDrawerSub #fridayReminderHost #frReminderToggle[aria-pressed="true"]{background:#12854c!important}#fridayReminderHost [hidden]{display:none!important}#fridayReminderHost button{width:100%;text-align:right}#fridayReminderHost [data-friday-reminder]{display:flex;justify-content:space-between;gap:8px;color:#fff!important;background:#7f9191!important}#fridayReminderHost [aria-pressed="true"]{background:#12854c!important}#fridayReminderHost label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0}#fridayReminderHost input{max-width:130px}#fridayReminderHost a{color:var(--wt-accent,#137985)}#fridayReminderBanner{position:fixed;inset: auto 12px 24px;z-index:2147483000;padding:16px;border:1px solid #ccb15a;border-radius:14px;background:#fffaf0;color:#182c34;box-shadow:0 6px 24px #0004;direction:rtl}#fridayReminderBanner p{line-height:1.8}#fridayReminderBanner button{padding:8px 16px}';document.head.appendChild(style);
    setInterval(()=>tick(),1000);tick();document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();draw();}});window.addEventListener('storage',e=>{if(e.key===KEY){settings=read();draw();}});
  }
  window.AoqatFridayReminders={tick,currentEvents,read,mount:install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
