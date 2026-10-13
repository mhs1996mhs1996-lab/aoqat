"use strict";
(function(){
 if(window.AndroidNative?.configureAdhan)return;
 const roots='#settingsContentDialog,#adhanServicesDialog';
 const switches='.pa-switch,.interface-visibility-btn,#manualEditToggle,#adEnable,#autoTomorrowToggle,#tomorrowNotifyToggle,#tomorrowAlarmEnable,#iqamaNotificationToggle,button[data-enabled]';
 const skip='.wt-card,.color-swatch,.palette-color,[data-color],.web-drawer-row,[data-drawer],#aqPaper button';
 function blend(hex,t){const n=parseInt(hex.slice(1),16),rgb=[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v*(1-t)));return '#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');}
 function lum(hex){const n=parseInt(hex.slice(1),16);return [n>>16,(n>>8)&255,n&255].map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
 function palette(){const accent=getComputedStyle(document.documentElement).getPropertyValue('--wt-accent').trim()||'#137985',a=blend(accent,.16),b=blend(accent,.02),l=[lum(a),lum(b)];const white=Math.min(...l.map(v=>1.05/(v+.05))),black=Math.min(...l.map(v=>(v+.05)/.05));return {background:'linear-gradient(135deg,'+a+','+b+')',color:white>=black?'#fff':'#10212a'};}
 function on(button){const pressed=button.getAttribute('aria-pressed');if(pressed==='true'||pressed==='false')return pressed==='true';if(button.hasAttribute('data-enabled'))return button.dataset.enabled==='true';return button.matches('.pa-on,.is-on,.enabled,.on');}
 let queued=false;
 function paint(){queued=false;const p=palette();document.querySelectorAll(roots).forEach(root=>root.querySelectorAll('button').forEach(button=>{
  if(button.matches(skip)||button.closest('#aqPaper'))return;
  const toggle=button.matches(switches);
  const bg=toggle?(on(button)?'linear-gradient(135deg,#16834c,#278052)':'#70817f'):p.background;
  button.style.setProperty('background',bg,'important');
  button.style.setProperty('color',toggle?'#fff':p.color,'important');
  button.style.setProperty('border-color',toggle?(on(button)?'#167043':'#859593'):'var(--wt-border)','important');
  button.querySelectorAll('span,strong,b').forEach(x=>x.style.setProperty('color',toggle?'#fff':p.color,'important'));
 }));}
 function schedule(){if(!queued){queued=true;requestAnimationFrame(paint);}}
 function start(){
  const observer=new MutationObserver(records=>{if(records.some(r=>r.target===document.body&&r.attributeName==='data-web-theme'||r.target.closest?.(roots)||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.(roots)||n.querySelector?.(roots)))))schedule();});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-pressed','data-enabled','data-web-theme']});
  document.addEventListener('click',schedule,true);window.addEventListener('pageshow',schedule);schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();