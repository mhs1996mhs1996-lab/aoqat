/* Android APK only: independent phone quiet options under Adhan & Iqama. */
(function(){
  'use strict';
  if (!window.AndroidNative?.configureAdhan) return;
  const ids=['fajr','dhuhr','asr','maghrib','isha'];
  const names={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
  const core=window.AoqatAdhanCore;
  let panel, state, pendingSave=null;
  const minuteLimit=120;
  function persistSoon(){
    if(pendingSave!==null)clearTimeout(pendingSave);
    pendingSave=setTimeout(()=>{pendingSave=null;store();},450);
  }
  function flushSave(){
    if(pendingSave!==null){clearTimeout(pendingSave);pendingSave=null;store();}
  }
  window.addEventListener('pagehide',flushSave);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flushSave();});
  const defaultAt=()=>({enabled:false,minutes:Object.fromEntries(ids.map(id=>[id,10]))});
  function read(){
    let settings={};
    try{settings=JSON.parse(window.AndroidNative.readAdhanSettings()||'{}')||{};}catch(_){}
    const s=core?.normalize?.(settings)||settings;
    if(!s.atAdhanSilent)s.atAdhanSilent=defaultAt();
    if(!s.afterIqamaSilent)s.afterIqamaSilent={enabled:false,minutes:{}};
    return s;
  }
  function store(){
    if(!state)return;
    window.AndroidNative.configureAdhan(JSON.stringify(state));
    try{window.aoqatNativeAdhanSettings?.(state);}catch(_){}
  }
  const num=(n,fallback=0)=>Number.isFinite(Number(n))?Math.max(0,Math.min(120,Math.floor(Number(n)))):fallback;
  const modes={
    off:{label:'إيقاف الصامت',desc:'ما يتغيّر وضع صوت الهاتف تلقائياً.'},
    adhan:{label:'عند الأذان فقط',desc:'يبدأ حسب وقت الأذان من قاعدة المواقيت.'},
    iqama:{label:'بعد الإقامة فقط',desc:'يبدأ عندما يصل عدّاد الإقامة إلى الصفر.'},
    both:{label:'الأذان والإقامة',desc:'كل وقت له مدة مستقلة حسب اختياراتك.'}
  };
  const mode=()=>state.atAdhanSilent.enabled
    ?(state.afterIqamaSilent.enabled?'both':'adhan')
    :(state.afterIqamaSilent.enabled?'iqama':'off');
  function setMode(next){
    state.atAdhanSilent.enabled=next==='adhan'||next==='both';
    state.afterIqamaSilent.enabled=next==='iqama'||next==='both';
    flushSave();store();render(false);
  }
  function section(key,title,help,fallback){
    const s=state[key];
    if(!s.enabled)return '';
    const body=ids.map(id=>{
      const minutes=num(s.minutes[id],fallback);
      return '<div class="aq-quiet-minute"><span>'+names[id]+'</span>'+
        '<div class="aq-quiet-stepper" role="group" aria-label="مدة الصامت '+names[id]+'">'+
        '<button type="button" data-quiet-step="-1" data-quiet-key="'+key+'" data-quiet-prayer="'+id+'" aria-label="تقليل صامت '+names[id]+'">−</button>'+
        '<output data-quiet-key="'+key+'" data-quiet-prayer="'+id+'">'+(minutes?minutes+' دقيقة':'متوقف')+'</output>'+
        '<button type="button" data-quiet-step="1" data-quiet-key="'+key+'" data-quiet-prayer="'+id+'" aria-label="زيادة صامت '+names[id]+'">+</button>'+
        '</div></div>';
    }).join('');
    return '<section class="aq-quiet-card" data-quiet-section="'+key+'">'+
      '<h4>🔕 '+title+'</h4><p class="aq-quiet-help">'+help+'</p>'+
      '<div class="aq-quiet-times">'+body+'</div>'+
      '<div class="aq-quiet-bulk"><label>تطبيق مدة موحدة لكل الصلوات'+
      '<input type="number" min="0" max="120" step="1" data-quiet-bulk="'+key+'" value="10" aria-label="مدة موحدة للصامت"></label>'+
      '<button type="button" data-quiet-apply="'+key+'">تطبيق</button></div></section>';
  }
  function updateStepper(key,id){
    const out=panel.querySelector('output[data-quiet-key="'+key+'"][data-quiet-prayer="'+id+'"]');
    if(!out)return;
    const val=num(state[key].minutes[id]);
    out.textContent=val?val+' دقيقة':'متوقف';
    out.parentElement.querySelector('[data-quiet-step="-1"]').disabled=val<=0;
    out.parentElement.querySelector('[data-quiet-step="1"]').disabled=val>=minuteLimit;
  }
  function permission(){
    try{return window.AndroidNative.hasQuietPolicyAccess?.()===true;}catch(_){return false;}
  }
  function statusPanel(){
    const root=document.createElement('div');root.className='aq-quiet-diagnostics';
    let data={};
    try{data=JSON.parse(window.AndroidNative.readQuietModeStatus?.()||'{}');}
    catch(_){root.textContent='تعذر قراءة حالة وضع الصامت من الهاتف.';return root;}
    const line=text=>{const p=document.createElement('p');p.textContent=text;root.appendChild(p);};
    const showTime=ms=>ms>0?new Date(ms).toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'}):'—';
    const name={0:'الوضع الصامت',1:'الاهتزاز',2:'الرنين الطبيعي'}[data.ringer]||'غير معروف';
    line('حالة رنين الهاتف الآن: '+name);
    line('عدم الإزعاج: '+(data.dnd===3?'مفعّل من إعدادات الهاتف؛ يبقى مستقلاً عن الصامت':data.dnd===1?'غير مفعّل':'مفعّل حسب إعدادات الهاتف'));
    line('أذونات التحكم بالصامت: '+(data.permission?'متاحة':'غير متاحة')+' | المنبهات الدقيقة: '+(data.exactAlarm?'متاحة':'غير متاحة'));
    const status={
      never:'لم تُسجل محاولة صامت بعد',applied:'تم تفعيل الصامت بواسطة التطبيق',
      active:'الصامت الذي فعّله التطبيق ما زال مستمراً',
      already_silent:'كان الهاتف صامتاً أصلاً؛ لم يغيّر التطبيق الوضع',
      permission_missing:'لم يُفعّل الصامت: صلاحية أندرويد غير متاحة',
      exact_alarm_missing:'لم يُفعّل الصامت: منبّه أندرويد الدقيق غير مسموح، حتى لا يبقى الهاتف صامتاً بلا نهاية',
      failed:'فشلت محاولة الصامت؛ رفض الهاتف التغيير',
      restored:'انتهت المدة وحاول التطبيق استعادة الوضع السابق',
      restore_failed:'تعذرت استعادة وضع الصوت السابق؛ سيعيد التطبيق المحاولة',
      recovery_alarm_failed:'تعذر جدولة إرجاع الرنين؛ تحقق من صلاحية المنبهات الدقيقة',
      expired:'وصل أمر الصامت بعد انتهاء المدة؛ لم يتغير رنين الهاتف'
    };
    line('آخر نتيجة: '+(status[data.lastResult]||'لا توجد بيانات')+(data.lastAt?' — '+showTime(data.lastAt):''));
    if(data.scheduledStart>0&&data.deadline>0){
      line('وقت بدء الصامت المقرر: '+showTime(data.scheduledStart)+' | نهاية المدة: '+showTime(data.deadline));
      if(data.lastResult==='applied'&&data.lastAt>data.scheduledStart+30000)
        line('تنبيه: تنفيذ الصامت تأخر عن موعده '+Math.round((data.lastAt-data.scheduledStart)/60000)+' دقيقة؛ راجع قيود بطارية الهاتف وصلاحية المنبهات.');
    }
    if(data.appOwnsQuiet&&data.activeUntil>Date.now())line('الصامت فعّال من التطبيق حتى '+showTime(data.activeUntil));
    return root;
  }
  function render(refresh=true){
    if(!panel)return;
    if(refresh || !state)state=read();
    const choice=mode();
    const radios=Object.entries(modes).map(([value,meta])=>
      '<label class="aq-quiet-mode-option"><input type="radio" name="aqQuietMode" value="'+value+'"'+
      (value===choice?' checked':'')+'><span><strong>'+meta.label+'</strong><small>'+meta.desc+'</small></span></label>').join('');
    panel.innerHTML='<h3 class="aq-quiet-title">🔕 وضع الصامت التلقائي</h3>'+
      '<div class="aq-quiet-card"><h4>متى يشتغل الصامت؟</h4>'+
      '<div class="aq-quiet-modes" role="radiogroup" aria-label="وقت تشغيل وضع الصامت">'+radios+'</div></div>'+
      section('atAdhanSilent','الصامت عند الأذان','تحدد مدة الصامت لكل صلاة. صفر يلغي الصامت لهذه الصلاة.',10)+
      section('afterIqamaSilent','الصامت بعد الإقامة','يبدأ عند تصفير عدّاد الإقامة وينتهي بآخر مدة تختارها أو بانتهاء عدّاد «مضى على الإقامة»، أيهما أسبق.',0)+
      (permission()?'<p class="aq-quiet-ok">✓ إذن التحكم بالصامت متاح</p>':
        '<button type="button" class="aq-quiet-permission">منح إذن التحكم بصوت الهاتف</button>')+
      '<details class="aq-quiet-status"><summary>حالة الرنين والتشخيص</summary></details>';
    const details=panel.querySelector('.aq-quiet-status');
    const status=statusPanel();
    details.append(status);
    let current={};
    try{current=JSON.parse(window.AndroidNative.readQuietModeStatus?.()||'{}');}catch(_){}
    const control=document.createElement('button');
    control.type='button';control.className='aq-quiet-recovery';
    if(current.appOwnsQuiet){
      control.textContent='إيقاف الصامت التلقائي واستعادة الرنين السابق';
      control.onclick=()=>{flushSave();window.AndroidNative?.stopAutomaticQuietNow?.();
        setTimeout(()=>render(true),350);};
    }else{
      control.textContent='فتح إعدادات صوت الهاتف';
      control.onclick=()=>window.AndroidNative?.openDeviceSoundSettings?.();
    }
    details.append(control);
    panel.querySelectorAll('input[name="aqQuietMode"]').forEach(input=>
      input.addEventListener('change',()=>{if(input.checked)setMode(input.value);}));
    panel.querySelectorAll('[data-quiet-step]').forEach(button=>
      button.addEventListener('click',()=>{
        const key=button.dataset.quietKey,id=button.dataset.quietPrayer;
        const prior=num(state[key].minutes[id]);
        const next=Math.max(0,Math.min(minuteLimit,prior+Number(button.dataset.quietStep)));
        if(next===prior)return;
        state[key].minutes[id]=next;
        updateStepper(key,id);
        persistSoon();
      }));
    panel.querySelectorAll('[data-quiet-apply]').forEach(button=>
      button.addEventListener('click',()=>{
        const key=button.dataset.quietApply;
        const input=panel.querySelector('[data-quiet-bulk="'+key+'"]');
        if(!input||input.value===''||!input.checkValidity()){input?.reportValidity();return;}
        const value=num(input.value);ids.forEach(id=>{state[key].minutes[id]=value;updateStepper(key,id);});
        persistSoon();
      }));
    for(const key of ['atAdhanSilent','afterIqamaSilent'])
      ids.forEach(id=>updateStepper(key,id));
    panel.querySelector('.aq-quiet-permission')?.addEventListener('click',()=>window.AndroidNative.requestQuietPolicyAccess?.());
  }
  function create(){
    if(document.getElementById('quietPanel'))return;
    const home=document.querySelector('.sidebar .main-panel');
    if(!home)return;
    panel=document.createElement('section');
    panel.id='quietPanel';
    panel.className='panel inline-control-panel';
    home.append(panel);
    const style=document.createElement('style');
    style.id='apkQuietMenuStyle';
    style.textContent=`
      /* Moved to its own page. Keep its original saved native setting untouched. */
      #adhanPanel #adSilentSettingsToggle,#adhanPanel #adSilentSettings{display:none!important}
      #quietPanel{direction:rtl!important;background:#fffefb!important;color:#234037!important;padding:12px!important;margin:0!important;border:1px solid #cad7c8!important;border-radius:14px!important;box-shadow:none!important}
      #quietPanel .aq-quiet-title{margin:0 0 12px!important;font-size:20px!important;text-align:right!important;color:#254635!important}
      #quietPanel .aq-quiet-card{border:1px solid #c4d5c7!important;border-radius:12px!important;margin:0 0 13px!important;padding:12px!important;background:#fbfdf9!important}
      #quietPanel .aq-quiet-switch{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;padding:4px 0!important;font-weight:700!important;font-size:17px!important;color:#214a36!important}
      #quietPanel .aq-quiet-switch input{width:24px!important;height:24px!important;flex:none!important;accent-color:#158550!important}
      #quietPanel .aq-quiet-help{font-size:13px!important;line-height:1.7!important;color:#51665a!important;margin:9px 0!important}
      #quietPanel .aq-quiet-times{display:grid!important;grid-template-columns:1fr!important;gap:5px!important}
      #quietPanel .aq-quiet-times[hidden]{display:none!important}
      #quietPanel .aq-quiet-minute{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:10px!important;padding:2px 0!important;font-size:16px!important;min-height:40px!important;margin:0!important;color:#234037!important}
      #quietPanel .aq-quiet-minute select{width:132px!important;max-width:48%!important;min-height:36px!important;height:38px!important;padding:5px!important;border:1px solid #b8c9c3!important;border-radius:8px!important;background:#f3f7f5!important;color:#193c38!important;text-align:right!important;font-size:15px!important}
      #quietPanel .aq-quiet-permission{display:block!important;width:100%!important;min-height:44px!important;margin:10px 0!important;padding:9px!important;border-radius:9px!important;background:#287b54!important;color:#fff!important;border:0!important}
      #quietPanel .aq-quiet-ok{color:#14744c!important;text-align:right!important;font-size:14px!important}\n      #quietPanel .aq-quiet-diagnostics{background:#f4f7f2!important;border:1px solid #b5cbbb!important;border-radius:10px!important;padding:10px!important;margin:14px 0 4px!important;color:#204533!important;font-size:13px!important;line-height:1.65!important}#quietPanel .aq-quiet-diagnostics p{margin:4px 0!important}
      /* Compact iqama list on phones without hiding any rows or user choices. */
      #webSubBody #iqamaPanel{box-sizing:border-box!important;width:100%!important;padding:10px 12px!important;margin:0!important;border-radius:12px!important;overflow:visible!important}
      #webSubBody #iqamaPanel .iqama-help,#webSubBody #iqamaPanel .iqama-friday-help{margin:0 0 7px!important;line-height:1.5!important;font-size:13px!important}
      #webSubBody #iqamaPanel label{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-height:43px!important;max-height:none!important;margin:2px 0!important;padding:1px 0!important;font-size:16px!important;line-height:1.4!important}
      #webSubBody #iqamaPanel select{width:138px!important;max-width:46%!important;height:38px!important;min-height:38px!important;padding:5px!important;border-radius:8px!important;font-size:16px!important}
      #webSubBody #iqamaPanel h3,#webSubBody #iqamaPanel h2{margin:10px 0 5px!important;font-size:19px!important}
      #webSubBody #iqamaPanel hr{margin:10px 0!important}
      #webSubBody #iqamaPanel .switch-control-btn,#webSubBody #iqamaPanel button{min-height:43px!important;padding:6px 10px!important;margin:5px 0!important}
      
    `;

    // All quiet controls use the app's active palette and never change prayer widgets.
    style.textContent += `
      #quietPanel{background:var(--wt-surface,#fffefb)!important;color:var(--wt-text,#243c32)!important;border-color:var(--wt-border,#c4d5c7)!important}
      #quietPanel .aq-quiet-card{background:var(--wt-panel,#f9fcf8)!important;border-color:var(--wt-border,#c4d5c7)!important}
      #quietPanel .aq-quiet-title,#quietPanel .aq-quiet-card h4{color:var(--wt-text,#243c32)!important;font-size:18px!important;margin:3px 0 12px!important}
      #quietPanel .aq-quiet-modes{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}
      #quietPanel .aq-quiet-mode-option{display:flex!important;align-items:center!important;gap:7px!important;min-height:70px!important;padding:8px!important;margin:0!important;border:1px solid var(--wt-border,#c4d5c7)!important;border-radius:10px!important;background:var(--wt-surface2,#eff7ef)!important}
      #quietPanel .aq-quiet-mode-option:has(input:checked){border:2px solid var(--wt-accent,#287f53)!important;background:color-mix(in srgb,var(--wt-accent,#287f53) 12%,var(--wt-surface,#fff))!important}
      #quietPanel .aq-quiet-mode-option input{width:20px!important;min-width:20px!important;height:20px!important;accent-color:var(--wt-accent,#287f53)!important}
      #quietPanel .aq-quiet-mode-option span{display:flex;flex-direction:column;gap:4px;font-size:14px;line-height:1.4}
      #quietPanel .aq-quiet-mode-option strong{font-size:15px}
      #quietPanel .aq-quiet-mode-option small{font-size:12px;color:var(--wt-text,#243c32);opacity:.78}
      #quietPanel .aq-quiet-times{gap:4px!important}
      #quietPanel .aq-quiet-minute{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:6px!important;min-height:44px!important;border-bottom:1px solid var(--wt-border,#d8e1d7)!important}
      #quietPanel .aq-quiet-stepper{display:flex!important;direction:ltr!important;align-items:center!important;gap:4px!important;flex:0 0 auto!important;border:1px solid var(--wt-border,#c4d5c7)!important;border-radius:10px!important;padding:3px!important}
      #quietPanel .aq-quiet-stepper button{min-width:30px!important;width:30px!important;height:34px!important;min-height:34px!important;padding:0!important;font-size:22px!important;border:1px solid var(--wt-border,#c4d5c7)!important;border-radius:7px!important;background:var(--wt-surface2,#eff7ef)!important;color:var(--wt-text,#243c32)!important}
      #quietPanel .aq-quiet-stepper button:disabled{opacity:.3!important}
      #quietPanel .aq-quiet-stepper output{direction:rtl;min-width:75px;text-align:center;font-size:14px;font-variant-numeric:tabular-nums}
      #quietPanel .aq-quiet-bulk{display:flex!important;align-items:end!important;gap:8px!important;justify-content:space-between!important;margin-top:12px!important}
      #quietPanel .aq-quiet-bulk label{font-size:13px!important;display:flex;flex:1;flex-direction:column;gap:5px}
      #quietPanel .aq-quiet-bulk input{width:100%!important;min-height:38px!important;box-sizing:border-box;padding:5px;font:inherit;border:1px solid var(--wt-border,#c4d5c7);border-radius:8px;background:var(--wt-surface,#fff);color:var(--wt-text,#243c32)}
      #quietPanel .aq-quiet-bulk button,#quietPanel .aq-quiet-recovery{min-height:40px!important;border:1px solid var(--wt-border,#c4d5c7)!important;border-radius:9px!important;background:var(--wt-surface2,#e7f3eb)!important;color:var(--wt-text,#243c32)!important;font:inherit;padding:6px 12px!important}
      #quietPanel .aq-quiet-status{margin:12px 0 0!important;padding:10px!important;border:1px solid var(--wt-border,#c4d5c7)!important;border-radius:10px!important}
      #quietPanel .aq-quiet-status summary{font-weight:700!important;cursor:pointer}
      #quietPanel .aq-quiet-diagnostics{font-size:13px!important;line-height:1.55!important}
      #quietPanel .aq-quiet-recovery{display:block!important;width:100%!important;margin-top:8px!important}
      #quietPanel .aq-quiet-ok{font-size:13px!important}
      @media(max-width:350px){#quietPanel .aq-quiet-modes{grid-template-columns:1fr!important}#quietPanel .aq-quiet-stepper output{min-width:63px}}
    `;
    document.head.append(style);
    render();
  }
  window.AoqatApkQuietSettings={render,read};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create,{once:true});
  else create();
})();
