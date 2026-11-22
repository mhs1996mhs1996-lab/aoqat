"use strict";
(function(){

 const roots='#settingsContentDialog,#adhanServicesDialog';
 const switches='[data-global-mode],[data-prayer][data-mode],.pa-switch,.interface-visibility-btn,#manualEditToggle,#adEnable,#autoTomorrowToggle,#tomorrowNotifyToggle,#tomorrowAlarmEnable,#iqamaNotificationToggle,button[data-enabled],[data-time-mode]';
 const skip='#adAudibilityHelp,.aoqat-help-circle,[data-azkar-toggle],[data-azkar-mode],[data-post-reminder],#frReminderToggle,#fastingReminderToggle,.wt-card,.color-swatch,.palette-color,[data-color],.web-back,.web-drawer-row,[data-drawer],#aqReader button,.web-settings-list .main-action,#aoqatPersonalProfile .aoqat-profile-row,#adhanServicesDialog #adhanPanel .ad-section-toggle,#adhanServicesDialog #adhanPanel #paMethodOpen,#adhanServicesDialog #adhanPanel #adRefresh';
 function on(button){const pressed=button.getAttribute('aria-pressed');if(pressed==='true'||pressed==='false')return pressed==='true';if(button.hasAttribute('data-enabled'))return button.dataset.enabled==='true';return button.matches('.pa-on,.is-on,.enabled,.on');}
 // Main drawer and nested navigation share the exact theme-surface gradients. Do not\n // inline-paint their buttons: inline !important used to override the CSS and\n // made nested sections dark while the twelve main entries stayed pale.\n // Selection is a state, so it must remain distinct from decorative button palettes.
 const modeStyle=document.createElement('style');modeStyle.id='webAdhanModeSelectionStyle';
 modeStyle.textContent=':is(#settingsContentDialog,#adhanServicesDialog) button[data-prayer][data-mode] small{color:inherit!important}:is(#settingsContentDialog,#adhanServicesDialog) button[data-prayer][data-mode][aria-pressed="true"] small::after{content:" ✓";font-weight:900}:is(#settingsContentDialog,#adhanServicesDialog) button[data-global-mode][aria-pressed="true"]::after{content:" ✓";font-weight:900}';
 document.head.appendChild(modeStyle);
 let queued=false;
 function paint(){queued=false;document.querySelectorAll(roots).forEach(root=>root.querySelectorAll('button').forEach(button=>{
  if(button.matches(skip)||button.closest('#aqReader,#monthlyCalendars'))return;
  // Only ON/OFF controls retain state colors. All navigation actions use their
  // own shared theme surface gradients, including buttons added in the future.
  if(!button.matches(switches))return;
  if(button.matches('[data-global-mode]')){
   const selected=[...(button.closest('#adSection-modes')?.querySelectorAll('[data-prayer][data-mode][aria-pressed="true"]')||[])];
   const active=selected.length===5&&new Set(selected.map(b=>b.dataset.prayer)).size===5&&selected.every(b=>b.dataset.mode===button.dataset.globalMode);
   if(button.getAttribute('aria-pressed')!==String(active))button.setAttribute('aria-pressed',String(active));
  }
  const active=on(button);
  button.style.setProperty('background',active?'#278052':'#858e8b','important');
  button.style.setProperty('color','#fff','important');
  button.style.setProperty('border-color',active?'#167043':'#859593','important');
  button.querySelectorAll('span,strong,b').forEach(x=>x.style.setProperty('color','#fff','important'));
 }));}
 function schedule(){if(!queued){queued=true;requestAnimationFrame(paint);}}
 function start(){
  const observer=new MutationObserver(records=>{if(records.some(r=>r.target===document.body&&r.attributeName==='data-web-theme'||r.target.closest?.(roots)||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.(roots)||n.querySelector?.(roots)))))schedule();});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-pressed','data-enabled','data-web-theme']});
  window.addEventListener('aoqatButtonAppearanceChanged',schedule);document.addEventListener('click',schedule,true);window.addEventListener('pageshow',schedule);schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();