(function(){'use strict';
  if(window.AndroidNative?.configureAdhan)return;
  const KEY='aoqatIqamaAppearanceV1',MODES=['white','dark','transparent'];
  function mode(){try{const value=localStorage.getItem(KEY);return MODES.includes(value)?value:'transparent';}catch(_){return 'transparent';}}
  function paint(){const select=document.getElementById('iqamaAppearance'),preview=document.getElementById('iqamaAppearancePreview');if(!select||!preview)return;select.value=mode();preview.dataset.appearance=mode();}
  function move(){const target=document.getElementById('iqamaPanel'),button=document.getElementById('iqamaNotificationToggle');if(!target||!button)return false;
    let controls=document.getElementById('iqamaNotificationSettings');if(!controls){controls=document.createElement('section');controls.id='iqamaNotificationSettings';const title=document.createElement('h3');title.textContent='إشعار الإقامة';controls.appendChild(title);target.appendChild(controls);}
    // Move originals, preserving listeners, permissions and saved timing settings.
    if(button.parentElement!==controls)controls.appendChild(button);
    const repair=document.getElementById('iqamaBackgroundAccess');if(repair&&repair.parentElement!==controls)controls.appendChild(repair);
    let select=document.getElementById('iqamaAppearance');
    if(select){const label=select.closest('label');if(label&&label.parentElement!==controls)controls.appendChild(label);}
    else{const label=document.createElement('label');label.textContent='خلفية إشعار الإقامة';select=document.createElement('select');select.id='iqamaAppearance';for(const [value,text] of [['white','أبيض'],['dark','داكن'],['transparent','شفاف']])select.add(new Option(text,value));label.appendChild(select);controls.appendChild(label);select.onchange=()=>{try{localStorage.setItem(KEY,select.value);}catch(_){}paint();};
      const preview=document.createElement('div');preview.id='iqamaAppearancePreview';preview.textContent='باقي على الإقامة 00:00';controls.appendChild(preview);const note=document.createElement('p');note.className='ad-note';note.textContent='معاينة الخلفية على الويب؛ لون إشعار الهاتف نفسه يحدده المتصفح ونظام الهاتف.';controls.appendChild(note);}
    paint();return true;
  }
  function init(){const style=document.createElement('style');style.textContent='#iqamaNotificationSettings{margin-top:16px;padding-top:12px;border-top:1px solid var(--wt-border,#d9c8a8)}#iqamaNotificationSettings label{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0}#iqamaAppearance{max-width:150px}#iqamaAppearancePreview{padding:16px;border:1px solid var(--wt-border,#d9c8a8);border-radius:10px;text-align:center;font-weight:700}#iqamaAppearancePreview[data-appearance="white"]{background:#fff;color:#182c34}#iqamaAppearancePreview[data-appearance="dark"]{background:#172b37;color:#fff}#iqamaAppearancePreview[data-appearance="transparent"]{background:transparent;color:var(--wt-text,#182c34)}#webSettingsTemp #switchPanel{margin-top:12px!important}';document.head.appendChild(style);move();let tries=0;const timer=setInterval(()=>{if(move()||++tries>=60)clearInterval(timer);},150);window.addEventListener('aoqatModulesReady',move);document.addEventListener('prayerPreviewDateChanged',move);window.addEventListener('storage',e=>{if(e.key===KEY)paint();});}
  window.aoqatMoveNotificationSettings=move;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
