/* Web-only design preview. Original settings actions remain unchanged. */
(function(){
'use strict';
if(window.AndroidNative?.configureAdhan)return;
const ROOTS='#webSubBody,#adhanServicesDialog';
const SKIP='.aqh-trigger,.aqh-back,.web-back,.ad-leaf-back,.design-popup-close,.inline-back-btn,#adhanServicesBack,[data-minute-step],.wt-card,.color-swatch,.palette-color,[data-color],[data-ayah],[data-page],[data-nav],.azr-permission,.aq-quiet-permission,#aqReader button,#monthlyCalendars button,#quranReader button,[aria-label="رجوع"]';
const descriptions={
 backgroundPanel:'إظهار عناصر الشاشة والتصاميم وتعديل الواجهة.',
 fontPanel:'اختيار نوع الخط وحجمه ولونه.',
 footerPanel:'تعديل النص أسفل التصميم.',
 adhanPanel:'عرض مواقيت الصلاة واختيار صوت الأذان.',
 iqamaPanel:'تحديد المدة بين الأذان والإقامة لكل صلاة.',
 afterIqamaPanel:'تحديد مدة ظهور عدّاد «مضى على الإقامة».',
 elements:'إظهار الساعة والتاريخ وعدّادي الصلاة والإقامة.',
 designs:'اختيار التصاميم الظاهرة على الواجهة.',
 tools:'ترتيب عناصر التصميم وتعديل مواضعها.',
 prayer:'ضبط الأذان والمنبّه والصامت لكل صلاة.',
 iqama:'التحكم بإشعار الإقامة.',
 friday:'ضبط تذكيرات سنن الجمعة.',
 fasting:'ضبط تذكيرات صيام التطوع.',
 azkar:'ضبط أوقات تذكير الأذكار.',
 publish:'التبديل إلى الغد وتنبيه النشر بعد العشاء.',
 calendarNotice:'تذكير نشر تقويم الشهر.',
 screen:'إضاءة الهاتف عند وصول التنبيهات.',
 autoTomorrowToggle:'التبديل التلقائي إلى مواقيت اليوم التالي.',
 tomorrowAlarmEnable:'تنبيه نشر مواقيت الغد بعد العشاء.',
 tomorrowNotifyToggle:'إشعار تذكير نشر مواقيت الغد.',
 iqamaNotificationToggle:'تشغيل إشعار عدّاد الإقامة.',
 aoqatWakeAllAlerts:'إضاءة الشاشة لجميع التنبيهات المفعّلة.',
 adEnable:'تشغيل صوت الأذان في أوقاته المحددة.',
 adRefresh:'تحديث عرض المواقيت المحفوظة.',
 paMethodOpen:'اختيار نوع التنبيه لكل صلاة.',
 adSilentSettingsToggle:'ضبط الصامت بعد الإقامة.',
 adAdhanSilentSettingsToggle:'ضبط الصامت عند الأذان.'
};
const hints=[
 [/أوقات بعد الإقامة|مضى على الإقامة/,'التحكم بمدة عدّاد مضى على الإقامة.'],
 [/أوقات الإقامة|باقي على الإقامة/,'تحديد وقت الإقامة وعدّادها لكل صلاة.'],
 [/الاستيقاظ/,'ضبط تذكير أذكار الاستيقاظ وموعده.'],
 [/الصباح/,'ضبط تذكير أذكار الصباح وموعده.'],
 [/المساء/,'ضبط تذكير أذكار المساء وموعده.'],
 [/النوم/,'ضبط تذكير أذكار النوم وموعده.'],
 [/بعد الصلاة/,'ضبط تذكير الأذكار بعد الصلاة.'],
 [/الصلاة على النبي/,'تذكير الصلاة على النبي ﷺ يوم الجمعة فقط.'],
 [/التسبيح|الذكر/,'ضبط مواعيد تذكير الذكر والتسبيح.'],
 [/الصامت|عدم الإزعاج/,'تحديد وقت الصامت واستعادة الوضع السابق.'],
 [/منبّه|تنبيه|الإشعار/,'التحكم بتشغيل هذا التنبيه وإعداداته.'],
 [/مشاركة|حفظ|تنزيل/,'مشاركة المحتوى أو حفظه على الهاتف.'],
 [/لون|الخلفية|الثيم/,'تغيير لون وشكل هذا العنصر.'],
 [/الخط|التنسيق/,'تغيير الخط وحجمه ولونه.'],
 [/الصلاة/,'عرض إعدادات الصلاة ومواقيتها.']
];
const style=document.createElement('style');style.id='aoqatThemeAwareHelpStyles';
style.textContent=[
 ':root{--aqh-accent:var(--wt-button-accent,var(--wt-accent,#668a51))}',
 '.aqh-row{position:relative!important;min-width:0;width:100%;box-sizing:border-box}',
 '.aqh-row>.aqh-target{box-sizing:border-box!important;width:100%!important;padding-left:43px!important}',
 'body.design-menu-open :is(#settingsContentDialog,#adhanServicesDialog) .aqh-row>.aqh-trigger,.aqh-row>.aqh-trigger{position:absolute!important;left:2px!important;top:50%!important;transform:translateY(-50%)!important;z-index:6!important;width:39px!important;height:40px!important;min-width:39px!important;min-height:40px!important;padding:0!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important;border:0!important;border-radius:50%!important;background:transparent!important;color:var(--aqh-accent)!important;box-shadow:none!important;cursor:pointer!important;touch-action:manipulation!important}',
 '.aqh-trigger .aqh-dot,body.design-menu-open .aqh-trigger .aqh-dot{display:flex!important;align-items:center!important;justify-content:center!important;width:20px!important;height:20px!important;min-width:20px!important;border-radius:50%!important;box-sizing:border-box!important;border:1px solid color-mix(in srgb,var(--aqh-accent) 60%,var(--wt-border,#c6d4c7))!important;background:color-mix(in srgb,var(--aqh-accent) 12%,var(--wt-surface,#fff))!important;color:var(--aqh-accent)!important;font-family:Tahoma,Arial,sans-serif!important;font-size:12px!important;font-weight:800!important;line-height:1!important;box-shadow:none!important;pointer-events:none!important}',
 '.aqh-trigger:focus-visible{outline:2px solid var(--aqh-accent)!important;outline-offset:1px}',
 '.aqh-trigger:active .aqh-dot{transform:scale(.94)}',
 '#aoqatHelpPage{position:fixed!important;inset:0!important;z-index:2147483040!important;display:flex!important;flex-direction:column!important;box-sizing:border-box!important;width:100vw!important;max-width:100vw!important;height:100dvh!important;margin:0!important;padding:0!important;overflow:hidden!important;direction:rtl!important;background:var(--wt-surface,#fffef8)!important;color:var(--wt-text,#253b34)!important}',
 '#aoqatHelpPage .aqh-head{min-height:70px;box-sizing:border-box;display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid var(--wt-border,#ddd);background:var(--wt-top,var(--wt-surface,#fff))}',
 '#aoqatHelpPage .aqh-back{border:1px solid color-mix(in srgb,var(--aqh-accent) 42%,var(--wt-border,#ddd))!important;border-radius:9px!important;background:color-mix(in srgb,var(--aqh-accent) 13%,var(--wt-surface,#fff))!important;color:var(--wt-text,#253b34)!important;min-width:62px!important;height:35px!important;padding:4px 9px!important;font-family:inherit!important;font-size:13px!important;font-weight:700!important;box-shadow:none!important;cursor:pointer!important}',
 '#aoqatHelpPage .aqh-top-title{margin:0!important;flex:1;font-size:19px!important;color:var(--wt-text,#253b34)!important;font-weight:800!important;text-align:right}',
 '#aoqatHelpPage .aqh-body{flex:1;overflow-y:auto;padding:26px 20px;line-height:1.9;color:var(--wt-text,#253b34)!important;text-align:right}',
 '#aoqatHelpPage .aqh-label{font-size:17px;font-weight:800;margin:0 0 16px}',
 '#aoqatHelpPage .aqh-description{font-size:15px;margin:0;max-width:650px}',
 '#aoqatHelpPage .aqh-rule{height:3px;width:42px;margin:12px 0 20px;border-radius:5px;background:var(--aqh-accent)}'
].join('');document.head.appendChild(style);
let overlay=null,previousFocus=null,background=null,previousInert=false,queued=false;
function clean(s){return String(s||'').replace(/[‹›«»؟?]/g,'').replace(/[\u{1F300}-\u{1FAFF}]/gu,'').replace(/\s+/g,' ').trim().slice(0,80);}
function info(button){
 const key=button.dataset.alertSection||button.dataset.panel||button.dataset.interfacePage||button.dataset.alertAzkar||button.dataset.bagSection||button.id;
 const title=clean(button.getAttribute('aria-label')||button.textContent)||'هذا الإعداد';
 const detail=button.dataset.aoqatHelp||descriptions[key]||hints.find(([re])=>re.test(title))?.[1]||('اضغط على الزر لتغيير إعداد «'+title+'».');
 return {title,detail};
}
function close(){
 if(!overlay)return;overlay.remove();overlay=null;
 if(background?.isConnected)background.inert=previousInert;
 background=null;document.removeEventListener('keydown',onKey,true);
 if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 previousFocus=null;
}
function onKey(event){if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}}
function open(button){
 close();
 const {title,detail}=info(button);
 const host=button.closest('#adhanServicesDialog')||document.getElementById('settingsContentDialog');if(!host)return;
 previousFocus=document.activeElement;
 background=host.querySelector('#webDrawerSub')||(host.id==='adhanServicesDialog'?host.querySelector('#adhanServicesBody'):null);
 previousInert=!!background?.inert;
 const page=document.createElement('section');page.id='aoqatHelpPage';page.dir='rtl';page.setAttribute('role','dialog');page.setAttribute('aria-modal','true');
 const head=document.createElement('header');head.className='aqh-head';
 const back=document.createElement('button');back.type='button';back.className='aqh-back';back.textContent='‹ رجوع';back.setAttribute('aria-label','العودة إلى الإعدادات');
 const heading=document.createElement('h2');heading.className='aqh-top-title';heading.textContent='شرح الزر';head.append(back,heading);
 const body=document.createElement('div');body.className='aqh-body';
 const label=document.createElement('h3');label.className='aqh-label';label.textContent=title;
 const rule=document.createElement('div');rule.className='aqh-rule';rule.setAttribute('aria-hidden','true');
 const description=document.createElement('p');description.className='aqh-description';description.textContent=detail;
 body.append(label,rule,description);page.append(head,body);host.append(page);overlay=page;
 if(background)background.inert=true;
 back.addEventListener('click',close);document.addEventListener('keydown',onKey,true);back.focus({preventScroll:true});
}
function eligible(button){
 if(!button||button.matches(SKIP)||button.closest('#aoqatHelpPage,.aqh-row,#aqReader,#monthlyCalendars'))return false;
 if(button.hidden||button.disabled)return false;
 if(button.matches('.main-action,.wa-primary,.ad-section-toggle,.pa-switch,.interface-visibility-btn,[data-alert-azkar],[data-azkar-toggle],[data-azkar-mode],[data-azkar-kind],[data-web-quiet-toggle],[data-post-reminder],[data-prayer][data-mode],[data-global-mode],[data-time-mode],#autoTomorrowToggle,#tomorrowAlarmEnable,#tomorrowNotifyToggle,#iqamaNotificationToggle'))return true;
 const rect=button.getBoundingClientRect();return rect.width>=180&&rect.height>=32&&button.closest('#webSubBody,#adhanServicesDialog')!==null;
}
function wrap(button){
 if(!eligible(button)||button.classList.contains('aqh-target'))return;
 const row=document.createElement('div');row.className='aqh-row';button.before(row);row.append(button);button.classList.add('aqh-target');
 const help=document.createElement('button');help.type='button';help.className='aqh-trigger';
 help.setAttribute('aria-label','شرح '+info(button).title);help.title='شرح الزر';
 const dot=document.createElement('span');dot.className='aqh-dot';dot.textContent='؟';help.append(dot);
 help.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open(button);});row.append(help);
}
function scan(){
 queued=false;if(overlay)return;
 document.querySelectorAll(ROOTS).forEach(root=>root.querySelectorAll('button').forEach(wrap));
 document.querySelectorAll('.aqh-row').forEach(row=>{if(!row.querySelector(':scope > button.aqh-target'))row.remove();});
}
function refresh(){if(!queued){queued=true;requestAnimationFrame(scan);}}
function init(){
 new MutationObserver(changes=>{if(changes.some(x=>x.type==='childList'&&!x.target.closest?.('#aoqatHelpPage')))refresh();}).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('click',refresh,true);
 window.addEventListener('aoqatButtonAppearanceChanged',refresh);
 window.addEventListener('aoqatModulesReady',refresh);refresh();
}
window.AoqatSettingsHelp={refresh,close};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
