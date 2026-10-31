(function(){'use strict';
  // APK only: the web app does not control the physical phone's lock screen.
  const native=window.AndroidNative;
  if(!native?.readScreenWakeEnabled)return;
  function el(tag,text,klass){
    const n=document.createElement(tag);if(text!=null)n.textContent=text;
    if(klass)n.className=klass;return n;
  }
  function state(){
    try{return JSON.parse(native.screenWakeStatus?.()||'{}');}catch(_){return{};}
  }
  function style(){
    if(document.getElementById('aoqat-screen-alert-style'))return;
    const s=el('style');s.id='aoqat-screen-alert-style';
    s.textContent=[
      '.asw-page{direction:rtl;padding:18px 12px 25px;font:inherit;color:var(--wt-text,#3f3425);max-width:720px;margin:auto}',
      '.asw-card{background:linear-gradient(100deg,#fffdf8,#f6ebd5);border:1px solid #d9c69d;border-radius:16px;padding:17px 15px;margin-bottom:13px}',
      '.asw-card h3{margin:0 0 9px;color:#225c48;font-size:19px}.asw-card p{margin:8px 0;color:#675d4b;font-size:14px;line-height:1.8}',
      '.asw-switch{width:100%;min-height:56px;background:#e6e5dd;color:#493e2d;border:1px solid #bdaa7e;border-radius:13px;padding:12px;font:inherit;font-weight:750;font-size:17px;cursor:pointer}',
      '.asw-switch.enabled{background:#176e56;color:#fff;border-color:#176e56}',
      '.asw-permission{width:100%;padding:12px;min-height:48px;background:#f5ebd4;border:1px solid #bba16c;border-radius:12px;font:inherit;font-size:15px;color:#37583e;cursor:pointer}',
      '.asw-state{font-size:14px;line-height:1.8;color:#665b45;margin:13px 0 0}',
      '.asw-switch:focus-visible,.asw-permission:focus-visible{outline:3px solid #ba9244;outline-offset:3px}',
      // The hosted web calendar uses an outline 32x32 SVG. Keep the exact
      // intrinsic size and stroke in the APK drawer, regardless of OEM font/emoji.
      '#webDrawerMain .web-drawer-row[data-drawer="calendar"] .ico{display:inline-flex!important;justify-content:center!important;align-items:center!important;flex-shrink:0!important;width:30px!important;height:32px!important}',
      '#webDrawerMain .web-drawer-row[data-drawer="calendar"] .ico svg{width:28px!important;height:28px!important;display:block!important;fill:none!important;stroke:currentColor!important;vertical-align:middle!important}'
    ].join('');document.head.append(s);
  }
  function open(){
    style();
    const screen=el('section',null,'asw-page'),card=el('div',null,'asw-card');
    card.append(el('h3','💡 إضاءة شاشة الهاتف'),el('p','عند وصول أذانٍ مفعّل، أو إشعار صلاة اخترته، أو منبّه الصلاة، أو تنبيه النشر، يطلب التطبيق إضاءة شاشة القفل وفتح التنبيه بملء الشاشة.'));
    const toggle=el('button',null,'asw-switch');toggle.type='button';toggle.id='androidWakeScreenToggle';
    const status=el('p',null,'asw-state');status.id='androidWakeScreenStatus';
    const access=el('button','أذونات الإشعارات والعرض بملء الشاشة','asw-permission');access.type='button';access.id='androidWakeScreenAccess';
    function render(){
      const data=state(),on=!!native.readScreenWakeEnabled();
      toggle.classList.toggle('enabled',on);
      toggle.setAttribute('aria-pressed',String(on));
      toggle.textContent=on?'💡 إضاءة شاشة الهاتف: تشغيل':'💡 إضاءة شاشة الهاتف: إيقاف';
      status.textContent=!on?'الشاشة لا تُضاء بواسطة التطبيق، لكن الأذان والتنبيهات والأصوات تستمر بشكل طبيعي.':
        !data.notifications?'فعّل إذن الإشعارات من إعدادات الهاتف.':
        !data.fullScreen?'يجب السماح بعرض التنبيهات بملء الشاشة من إعدادات أندرويد 14 أو الأحدث.':
        'إضاءة الشاشة مفعّلة، وأذونات الإشعارات والعرض بملء الشاشة متاحة.';
    }
    toggle.onclick=()=>{native.configureScreenWake(!native.readScreenWakeEnabled());render();};
    access.onclick=()=>native.requestScreenWakeAccess?.();
    card.append(toggle,status);
    screen.append(card,access,
      el('p','مهم: على بعض أجهزة أندرويد، عند فتح الهاتف بالفعل قد تظهر نافذة علوية بدل ملء الشاشة؛ هذا سلوك يحدده النظام. تنبيه الصلاة المنفصل لا يظهر إلا إذا فعّله المستخدم.',
        'asw-state'));
    window.AoqatWebSettingsNavigation?.sub('إضاءة شاشة الهاتف',screen,'main');
    render();
  }
  // Export before drawer initialization; the settings drawer is built later.
  window.AoqatScreenAlerts={open};
  style();
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&document.getElementById('androidWakeScreenStatus')){
      const active=document.getElementById('androidWakeScreenToggle');
      const data=state();
      if(active && data.enabled)document.getElementById('androidWakeScreenStatus').textContent=
        !data.notifications?'فعّل إذن الإشعارات من إعدادات الهاتف.':
        !data.fullScreen?'اسمح للتطبيق بعرض التنبيهات بملء الشاشة في إعدادات الهاتف.':'أذونات إضاءة الشاشة متاحة.';
    }
  });
})();