(function(){'use strict';
  if(window.AndroidNative?.configureAdhan)return;
  const KEY='aoqatPrayerNotificationsV1',ids=['fajr','dhuhr','asr','maghrib','isha'],names={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
  let settings={enabled:false,volume:65,prayers:Object.fromEntries(ids.map(id=>[id,true]))},opened=false,noticeOpen=false,last=Date.now(),audio;
  try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');settings.enabled=raw.enabled===true;if(Number.isFinite(Number(raw.volume)))settings.volume=Math.max(0,Math.min(100,Number(raw.volume)));for(const id of ids)settings.prayers[id]=raw.prayers?.[id]!==false;}catch(_){}
  const $=id=>document.getElementById(id),seen=new Set();
  const selected=id=>settings.enabled&&settings.prayers[id]===true;
  window.aoqatPrayerNotificationSelected=selected;
  // A selected notification replaces the ordinary alarm for that prayer, retaining its preferences.
  const alarm=window.AoqatPrayerAlarmCore,allowed=alarm?.allowed;
  if(allowed)alarm.allowed=(config,event)=>!selected(event.id)&&allowed(config,event);
  function save(){localStorage.setItem(KEY,JSON.stringify(settings));}
  function unlock(){try{audio||=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch(_){} }
  function chime(){if(!audio||audio.state!=='running')return;const at=audio.currentTime;for(const [offset,freq] of [[0,880],[.18,1174]]){const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.frequency.value=freq;gain.gain.setValueAtTime(0,at+offset);gain.gain.linearRampToValueAtTime(settings.volume/100*.2,at+offset+.015);gain.gain.exponentialRampToValueAtTime(.001,at+offset+.16);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(at+offset);oscillator.stop(at+offset+.18);}}
  function close(){if(!$('paMethodPanel'))return;if(!$('adSilentSettings')?.hidden)$('adSilentSettingsToggle')?.click();if(!$('prayerAlarmPanel')?.hidden)$('paOpen')?.click();if(!$('adSection-modes')?.hidden)document.querySelector('[data-ad-section="modes"]')?.click();if(!$('adSection-notifications')?.hidden)document.querySelector('[data-ad-section="notifications"]')?.click();noticeOpen=false;if($('pnPanel'))$('pnPanel').hidden=true;opened=false;$('paMethodPanel').hidden=true;$('paMethodOpen').setAttribute('aria-expanded','false');$('paMethodOpen').focus({preventScroll:true});}
  function leaf(id,title,level,back){const section=document.createElement('section');section.id=id;section.className='ad-leaf-window';section.hidden=true;section.style.setProperty('--leaf-level',level);section.innerHTML='<header class="ad-leaf-head"><button type="button" class="ad-leaf-back" data-subwindow-back>‹ رجوع</button><h3>'+title+'</h3></header><div class="ad-leaf-body"></div>';section.querySelector('button').onclick=back;section.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();back();}});return section;}
  function drawNotice(){const body=$('pnPanel')?.querySelector('.ad-leaf-body');if(!body)return;body.innerHTML=`<div class="ad-card"><div class="pa-master-row"><span>إشعار مع صوت إشعار</span><button type="button" id="pnEnable" class="pa-switch ${settings.enabled?'pa-on':''}" aria-pressed="${settings.enabled}">${settings.enabled?'تشغيل':'إيقاف'}</button></div><fieldset ${settings.enabled?'':'disabled'}>${ids.map(id=>`<label>${names[id]}<input type="checkbox" data-pn-prayer="${id}" ${settings.prayers[id]?'checked':''}></label>`).join('')}<label>مستوى صوت الإشعار<input id="pnVolume" type="range" min="0" max="100" value="${settings.volume}"></label><button type="button" id="pnPreview">تجربة صوت الإشعار</button></fieldset><p class="ad-note">للصلوات المختارة يصدر إشعار قصير بدل الأذان ومنبّه الهاتف، وتبقى إعداداتهما محفوظة. تنبيه الويب يعمل أثناء فتح الصفحة؛ اسمح بالإشعارات حتى تظهر في قائمة إشعارات الهاتف.</p><p id="pnStatus" role="status"></p></div>`;
    $('pnEnable').onclick=async()=>{unlock();settings.enabled=!settings.enabled;save();drawNotice();if(settings.enabled&&'Notification' in window&&Notification.permission==='default'){await Notification.requestPermission();}if(settings.enabled&&(!('Notification' in window)||Notification.permission!=='granted'))$('pnStatus').textContent='الإشعارات غير مسموحة؛ سيظهر التنبيه داخل الصفحة مع الصوت.';};
    body.querySelectorAll('[data-pn-prayer]').forEach(input=>input.onchange=()=>{settings.prayers[input.dataset.pnPrayer]=input.checked;save();});$('pnVolume').oninput=e=>{settings.volume=Number(e.target.value);save();};$('pnPreview').onclick=()=>{unlock();chime();};
  }
  function mount(){const panel=$('adhanPanel'),mode=panel?.querySelector('[data-ad-section="modes"]'),phone=$('paOpen');if(!panel||!mode||!phone)return;
    let root=$('paMethodPanel');if(!root){const button=document.createElement('button');button.id='paMethodOpen';button.type='button';button.className='ad-section-toggle';button.setAttribute('aria-controls','paMethodPanel');button.innerHTML='<span aria-hidden="true">🔔</span><span>اختيار طريقة تنبيه الصلاة</span><span aria-hidden="true">‹</span>';root=leaf('paMethodPanel','اختيار طريقة تنبيه الصلاة',1,close);panel.insertBefore(button,phone);panel.append(root);button.onclick=()=>{opened=!opened;root.hidden=!opened;button.setAttribute('aria-expanded',String(opened));if(opened)root.querySelector('button').focus({preventScroll:true});};
      const body=root.querySelector('.ad-leaf-body');body.classList.add('pa-method-choices');const noticeButton=document.createElement('button');noticeButton.id='pnOpen';noticeButton.type='button';noticeButton.className='ad-section-toggle';noticeButton.textContent='🔔 إشعار مع صوت إشعار ‹';noticeButton.onclick=()=>{noticeOpen=true;$('pnPanel').hidden=false;$('pnPanel').querySelector('button').focus({preventScroll:true});};body.append(phone,mode,noticeButton);
      const notices=leaf('pnPanel','إشعار مع صوت إشعار',2,()=>{noticeOpen=false;$('pnPanel').hidden=true;$('pnOpen').focus({preventScroll:true});});panel.append(notices);drawNotice();
    }
    root.hidden=!opened;$('paMethodOpen').setAttribute('aria-expanded',String(opened));$('pnPanel').hidden=!noticeOpen;
    // Keep the existing controls and their handlers in one ordered web-only list.
    panel.classList.add('pa-ordered-layout');
    let menu=$('paAlertMenu');
    if(!menu){menu=document.createElement('div');menu.id='paAlertMenu';menu.setAttribute('aria-label','إعدادات الأذان والتنبيه');panel.insertBefore(menu,$('adEnable').nextSibling);}
    const enabled=$('adEnable')?.getAttribute('aria-pressed')==='true';
    const sound=panel.querySelector('[data-ad-section="sound"]'),notifications=panel.querySelector('[data-ad-section="notifications"]'),friday=panel.querySelector('[data-ad-section="friday"]');
    const choices=root.querySelector('.ad-leaf-body');if(notifications&&notifications.parentElement!==choices)choices.appendChild(notifications);
    const quietButton=$('adSilentSettingsToggle'),quietPanel=$('adSilentSettings');
    if(quietButton&&quietButton.parentElement!==choices)choices.appendChild(quietButton);
    if(quietPanel&&quietPanel.parentElement!==panel)panel.appendChild(quietPanel);
    if(quietButton)quietButton.disabled=!enabled;
    [$('paMethodOpen'),sound,friday].forEach((button,index)=>{if(button&&menu.children[index]!==button)menu.insertBefore(button,menu.children[index]||null);});
    for(const button of [sound,notifications])if(button)button.disabled=!enabled;
    mode.disabled=$('adEnable')?.getAttribute('aria-pressed')!=='true';
    for(const id of ['prayerAlarmPanel','adSection-modes','adSection-notifications'])$(id)?.style.setProperty('--leaf-level',2);
    $('adSilentSettings')?.style.setProperty('--leaf-level',2);
    const phoneLabel=phone.querySelector('span:nth-child(2)'),modeLabel=mode.querySelector('span:nth-child(2)');if(phoneLabel.textContent!=='منبّه الهاتف')phoneLabel.textContent='منبّه الهاتف';if(modeLabel.textContent!=='صوت الأذان ووضعه لكل صلاة')modeLabel.textContent='صوت الأذان ووضعه لكل صلاة';
  }
  const oldClose=window.aoqatCloseSettingsLeaves;window.aoqatCloseSettingsLeaves=()=>{oldClose?.();close();};
  new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();
  async function notify(title,tag){const options={body:'أوقات الصلاة في الحويجة',tag,silent:true};try{const registration=await navigator.serviceWorker?.getRegistration();if(registration)await registration.showNotification(title,options);else new Notification(title,options);}catch(_){} }
  function tick(){const now=Date.now();try{const rows=JSON.parse(localStorage.getItem('aoqatAdhanRows')||'[]'),ad=JSON.parse(localStorage.getItem('aoqatAdhanV1')||'{}');for(const event of window.AoqatAdhanCore.events(rows,new Date(now),ad)){if(event.customFriday||!selected(event.id)||event.at<=last||event.at>now||now-event.at>=120000)continue;const key=event.id+':'+event.at;if(seen.has(key))continue;seen.add(key);const title='حان وقت صلاة '+names[event.id];const quiet=window.AoqatAdhanCore.fridayQuietWindow(rows,new Date(now),ad)||window.AoqatAdhanCore.afterIqamaSilentWindow(rows,new Date(now),ad,JSON.parse(localStorage.getItem('aoqatIqamaMinutesV1')||'{}'));if(!quiet)chime();if($('adStatus'))$('adStatus').textContent=title;if('Notification' in window&&Notification.permission==='granted')notify(title,'aoqat-prayer-notification-'+key);if($('pnStatus'))$('pnStatus').textContent=title;}}catch(_){}last=now;}
  document.addEventListener('pointerdown',()=>{if(settings.enabled)unlock();});
  setInterval(tick,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
})();
