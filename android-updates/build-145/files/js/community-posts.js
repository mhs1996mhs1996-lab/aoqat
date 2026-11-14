(function(){'use strict';
  
  const C=window.AoqatCommunityPostsCore,KEY='aoqatCommunityPostsV1',SENT='aoqatCommunityPostsSentV1';
  if(!C)return;
  function read(){
    let raw;try{raw=JSON.parse(localStorage.getItem(KEY)||'{}');}catch(_){raw={};}if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
    let changed=false;for(const kind of ['friday','fasting'])if(raw[kind]?.layoutSchema!==1){
      const old=raw[kind]||{};raw[kind]={...old,color:String(C.themeIndex(new Date(),old.design)),design:'weekly',layoutSchema:1};changed=true;
    }
    const all={friday:C.normalize(raw.friday),fasting:C.normalize(raw.fasting)};
    if(changed)try{localStorage.setItem(KEY,JSON.stringify(all));}catch(_){}return all;
  }
  function save(kind,next){const all=read();all[kind]=C.normalize(next);try{localStorage.setItem(KEY,JSON.stringify(all));}catch(_){}return all[kind];}
  function button(label){const b=document.createElement('button');b.type='button';b.className='main-action';b.textContent=label;return b;}
  function label(title,input){const l=document.createElement('label');l.append(document.createTextNode(title),input);return l;}
  function designSelect(value){const input=document.createElement('select');for(const [id,name] of [['weekly','يتبدّل تلقائياً كل أسبوع'],...window.AoqatPostRenderer.layouts.map((name,i)=>[String(i),name])]){const o=new Option(name,id);input.append(o);}input.value=value;return input;}
  function colorSelect(value){const input=document.createElement('select');window.AoqatPostRenderer.palettes.forEach((p,i)=>input.append(new Option(p.name,String(i))));input.value=value;return input;}
  function row(now){const d=window.AoqatFridayRemindersCore.dateParts(now);return typeof cachedAnnualPrayer==='function'?cachedAnnualPrayer(d.month,d.day):null;}
  async function permission(){if(window.AndroidNative?.communityReminderPermissions){window.AndroidNative.communityReminderPermissions();return;}if(typeof Notification!=='undefined'&&Notification.permission==='default')try{await Notification.requestPermission();}catch(_){}}
  function mount(kind,host){
    if(!host||host.querySelector('#communityPostControls-'+kind))return;
    const box=document.createElement('section');box.id='communityPostControls-'+kind;box.className='community-post-controls';box.dataset.postControls=kind;box.dir='rtl';
    const title=document.createElement('h4');title.textContent=kind==='friday'?'نشر بوست سنن الجمعة':'نشر بوست صيام التطوع';
    const open=button('↗ '+title.textContent);open.dataset.openCommunityPost=kind;open.onclick=()=>window.aoqatOpenCommunityPost?.(kind);
    const toggle=button('');toggle.dataset.postReminder=kind;toggle.setAttribute('aria-controls','postReminderSettings-'+kind);
    const body=document.createElement('div');body.id='postReminderSettings-'+kind;
    const mode=document.createElement('select');mode.dataset.postMode=kind;mode.append(new Option('بعد المغرب بعدد دقائق','after'),new Option('وقت أحدده بين المغرب والعشاء','clock'));
    const delay=document.createElement('input');delay.type='number';delay.min='1';delay.max='120';delay.step='1';delay.dataset.postDelay=kind;
    const time=document.createElement('input');time.type='time';time.step='60';time.dataset.postTime=kind;
    const delayLabel=label('بعد أذان المغرب (دقيقة)',delay),timeLabel=label('وقت التنبيه بتوقيت العراق',time);
    const status=document.createElement('p');status.className='post-status';status.setAttribute('role','status');
    const days=document.createElement('fieldset');days.className='post-topic-options';
    if(kind==='fasting'){
      const legend=document.createElement('legend');legend.textContent='ذكّرني بالنشر قبل هذه الأيام';days.append(legend);
      for(const item of window.AoqatFastingPostsCalendar.idList.map(id=>window.AoqatFastingPostsCalendar.topic(id)).filter(Boolean)){
        const input=document.createElement('input');input.type='checkbox';input.dataset.postTopic=item.id;
        input.onchange=()=>{const s=read()[kind];s.topics=[...days.querySelectorAll('input:checked')].map(x=>x.dataset.postTopic);save(kind,s);draw();};days.append(label(item.title,input));
      }
      const note=document.createElement('p');note.textContent='كل مناسبة لها بوست مستقل في موعدها، بحسب التاريخ الهجري المعتمد في التطبيق.';days.append(note);
    }
    const permissionButton=button('السماح بإشعارات الهاتف');permissionButton.onclick=permission;
    body.append(label('طريقة تحديد موعد النشر',mode),delayLabel,timeLabel);if(kind==='fasting')body.append(days);body.append(status,permissionButton);
    const design=designSelect(read()[kind].design);design.dataset.postDesign=kind;
    const color=colorSelect(read()[kind].color);color.dataset.postColor=kind;
    const note=document.createElement('p');note.textContent='النشر يتم باختيارك عبر تطبيقات الهاتف، وليس تلقائياً. تنبيه النشر منفصل عن تذكيرات العبادة، ويعمل دون إنترنت وبالخلفية بعد منح أذونات الهاتف.';
    box.append(title,open,label('ترتيب البوست',design),label('لون البوست',color),toggle,body,note);host.append(box);
    function draw(){
      const s=read()[kind];if(kind==='fasting'){const available=window.AoqatFastingPostsCalendar.candidates(new Date()).filter(x=>s.topics.includes(x.id));open.disabled=!available.length;open.textContent=available.length?'↗ نشر بوست صيام التطوع':'لا يوجد بوست صيام مجدول للنشر اليوم';}toggle.textContent='🔔 تنبيه نشر البوست: '+(s.enabled?'تشغيل':'إيقاف');toggle.setAttribute('aria-pressed',String(s.enabled));toggle.setAttribute('aria-expanded',String(s.enabled));body.hidden=!s.enabled;
      mode.value=s.mode;delay.value=s.delay;time.value=s.time;delayLabel.hidden=s.mode!=='after';timeLabel.hidden=s.mode!=='clock';design.value=s.design;color.value=s.color;
      days.querySelectorAll('input').forEach(i=>i.checked=s.topics.includes(i.dataset.postTopic));
      const now=new Date(),at=C.schedule(now,s,row(now));
      status.textContent=at===null?'الموعد المحدد خارج الفترة بين المغرب والعشاء، أو مواقيت اليوم غير متوفرة؛ لن يُرسل تنبيه خارج هذه الفترة.':
        'موعد التنبيه حسب مواقيت اليوم: '+new Intl.DateTimeFormat('ar-IQ',{timeZone:'Asia/Baghdad',hour:'numeric',minute:'2-digit'}).format(new Date(at))+
        (kind==='friday'?' يوم الخميس فقط.':' في الليلة السابقة للأيام المحددة. لا يحدد لك ستة أيام بعينها من شوال؛ يذكّرك ببدايتها.');
      if(kind==='fasting'&&!s.topics.length)status.textContent+=' لم تُحدد أي أيام للتذكير.';
    }
    toggle.onclick=()=>{const s=read()[kind];s.enabled=!s.enabled;save(kind,s);draw();if(s.enabled)permission();};
    mode.onchange=()=>{const s=read()[kind];s.mode=mode.value;save(kind,s);draw();};
    delay.onchange=()=>{const n=Number(delay.value);if(!Number.isInteger(n)||n<1||n>120){delay.setCustomValidity('اختر من 1 إلى 120 دقيقة.');delay.reportValidity();return;}delay.setCustomValidity('');const s=read()[kind];s.delay=n;save(kind,s);draw();};
    time.onchange=()=>{if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time.value))return;const s=read()[kind];s.time=time.value;save(kind,s);draw();};
    design.onchange=()=>{const s=read()[kind];s.design=design.value;save(kind,s);draw();};
    color.onchange=()=>{const s=read()[kind];s.color=color.value;save(kind,s);draw();};
    box.aoqatRefresh=draw;draw();
  }
  function createShareView(kind,initialTopic='',initialDate=''){
    const panel=document.createElement('section');panel.id='communityPostView';panel.className='community-post-share';panel.dir='rtl';
    const preview=document.createElement('img');preview.id='communityPostPreview';preview.alt=kind==='friday'?'بوست سنن يوم الجمعة وآدابها':'بوست صيام التطوع';preview.hidden=true;
    const design=designSelect(read()[kind].design);design.id='communityPostDesign';
    const color=colorSelect(read()[kind].color);color.id='communityPostColor';
    const topic=document.createElement('select');topic.id='communityPostTopic';
    let choices=[];
    function options(){
      const keep=topic.value;choices=kind==='fasting'?window.AoqatFastingPostsCalendar.candidates(new Date()).filter(x=>read().fasting.topics.includes(x.id)):[];
      const today=window.AoqatFastingPostsCalendar.key(new Date());
      if(initialTopic&&initialDate>=today&&window.AoqatFastingPostsCalendar.topic(initialTopic)&&!choices.some(x=>x.id===initialTopic)){
        const remaining=Date.parse(initialDate+'T12:00:00+03:00')-Date.parse(today+'T12:00:00+03:00');
        if(remaining>=0&&remaining<=2*86400000)choices.push({id:initialTopic,topicId:initialTopic,title:window.AoqatFastingPostsCalendar.topic(initialTopic).title,targetDate:initialDate});
      }
      topic.replaceChildren();for(const item of choices)topic.append(new Option(item.title,item.id));
      topic.value=choices.some(x=>x.id===keep)?keep:choices.some(x=>x.id===initialTopic)?initialTopic:choices[0]?.id||'';
    }
    options();
    const share=button('↗ مشاركة عبر تطبيقات الهاتف'),download=button('📥 حفظ على الجهاز'),retry=button('إعادة المحاولة');
    share.id='communityPostShare';download.id='communityPostSave';retry.id='communityPostRetry';share.disabled=true;download.disabled=true;retry.hidden=true;
    const status=document.createElement('p');status.id='communityPostStatus';status.setAttribute('role','status');status.textContent='جاري تجهيز البوست…';
    panel.append(label('ترتيب البوست',design),label('لون البوست',color));if(kind==='fasting')panel.append(label('محتوى البوست',topic));panel.append(preview,share,download,retry,status);
    let file=null,url=null,disposed=false,serial=0,sharing=false;
    panel.aoqatDispose=()=>{disposed=true;serial++;if(url)URL.revokeObjectURL(url);url=null;file=null;};
    async function prepare(){
      const version=++serial;share.disabled=true;download.disabled=true;retry.hidden=true;status.textContent='جاري تجهيز البوست…';
      try{
        options();let id=topic.value,date='';
        if(kind==='fasting'){
          const item=choices.find(x=>x.id===id);
          if(!item){if(url)URL.revokeObjectURL(url);url=null;file=null;preview.removeAttribute('src');preview.hidden=true;status.textContent='لا يوجد بوست صيام متاح في هذا الموعد.';return;}
          date=item.targetDate;
        }
        const rendered=await window.AoqatPostRenderer.render(kind,id,new Date(),design.value,date,color.value);
        const blob=await new Promise(resolve=>rendered.canvas.toBlob(resolve,'image/jpeg',.96));
        if(disposed||version!==serial)return;if(!blob)throw Error('Image unavailable');
        if(url)URL.revokeObjectURL(url);
        const name='aoqat-'+kind+'-'+window.AoqatFridayRemindersCore.dateParts(new Date()).key+'.jpg';
        file=new File([blob],name,{type:'image/jpeg'});url=URL.createObjectURL(file);preview.src=url;preview.hidden=false;download.disabled=false;
        panel.dataset.postTheme=String(rendered.index);panel.dataset.postTopic=id;panel.dataset.postColor=rendered.color;
        const supported=!!window.AndroidNative?.sharePrayerImage||!!navigator.share&&!!navigator.canShare&&navigator.canShare({files:[file]});share.disabled=!supported;
        status.textContent=(design.value==='weekly'?'ترتيب هذا الأسبوع: ':'الترتيب: ')+rendered.layout+' • '+rendered.palette+'. '+(supported?'الصورة جاهزة للمشاركة والحفظ.':'مشاركة الصور غير متاحة في هذا المتصفح؛ يمكنك حفظ البوست.');
      }catch(error){if(disposed||version!==serial)return;status.textContent='تعذر تجهيز البوست. أعد المحاولة.';retry.hidden=false;}
    }
    design.onchange=()=>{const s=read()[kind];s.design=design.value;save(kind,s);prepare();};topic.onchange=prepare;color.onchange=()=>{const s=read()[kind];s.color=color.value;save(kind,s);prepare();};
    share.onclick=async()=>{
      if(!file||sharing)return;sharing=true;share.disabled=true;
      try{if(window.AndroidNative?.sharePrayerImage)await window.aoqatNativeImageAction('sharePrayerImage',file);else await navigator.share({files:[file],title:kind==='friday'?'سنن يوم الجمعة وآدابها':'صيام التطوع'});if(!disposed)status.textContent='يمكنك مشاركة البوست مرة أخرى أو حفظه على الجهاز.';}
      catch(error){if(!disposed)status.textContent=error?.name==='AbortError'?'البوست جاهز للمشاركة والحفظ.':'تعذرت المشاركة. أعد المحاولة أو احفظ البوست.';}
      finally{sharing=false;if(!disposed)share.disabled=false;}
    };
    download.onclick=async()=>{if(!file||!url)return;if(window.AndroidNative?.savePrayerImage){download.disabled=true;try{await window.aoqatNativeImageAction('savePrayerImage',file);if(!disposed)status.textContent='تم حفظ البوست على الجهاز.';}catch(_){if(!disposed)status.textContent='تعذر الحفظ. أعد المحاولة.';}finally{if(!disposed)download.disabled=false;}return;}const a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();status.textContent='تم طلب حفظ البوست على الجهاز.';};
    retry.onclick=prepare;panel.aoqatRefresh=prepare;Promise.resolve().then(prepare);return panel;
  }
  async function notify(event){
    const entry=window.AoqatReminderInbox?.add(event);if(!entry)return;
    document.getElementById('communityPostBanner')?.remove();const banner=document.createElement('aside');banner.id='communityPostBanner';banner.dir='rtl';banner.setAttribute('role','alert');
    const title=document.createElement('strong');title.textContent=event.title;
    const open=button('معاينة البوست ونشره');open.onclick=()=>{window.aoqatOpenCommunityPost?.(event.section,event.topicId,event.targetDate);banner.remove();};
    const close=button('إغلاق');close.onclick=()=>banner.remove();banner.append(title,open,close);document.body.append(banner);
    if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
    const options={body:event.body,icon:'/assets/icons/app-icon.svg',tag:event.key,data:{kind:'community-post-reminder',id:entry.id,entry,url:'/?reminder='+encodeURIComponent(entry.id)}};
    try{const reg=await navigator.serviceWorker?.getRegistration();if(reg)await reg.showNotification(event.title,options);else{const n=new Notification(event.title,options);n.onclick=()=>{window.focus();window.aoqatOpenCommunityPost?.(event.section,event.topicId,event.targetDate);n.close();};}}catch(_){}
  }
  function tick(now=new Date()){if(window.AndroidNative?.configureAdhan)return;
    let sent;try{sent=JSON.parse(localStorage.getItem(SENT)||'{}');}catch(_){sent={};}if(!sent||typeof sent!=='object'||Array.isArray(sent))sent={};
    for(const event of C.events(now,read(),row(now))){
      const age=+now-event.at;if(age<0||age>120000||sent[event.key])continue;
      // Do not deliver a delayed alert once Isha has begun.
      const d=window.AoqatFridayRemindersCore.dateParts(now),r=row(now),isha=window.AoqatFridayRemindersCore.prayerMinutes(r?.isha,'maghrib');
      if(isha===null||+now>=d.start+isha*60000)continue;
      sent[event.key]=+now;for(const key of Object.keys(sent))if(+now-sent[key]>15*86400000)delete sent[key];
      try{localStorage.setItem(SENT,JSON.stringify(sent));}catch(_){}notify(event);
    }
  }
  const style=document.createElement('style');style.textContent=
    '.community-post-controls{direction:rtl;margin-top:20px;padding:14px;border:1px solid var(--wt-border,#d9c8a8);border-radius:12px;line-height:1.8}.community-post-controls h4{margin:0 0 12px}.community-post-controls button{width:100%;margin:8px 0}.community-post-controls label,.community-post-share label{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:14px 0}.community-post-controls select,.community-post-share select{max-width:100%;width:100%}.community-post-controls input[type="number"],.community-post-controls input[type="time"]{width:140px}.community-post-controls p{font-size:14px!important}.community-post-controls [hidden]{display:none!important}.post-topic-options input{width:22px!important;height:22px!important}.post-topic-options label{flex-wrap:nowrap}.post-topic-options{border:1px solid var(--wt-border,#ddd);border-radius:10px;padding:10px}.community-post-share{line-height:1.8}.community-post-share>button{width:100%;margin:8px 0}.community-post-share img{display:block;max-width:100%;width:360px;height:auto;margin:12px auto;border-radius:12px}.community-post-share img[hidden]{display:none}body.design-menu-open #settingsContentDialog #webDrawerSub #webSubBody .community-post-controls [data-post-reminder]{background:#7f9191!important;background-image:none!important;color:#fff!important}body.design-menu-open #settingsContentDialog #webDrawerSub #webSubBody .community-post-controls [data-post-reminder][aria-pressed="true"]{background:#12854c!important;background-image:none!important}#communityPostBanner{position:fixed;inset:auto 12px 20px;z-index:2147483000;padding:16px;border:1px solid #ccb15a;border-radius:12px;background:#fffaf0;color:#182c34}#communityPostBanner button{margin:8px;padding:10px}';
  document.head.append(style);window.AoqatCommunityPosts={read,mount,createShareView,tick};
  let dayKey=window.AoqatFastingPostsCalendar.key(new Date());
  function refresh(){document.querySelectorAll('[data-post-controls],#communityPostView').forEach(x=>x.aoqatRefresh?.());}
  setInterval(()=>{tick();const next=window.AoqatFastingPostsCalendar.key(new Date());if(next!==dayKey){dayKey=next;refresh();}},1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();refresh();}});
})();

