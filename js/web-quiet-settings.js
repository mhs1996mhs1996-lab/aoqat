(function(){'use strict';if(window.AndroidNative?.configureAdhan)return;
 const names={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'},ids=Object.keys(names),$=id=>document.getElementById(id);
 let adhanOpen=false,queued=false;
 function build(body,kind){const api=window.AoqatWebQuietSettings;if(!api||body.dataset.webQuiet===kind)return;body.dataset.webQuiet=kind;
  const key=kind==='adhan'?'afterAdhanSilent':'afterIqamaSilent',title=kind==='adhan'?'الصامت عند الأذان':'الصامت عند الإقامة',s=api.read()[key];
  body.replaceChildren();const master=document.createElement('button');master.type='button';master.className='pa-switch';master.dataset.webQuietToggle=kind;master.setAttribute('aria-pressed',String(s.enabled));master.textContent=title+': '+(s.enabled?'مفعّل':'متوقف');master.style.cssText='width:100%;background:'+(s.enabled?'#278052':'#858e8b')+'!important;color:#fff!important';master.onclick=()=>api.save({[key]:{...s,enabled:!s.enabled}});body.append(master);
  const hint=document.createElement('p');hint.className='ad-note';hint.textContent='مدة الصامت لكل صلاة بالدقائق. صفر يوقفه لهذه الصلاة.';body.append(hint);
  const field=document.createElement('fieldset');field.disabled=!s.enabled;field.className='web-quiet-durations';
  for(const id of ids){
    const label=document.createElement('label'),text=document.createElement('span'),control=document.createElement('span'),input=document.createElement('input');
    text.textContent=names[id];control.className='web-quiet-stepper';
    const minus=document.createElement('button'),plus=document.createElement('button'),minute=document.createElement('small');
    input.type='number';input.min='0';input.max='120';input.step='1';input.value=s.minutes[id];
    input.dataset.webQuietMinutes=id;input.dataset.quietKind=kind;input.setAttribute('aria-label','مدة '+title+' لصلاة '+names[id]);
    minus.type=plus.type='button';minus.textContent='−';plus.textContent='+';minute.textContent='دقيقة';
    minus.setAttribute('aria-label','تقليل مدة الصامت لصلاة '+names[id]);
    plus.setAttribute('aria-label','زيادة مدة الصامت لصلاة '+names[id]);
    const save=next=>api.save({[key]:{...s,minutes:{...s.minutes,[id]:Math.max(0,Math.min(120,Number(next)))}}});
    minus.onclick=()=>save(Number(s.minutes[id])-1);
    plus.onclick=()=>save(Number(s.minutes[id])+1);
    input.onchange=()=>{if(input.value.trim()===''||!input.checkValidity()){input.reportValidity();input.value=s.minutes[id];return;}save(input.value);};
    control.append(minus,minute,input,plus);label.append(text,control);field.append(label);
  }
  body.append(field);
  const status=document.createElement('p');status.setAttribute('role','status');status.textContent=!s.enabled?'الصامت متوقف.':ids.every(id=>!s.minutes[id])?'حدّد مدة لصلاة واحدة على الأقل.':'المدد محفوظة وتُحسب من مواقيت الصلاة وتخصيص المستخدم.';body.append(status);
  const note=document.createElement('p');note.className='ad-note';note.textContent='نسخة الويب تعاين فترة الصامت وتكتم صوت الموقع فقط. تغيير وضع الهاتف نفسه يحتاج نسخة Android.';body.append(note);
 }
 function mount(){queued=false;const p=$('adhanPanel'),api=window.AoqatWebQuietSettings;if(!p||!api||!$('paAlertMenu'))return;
  const iqama=$('adSilentSettings');if(iqama){const body=iqama.querySelector(':scope > .ad-leaf-body')||iqama;if(body)build(body,'iqama');$('adSilentSettingsToggle').disabled=false;}
  let button=$('adAdhanSilentSettingsToggle');if(!button){button=document.createElement('button');button.id='adAdhanSilentSettingsToggle';button.type='button';button.className='ad-section-toggle';button.setAttribute('aria-controls','adAdhanSilentSettings');button.innerHTML='<span>🤫</span><span>تفعيل وضع صامت عند الأذان</span><span>‹</span>';$('paAlertMenu').append(button);const panel=document.createElement('section');panel.id='adAdhanSilentSettings';panel.className='ad-leaf-window';panel.hidden=!adhanOpen;panel.style.setProperty('--leaf-level',1);panel.innerHTML='<header class="ad-leaf-head"><button type="button" class="ad-leaf-back" data-subwindow-back>‹ رجوع</button><h3>الصامت عند الأذان</h3></header><div class="ad-leaf-body"></div>';p.append(panel);button.onclick=()=>{adhanOpen=true;panel.hidden=false;button.setAttribute('aria-expanded','true');panel.querySelector('button').focus({preventScroll:true});};panel.querySelector('header button').onclick=()=>{adhanOpen=false;panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus({preventScroll:true});};panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();panel.querySelector('header button').click();}});}
  button.setAttribute('aria-expanded',String(adhanOpen));build($('adAdhanSilentSettings').querySelector('.ad-leaf-body'),'adhan');
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(mount);}}
 const old=window.aoqatCloseSettingsLeaves;window.aoqatCloseSettingsLeaves=()=>{old?.();$('adAdhanSilentSettings')?.querySelector('header button')?.click();};
 const style=document.createElement('style');style.textContent=[
  '.web-quiet-durations{border:0;margin:12px 0;padding:0;min-width:0}',
  '.web-quiet-durations label{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--wt-border,#ddd);font:inherit}',
  '.web-quiet-durations label>span:first-child{flex:1}',
  '.web-quiet-stepper{display:flex;align-items:center;gap:5px;direction:ltr;border:1px solid var(--wt-border,#bed0c2);border-radius:13px;background:var(--wt-surface2,#edf5ee);padding:4px}',
  '.web-quiet-stepper button{width:42px!important;height:44px!important;min-height:44px!important;padding:0!important;font:700 22px Tahoma,Arial,sans-serif!important;border-radius:10px!important;background:linear-gradient(125deg,var(--wt-button-accent,#22563b),var(--wt-accent,#498b68))!important;color:white!important}',
  '.web-quiet-stepper input{width:44px!important;min-height:44px!important;height:44px!important;padding:0!important;text-align:center!important;font:700 19px Tahoma,Arial,sans-serif!important;background:transparent!important;border:0!important;color:var(--wt-text,#203b32)!important}',
  '.web-quiet-stepper small{font:13px Tahoma,Arial,sans-serif;color:var(--wt-text,#294438)}',
  '.web-quiet-stepper input::-webkit-inner-spin-button{-webkit-appearance:none}',
  '@media(max-width:370px){.web-quiet-stepper button{width:36px!important;height:39px!important;min-height:39px!important}.web-quiet-stepper input{width:40px!important}}'
 ].join('');document.head.append(style);
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('aoqatAdhanChanged',schedule);schedule();
})();
