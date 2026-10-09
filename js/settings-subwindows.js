(function(){'use strict';
 const titles={friday:'تخصيص صلاة الجمعة',sound:'صوت الأذان',notifications:'التنبيهات',modes:'وضع الأذان لكل صلاة',services:'الخدمات'};
 function decorate(el,title,back,level){
  if(el.dataset.subwindow)return;el.dataset.subwindow='true';el.classList.add('ad-leaf-window');el.style.setProperty('--leaf-level',level);
  const head=document.createElement('header');head.className='ad-leaf-head';
  const b=document.createElement('button');b.type='button';b.className='ad-leaf-back';b.dataset.subwindowBack='true';b.textContent='‹ رجوع';b.setAttribute('aria-label','رجوع');b.onclick=back;
  const h=document.createElement('h3');h.textContent=title;head.append(b,h);
  const body=document.createElement('div');body.className='ad-leaf-body';while(el.firstChild)body.appendChild(el.firstChild);
  body.querySelector('h3,h4')?.remove();body.querySelector('#adFridayBack')?.remove();el.append(head,body);
  el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();back();}});
 }
 function mount(){
  const panel=document.getElementById('adhanPanel');if(!panel)return;
  panel.querySelectorAll('.ad-section').forEach(el=>{const id=el.id.replace('adSection-','');decorate(el,titles[id]||'الإعدادات',()=>panel.querySelector('[data-ad-section="'+id+'"]')?.click(),1);});
  const quiet=panel.querySelector('#adSilentSettings');if(quiet)decorate(quiet,'الصامت بعد الإقامة',()=>panel.querySelector('#adSilentSettingsToggle')?.click(),2);
  const editor=panel.querySelector('#paEditor .pa-settings');if(editor)decorate(editor,editor.querySelector('h4')?.textContent||'تعديل المنبّه',()=>panel.querySelector('#paCancel')?.click(),3);
 }
 window.aoqatCloseSettingsLeaves=()=>{
  const p=document.getElementById('adhanPanel');if(!p)return;
  for(const selector of ['#paEditor .pa-settings','#adSilentSettings','.ad-section:not([hidden])']){
   const el=p.querySelector(selector);if(el&&!el.hidden)el.querySelector('[data-subwindow-back]')?.click();
  }
 };
 new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();
})();
