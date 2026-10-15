(function(){'use strict';
  if(window.AndroidNative?.configureAdhan)return;
  const C=window.AoqatAzkarRemindersCore,KEY='aoqatAzkarRemindersV1',SENT='aoqatAzkarRemindersSentV1';
  const names=['الفجر','الظهر','العصر','المغرب','العشاء'];
  const descriptions={morning:'بعد صلاة الفجر: وقت الإقامة + مدة الصلاة المحددين في التطبيق.',evening:'قبل أذان المغرب بـ20 دقيقة.',prayer:'بعد كل صلاة: وقت الإقامة + مدة الصلاة المحددين في التطبيق.',sleep:'الساعة 10 مساءً.',waking:'الساعة 7 صباحاً.',tasbih:'بعد الشروق بساعتين، وبعد صلاة العصر حسب أوقات الإقامة ومدة الصلاة.'};
  function json(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(_){return fallback;}}
  function read(){return C.normalize(json(KEY,{}));}
  let settings=read(),audio;
  function unlock(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audio)audio=new AC();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch(_){}}
  document.addEventListener('pointerdown',unlock,{passive:true});
  function chime(){if(audio?.state!=='running')return;try{const t=audio.currentTime;[660,880].forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.setValueAtTime(0,t+i*.16);g.gain.linearRampToValueAtTime(.12,t+i*.16+.01);g.gain.exponentialRampToValueAtTime(.001,t+i*.16+.16);o.connect(g);g.connect(audio.destination);o.start(t+i*.16);o.stop(t+i*.16+.17);});}catch(_){}}
  function currentEvents(now=new Date()){
    const out=[];for(const date of [new Date(+now-86400000),now]){const d=C.day(date);let row=typeof cachedAnnualPrayer==='function'?cachedAnnualPrayer(d.month,d.day):null;if(row)row=window.AoqatPrayerTimeChoice?.applyRow(row)||row;out.push(...C.events(date,settings,row,json('aoqatIqamaMinutesV1',{}),json('aoqatAfterIqamaMinutesV1',{})));}return out;
  }
  let pendingKind='';
  function flushOpen(){if(!pendingKind||!window.aoqatUIReady||!window.aoqatOpenMuslimBagSection )return;const kind=pendingKind;pendingKind='';document.body.classList.add('design-menu-open');window.aoqatOpenMuslimBagSection('azkar');window.aoqatOpenAzkarCategory?.(kind);}
  function open(kind){if(!C.ids.includes(kind))return;pendingKind=kind;flushOpen();}
  async function notify(events){if(!events.length)return;const first=events[0];for(const event of events)window.AoqatReminderInbox?.add(event);
    document.getElementById('azkarReminderBanner')?.remove();const banner=document.createElement('aside');banner.id='azkarReminderBanner';banner.setAttribute('role','alert');
    for(const event of events){const b=document.createElement('button');b.type='button';b.textContent=event.title;b.onclick=()=>{open(event.topicId);banner.remove();};banner.append(b);}const close=document.createElement('button');close.type='button';close.textContent='إغلاق';close.onclick=()=>banner.remove();banner.append(close);document.body.append(banner);
    // One short notification for simultaneous adhkar; no looping alarm or adhan.
    const title=events.length===1?first.title:'تذكير بالأذكار',body=events.map(e=>C.titles[e.topicId]).join(' • ');
    let shown=false;
    if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
      const options={body,tag:'aoqat-azkar-'+first.key,silent:false,icon:'assets/icons/app-icon.svg',data:{kind:'azkar-reminder',topicId:first.topicId,url:location.origin+'/?azkar='+first.topicId}};
      try{const reg=await navigator.serviceWorker?.getRegistration();if(reg)await reg.showNotification(title,options);else{const n=new Notification(title,options);n.onclick=()=>{window.focus();open(first.topicId);n.close();};}shown=true;}catch(_){}
    }
    // The operating system owns notification sound; use a short local tone for an in-page reminder.
    if(!shown)chime();
  }
  function tick(now=new Date()){let sent=json(SENT,{});if(!sent||typeof sent!=='object'||Array.isArray(sent))sent={};const due=currentEvents(now).filter(e=>+now-e.at>=0&&+now-e.at<=120000&&!sent[e.key]);if(!due.length)return;
    due.forEach(e=>sent[e.key]=+now);for(const key of Object.keys(sent))if(+now-Number(sent[key])>3*86400000)delete sent[key];
    try{localStorage.setItem(SENT,JSON.stringify(sent));}catch(_){}notify(due);
  }
  function permissionNote(){if(typeof Notification==='undefined')return 'المتصفح لا يدعم إشعارات الهاتف؛ يظهر التذكير داخل الموقع.';return Notification.permission==='granted'?'إشعارات الهاتف مسموحة.':Notification.permission==='denied'?'إشعارات الهاتف محظورة؛ اسمح بها من إعدادات المتصفح.':'اسمح بإشعارات المتصفح لعرض التذكير على الهاتف.';}
  function mount(page,kind){page.querySelector('#azkarReminderControls')?.remove();if(!C.ids.includes(kind))return;
    const host=document.createElement('section');host.id='azkarReminderControls';host.className='ad-card';host.dataset.kind=kind;
    host.innerHTML='<h4>تنبيه '+C.titles[kind]+'</h4><button type="button" data-azkar-toggle></button><div class="azr-modes" role="group" aria-label="وقت التنبيه"><button type="button" data-azkar-mode="default">افتراضياً</button><button type="button" data-azkar-mode="custom">تخصيص المستخدم</button></div><p class="azr-default"></p><div class="azr-custom" hidden><label class="azr-type">طريقة تحديد الوقت<select data-azkar-type><option value="relative">تعديل الموعد الافتراضي بالدقائق</option><option value="clock">وقت محدد</option></select></label><label class="azr-offset">تقديم أو تأخير الموعد (دقيقة)<input data-azkar-offset type="number" min="-120" max="120" step="1"></label><div class="azr-times"></div></div><p class="azr-next" role="status"></p><p class="ad-note">المواعيد بتوقيت العراق. تعمل التنبيهات أثناء فتح الموقع، وصوت إشعار الهاتف حسب إعدادات الجهاز والمتصفح.</p><p class="azr-permission" role="status"></p><button type="button" data-azkar-permission>السماح بإشعارات المتصفح</button><button type="button" data-azkar-preview>تجربة الإشعار</button>';
    page.append(host);const fixed=['sleep','waking'].includes(kind),times=host.querySelector('.azr-times');
    C.clocks[kind].forEach((_,i)=>{const label=document.createElement('label');label.textContent=kind==='prayer'?'وقت '+names[i]:kind==='tasbih'?'الوقت '+(i+1):'وقت التنبيه';const input=document.createElement('input');input.type='time';input.step='60';input.dataset.azkarTime=String(i);label.append(input);times.append(label);});
    function save(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}draw();}
    function draw(){const s=settings[kind];host.querySelector('[data-azkar-toggle]').textContent='🔔 تنبيه الذكر: '+(s.enabled?'مفعّل':'متوقف');host.querySelector('[data-azkar-toggle]').setAttribute('aria-pressed',String(s.enabled));host.querySelectorAll('[data-azkar-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.azkarMode===s.mode)));host.querySelectorAll('[data-azkar-toggle],[data-azkar-mode]').forEach(b=>{b.style.setProperty('background',b.getAttribute('aria-pressed')==='true'?'#12854c':'#7f9191','important');b.style.setProperty('color','#fff','important');});
      host.querySelector('.azr-default').textContent='الوقت الافتراضي: '+descriptions[kind];host.querySelector('.azr-custom').hidden=s.mode!=='custom';host.querySelector('.azr-type').hidden=fixed;host.querySelector('.azr-offset').hidden=fixed||s.type==='clock';times.hidden=!fixed&&s.type!=='clock';host.querySelector('[data-azkar-type]').value=s.type;host.querySelector('[data-azkar-offset]').value=s.offset;host.querySelectorAll('[data-azkar-time]').forEach(e=>e.value=s.times[+e.dataset.azkarTime]);
      const today=C.day(new Date()).key,events=currentEvents().filter(e=>e.topicId===kind&&e.key.includes(today));host.querySelector('.azr-next').textContent=!s.enabled?'التنبيه متوقف.':events.length?'مواعيد اليوم: '+events.map(e=>new Date(e.at).toLocaleTimeString('ar-IQ',{timeZone:'Asia/Baghdad',hour:'2-digit',minute:'2-digit'})).join('، '):'بانتظار مواقيت الصلاة المحفوظة.';
      host.querySelector('.azr-permission').textContent=permissionNote();host.querySelector('[data-azkar-permission]').hidden=typeof Notification==='undefined'||Notification.permission!=='default';
    }
    async function permission(){unlock();if(typeof Notification!=='undefined'&&Notification.permission==='default')try{await Notification.requestPermission();}catch(_){}draw();}
    host.querySelector('[data-azkar-toggle]').onclick=()=>{settings[kind].enabled=!settings[kind].enabled;save();if(settings[kind].enabled)permission();};
    host.querySelectorAll('[data-azkar-mode]').forEach(b=>b.onclick=()=>{settings[kind].mode=b.dataset.azkarMode;save();});
    host.querySelector('[data-azkar-type]').onchange=e=>{settings[kind].type=e.target.value;save();};
    host.querySelector('[data-azkar-offset]').onchange=e=>{if(!e.target.checkValidity()||e.target.value===''){e.target.reportValidity();draw();return;}settings[kind].offset=+e.target.value;save();};
    host.querySelectorAll('[data-azkar-time]').forEach(e=>e.onchange=()=>{if(C.clock(e.value)===null){draw();return;}settings[kind].times[+e.dataset.azkarTime]=e.value;save();});
    host.querySelector('[data-azkar-permission]').onclick=permission;host.querySelector('[data-azkar-preview]').onclick=async()=>{await permission();notify([{kind:'preview',topicId:kind,key:'preview',title:'معاينة: '+C.titles[kind],body:'تجربة تذكير الأذكار'}]);};host.azkarDraw=draw;draw();
  }
  const style=document.createElement('style');style.textContent='#azkarReminderControls{margin-top:18px;line-height:1.8}#azkarReminderControls [hidden]{display:none!important}#azkarReminderControls button{width:100%;margin:6px 0;padding:10px;text-align:right;font-family:inherit}#azkarReminderControls label{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0}#azkarReminderControls input,#azkarReminderControls select{max-width:170px;min-width:0;min-height:40px;font:inherit}#azkarReminderControls .azr-modes{display:flex;gap:8px}#azkarReminderControls .azr-modes button{font-size:14px;text-align:center}body.design-menu-open #webDrawerSub #azkarReminderControls [data-azkar-toggle],body.design-menu-open #webDrawerSub #azkarReminderControls [data-azkar-mode]{background:#7f9191!important;color:white!important}body.design-menu-open #webDrawerSub #azkarReminderControls [aria-pressed="true"]{background:#12854c!important;color:white!important}#azkarReminderBanner{position:fixed;inset:auto 12px 24px;z-index:2147483000;padding:14px;border-radius:14px;background:#fffaf0;color:#182c34;box-shadow:0 6px 24px #0004;direction:rtl}#azkarReminderBanner button{display:block;margin:6px 0;padding:9px;font:inherit}';document.head.append(style);
  function redraw(){document.getElementById('azkarReminderControls')?.azkarDraw?.();}
  setInterval(()=>{flushOpen();tick();},1000);setInterval(redraw,60000);
  window.addEventListener('storage',()=>{settings=read();redraw();});window.addEventListener('aoqatPrayerRowsUpdated',redraw);document.addEventListener('visibilitychange',()=>{if(!document.hidden){settings=read();tick();redraw();}});
  navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='AOQAT_OPEN_AZKAR')open(e.data.topicId);});
  window.AoqatAzkarReminders={read,mount,tick,currentEvents,open};
  window.addEventListener('load',()=>{const kind=new URL(location.href).searchParams.get('azkar');if(C.ids.includes(kind))open(kind);tick();},{once:true});
})();
