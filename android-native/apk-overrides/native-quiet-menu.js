/* Android APK only: independent phone quiet options under Adhan & Iqama. */
(function(){
  'use strict';
  if (!window.AndroidNative?.configureAdhan) return;
  const ids=['fajr','dhuhr','asr','maghrib','isha'];
  const names={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
  const core=window.AoqatAdhanCore;
  let panel, state;
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
  function section(key,title,help,fallback){
    const s=state[key];
    const body=ids.map(id=>'<label class="aq-quiet-minute"><span>'+names[id]+'</span><select data-quiet-key="'+key+'" data-quiet-prayer="'+id+'" aria-label="مدة الصامت '+names[id]+'">'+
      [0,3,5,7,10,15,20,25,30,40,45,60,90,120].map(value=>'<option value="'+value+'"'+(num(s.minutes[id],fallback)===value?' selected':'')+'>'+(value?value+' دقيقة':'متوقف')+'</option>').join('')+
      '</select></label>').join('');
    return '<div class="aq-quiet-card"><label class="aq-quiet-switch"><span>🔕 '+title+'</span><input type="checkbox" data-quiet-enabled="'+key+'"'+(s.enabled?' checked':'')+' aria-label="'+title+'"></label>'+
      '<p class="aq-quiet-help">'+help+'</p><div class="aq-quiet-times"'+(!s.enabled?' hidden':'')+'>'+body+'</div></div>';
  }
  function permission(){
    try{return window.AndroidNative.hasQuietPolicyAccess?.()===true;}catch(_){return false;}
  }
  function render(refresh=true){
    if(!panel)return;
    if(refresh || !state)state=read();
    panel.innerHTML='<h3 class="aq-quiet-title">🔕 تفعيل وضع الصامت</h3>'+
      section('atAdhanSilent','تفعيل وضع صامت عند الأذان',
        'يبدأ الصامت حسب وقت الأذان المسجّل بقاعدة البيانات، ويستمر للمدة المحددة. إذا كان صوت الأذان مفعّلاً يستمر صوت الأذان نفسه.',10)+
      section('afterIqamaSilent','تفعيل وضع صامت بعد الإقامة',
        'يبدأ فور وصول عدّاد باقي على الإقامة إلى الصفر، ويستمر للمدة المحددة لكل صلاة. صفر يعني تعطيل الصامت لتلك الصلاة.',0)+
      (permission()?'<p class="aq-quiet-ok">✓ صلاحية التحكم بوضع الصامت متاحة</p>':'<button type="button" class="aq-quiet-permission">منح صلاحية التحكم بوضع الصامت للهاتف</button><p class="aq-quiet-help">يتطلب تحويل الهاتف إلى صامت إذن أندرويد. إعداداتك محفوظة حتى قبل منح الإذن.</p>');
    panel.querySelectorAll('[data-quiet-enabled]').forEach(input=>input.addEventListener('change',()=>{
      state[input.dataset.quietEnabled].enabled=input.checked;
      store();render(false);
    }));
    panel.querySelectorAll('[data-quiet-prayer]').forEach(select=>select.addEventListener('change',()=>{
      const group=state[select.dataset.quietKey];
      group.minutes[select.dataset.quietPrayer]=num(select.value);
      store();render(false);
    }));
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
      #quietPanel .aq-quiet-ok{color:#14744c!important;text-align:right!important;font-size:14px!important}
      /* Compact iqama list on phones without hiding any rows or user choices. */
      #webSubBody #iqamaPanel{box-sizing:border-box!important;width:100%!important;padding:10px 12px!important;margin:0!important;border-radius:12px!important;overflow:visible!important}
      #webSubBody #iqamaPanel .iqama-help,#webSubBody #iqamaPanel .iqama-friday-help{margin:0 0 7px!important;line-height:1.5!important;font-size:13px!important}
      #webSubBody #iqamaPanel label{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-height:43px!important;max-height:none!important;margin:2px 0!important;padding:1px 0!important;font-size:16px!important;line-height:1.4!important}
      #webSubBody #iqamaPanel select{width:138px!important;max-width:46%!important;height:38px!important;min-height:38px!important;padding:5px!important;border-radius:8px!important;font-size:16px!important}
      #webSubBody #iqamaPanel h3,#webSubBody #iqamaPanel h2{margin:10px 0 5px!important;font-size:19px!important}
      #webSubBody #iqamaPanel hr{margin:10px 0!important}
      #webSubBody #iqamaPanel .switch-control-btn,#webSubBody #iqamaPanel button{min-height:43px!important;padding:6px 10px!important;margin:5px 0!important}
      
    `;
    document.head.append(style);
    render();
  }
  window.AoqatApkQuietSettings={render,read};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create,{once:true});
  else create();
})();
