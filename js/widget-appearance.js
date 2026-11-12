(function(){
"use strict";
if(window.AoqatWidgetAppearance)return;
const KEY="aoqatWidgetAppearanceV1";
const IDS=["next","times","five_grid","five_featured","iqama","combined"];
const NAMES={
 next:"الصلاة القادمة",
 times:"مواقيت الصلاة مع الصلاة القادمة",
 five_grid:"المواقيت الستة 3 + 3",
 five_featured:"المواقيت الستة بإطارات مميزة",
 iqama:"باقي ومضى على الإقامة",
 combined:"الصلاة القادمة والإقامة"
};
const BG={
 transparent:["شفاف","transparent"],
 mist:["ضبابي هادئ","rgba(37,78,100,.50)"],
 blue:["أزرق هادئ","rgba(17,80,109,.83)"],
 dark:["داكن مميز","rgba(12,37,53,.88)"],
 cream:["عاجي شفاف","rgba(239,230,213,.87)"]
};
const FONTS={
 sans:["واضح حديث","Tahoma,Arial,sans-serif"],
 serif:["نسخي كلاسيكي","serif"],
 condensed:["خط مختصر","Arial Narrow,Tahoma,sans-serif"],
 medium:["حديث متوسط","Arial,Tahoma,sans-serif"]
};
const WEIGHTS={normal:"عادي",bold:"عريض"};
const COLOR_NAMES={white:"#ffffff",ivory:"#fff6d6",gold:"#ffdb80",navy:"#123143",black:"#1c2327",emerald:"#237f60"};
const GROUP_DEFAULT={font:"sans",size:105,weight:"bold",color:"#ffffff"};
const group=(item,legacy)=>({
 font:FONTS[item?.font]?item.font:legacy.font,
 size:Math.max(65,Math.min(170,Number(item?.size)||legacy.size)),
 weight:WEIGHTS[item?.weight]?item.weight:legacy.weight,
 color:/^#[0-9a-fA-F]{6}$/.test(item?.color||"")?item.color:(COLOR_NAMES[item?.color]||legacy.color)
});
const defaults=id=>({
 background:["times","combined","five_grid","five_featured"].includes(id)?"mist":"transparent",
 labels:{...GROUP_DEFAULT},
 numbers:{...GROUP_DEFAULT},
 color:"white",font:"sans",scale:105,layout:"classic"
});
const normalize=(id,value)=>{
 const v=value&&typeof value==="object"?value:{};
 const d=defaults(id);
 if(BG[v.background])d.background=v.background;
 if(typeof v.layout==="string")d.layout=v.layout;
 const legacy={
  font:FONTS[v.font]?v.font:"sans",
  color:COLOR_NAMES[v.color]||( /^#[0-9a-fA-F]{6}$/.test(v.color||"")?v.color:"#ffffff"),
  size:Math.max(75,Math.min(145,Number(v.scale)||105)),weight:"bold"
 };
 d.color=v.color||"white";d.font=legacy.font;d.scale=legacy.size;
 d.labels=group(v.labels,legacy);d.numbers=group(v.numbers,legacy);
 return d;
};
function load(){
 let saved={};
 try{saved=JSON.parse(window.AndroidNative?.readWidgetAppearance?.()||localStorage.getItem(KEY)||"{}")||{};}catch(_){}
 return Object.fromEntries(IDS.map(id=>[id,normalize(id,saved[id]||((id==="five_grid"||id==="five_featured")?saved.times:undefined))]));
}
function save(data){
 try{
  const value=JSON.stringify(data);
  if(window.AndroidNative?.configureWidgetAppearance && window.AndroidNative.configureWidgetAppearance(value)===false)return false;
  localStorage.setItem(KEY,value);return true;
 }catch(e){console.warn("Widget style could not save",e);return false;}
}
function css(){
 if(document.getElementById("aoqatWidgetAppearanceCss"))return;
 const sheet=document.createElement("style");sheet.id="aoqatWidgetAppearanceCss";
 sheet.textContent=[
 "#aoqatWidgetAppearance{display:grid;gap:9px;direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#1d3d44}",
 "#aoqatWidgetAppearance button,#aoqatWidgetAppearance select,#aoqatWidgetAppearance input{font:inherit}",
 "#aoqatWidgetAppearance .wa-primary{width:100%;border:1px solid #a7bdb7;border-radius:10px;background:#edf4f2;color:#204650;padding:10px;font-weight:800;text-align:center}",
 "#aoqatWidgetAppearance .wa-chooser{display:grid;grid-template-columns:1fr 1fr;gap:5px}",
 "#aoqatWidgetAppearance .wa-chooser[hidden],#aoqatWidgetAppearance .wa-style-editor[hidden]{display:none!important}",
 "#aoqatWidgetAppearance .wa-chooser button{border:1px solid #b5cbca;border-radius:9px;background:#f8f9f7;padding:9px 5px;font-size:12px;color:#173a43}",
 "#aoqatWidgetAppearance .wa-chooser button[aria-pressed=true]{background:#1b6161;color:white}",
 "#aoqatWidgetAppearance .wa-preview{display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:18px;padding:10px;gap:5px;min-height:75px;max-width:100%;overflow:hidden;box-shadow:inset 0 0 0 1px #c2d2d1a8}",
 "#aoqatWidgetAppearance .wa-preview *{box-sizing:border-box;min-width:0}",
 "#aoqatWidgetAppearance .wa-line{display:flex;align-items:center;justify-content:center;direction:rtl;gap:8px;max-width:100%;line-height:1.25}",
 "#aoqatWidgetAppearance .wa-line .wa-number{white-space:nowrap;direction:ltr;unicode-bidi:isolate}",
 "#aoqatWidgetAppearance .wa-timetable{display:grid;gap:3px;min-width:55%;max-width:100%}",
 "#aoqatWidgetAppearance .wa-time-row{display:flex;justify-content:center;align-items:center;gap:13px;direction:rtl;border-radius:7px;padding:1px 4px}",
 "#aoqatWidgetAppearance .wa-time-row.is-next{background:#21766379;outline:1px solid #e6cf9b}",
 "#aoqatWidgetAppearance .wa-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px;width:100%;direction:rtl;text-align:center}",
 "#aoqatWidgetAppearance .wa-grid-cell{display:flex;flex-direction:column;align-items:center;gap:0;padding:2px 0}",
 "#aoqatWidgetAppearance .wa-grid:not(.wa-featured) .wa-grid-cell{border-bottom:1px solid #e5f2ef66}",
 "#aoqatWidgetAppearance .wa-grid.wa-featured .wa-grid-cell{border:1px solid #dcc28c;border-radius:8px}",
 "#aoqatWidgetAppearance .wa-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;width:100%;direction:rtl}",
 "#aoqatWidgetAppearance .wa-pair>.wa-line{border:1px solid #8aa7aa;border-radius:11px;padding:5px 3px;gap:4px}",
 "#aoqatWidgetAppearance .wa-style-editor{display:grid;gap:7px}",
 "#aoqatWidgetAppearance .wa-style-group{border:1px solid #a8c6c8;border-radius:10px;padding:8px;display:grid;gap:6px}",
 "#aoqatWidgetAppearance .wa-style-group>strong{font-size:14px}",
 "#aoqatWidgetAppearance .wa-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}",
 "#aoqatWidgetAppearance .wa-field{display:grid;gap:3px;font-size:12px;font-weight:700}",
 "#aoqatWidgetAppearance select,#aoqatWidgetAppearance input[type=color]{height:37px;border:1px solid #adc5c6;border-radius:8px;width:100%;background:white;color:#18353f}",
 "#aoqatWidgetAppearance input[type=range]{width:100%;accent-color:#25766a}",
 "#aoqatWidgetAppearance .wa-note{font-size:12px;color:#4b5c63;line-height:1.7}",
 "#aoqatWidgetAppearance .wa-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px}"
 ].join("\n");
 document.head.append(sheet);
}
function createPanel(){
 css();
 const data=load();
 let active="next",showList=false,showEditor=false;
 const root=document.createElement("section");root.id="aoqatWidgetAppearance";root.dir="rtl";
 const title=document.createElement("strong");title.textContent="تعديل بطاقات الشاشة الرئيسية";
 const chooserBtn=document.createElement("button");chooserBtn.type="button";chooserBtn.className="wa-primary";
 const chooser=document.createElement("div");chooser.className="wa-chooser";chooser.hidden=true;
 const buttons={};
 const preview=document.createElement("div");preview.className="wa-preview";
 const typographyBtn=document.createElement("button");typographyBtn.className="wa-primary";typographyBtn.type="button";
 typographyBtn.textContent="🔤 تنسيق الخط — العبارات والأرقام بشكل منفصل";
 const styleEditor=document.createElement("div");styleEditor.className="wa-style-editor";styleEditor.hidden=true;
 const bgField=document.createElement("label");bgField.className="wa-field";bgField.textContent="خلفية البطاقة";
 const bgSelect=document.createElement("select");bgSelect.setAttribute("aria-label","خلفية البطاقة");
 Object.entries(BG).forEach(([id,arr])=>{const o=document.createElement("option");o.value=id;o.textContent=arr[0];bgSelect.append(o);});
 bgField.append(bgSelect);
 const actions=document.createElement("div");actions.className="wa-actions";
 const pin=document.createElement("button");pin.type="button";pin.className="wa-primary";pin.textContent="إضافة إلى الشاشة الرئيسية";
 const reset=document.createElement("button");reset.type="button";reset.className="wa-primary";reset.textContent="إرجاع البطاقة للأصل";
 actions.append(pin,reset);
 const note=document.createElement("p");note.className="wa-note";
 note.textContent="حجم البطاقات تحدده شاشة الهاتف الرئيسية.";
 const status=document.createElement("p");status.className="wa-note";status.setAttribute("role","status");
 const lockSection=document.createElement("section");lockSection.className="wa-style-group";lockSection.id="aoqatLockScreenSection";
 const lockHeading=document.createElement("strong");lockHeading.textContent="الصلاة القادمة على شاشة القفل";
 const lockExplanation=document.createElement("p");lockExplanation.className="wa-note";
 lockExplanation.textContent="";
 const lockToggle=document.createElement("button");lockToggle.className="wa-primary";lockToggle.type="button";
 const lockAccess=document.createElement("button");lockAccess.className="wa-primary";lockAccess.type="button";
 lockAccess.textContent="ضبط أذونات التنبيهات وشاشة القفل";
 const lockStatus=document.createElement("p");lockStatus.className="wa-note";lockStatus.setAttribute("role","status");
 const hasLock=!!window.AndroidNative?.configureLockScreenPrayer;
 let lockEnabled=hasLock&&window.AndroidNative.readLockScreenPrayerEnabled?.()===true;
 const syncLock=()=>{
  lockToggle.textContent=lockEnabled?"إيقاف إشعار شاشة القفل":"تشغيل إشعار شاشة القفل";
  lockToggle.setAttribute("aria-pressed",String(lockEnabled));
 };
 function checkLock(){
  if(!hasLock)return;
  try{
   const state=JSON.parse(window.AndroidNative.readLockScreenPrayerStatus?.()||"{}");
   if(!state.enabled)lockStatus.textContent="متوقف. شغّل الإشعار حتى يظهر عدّاد الصلاة.";
   else if(!state.notificationsAllowed||!state.channelAllowed)lockStatus.textContent="يلزم السماح بإشعارات التطبيق وإظهارها على شاشة القفل. استخدم زر ضبط الأذونات.";
   else if(!state.notificationActive)lockStatus.textContent="الإشعار مفعل، وسينشر عند تحديث المواقيت. إذا لم يظهر افتح ضبط الأذونات.";
   else lockStatus.textContent="الإشعار منشور. لإظهار الأرقام على القفل اسمح بعرض محتوى إشعارات الهاتف.";
  }catch(_){lockStatus.textContent="تحقق من أذونات إشعارات الهاتف.";}
 }
 lockToggle.onclick=()=>{
  if(!hasLock)return;
  const next=!lockEnabled;
  if(window.AndroidNative.configureLockScreenPrayer(next)!==true){lockStatus.textContent="تعذر حفظ الخيار.";return;}
  lockEnabled=next;syncLock();checkLock();
 };
 lockAccess.onclick=()=>{
  if(window.AndroidNative?.openPrayerEssentialPermissions){
   const state=JSON.parse(window.AndroidNative.readLockScreenPrayerStatus?.()||"{}");
   if(!state.notificationsAllowed)window.AndroidNative.openPrayerEssentialPermissions();
   else window.AndroidNative.openLockScreenNotificationSettings?.();
  }else window.AndroidNative?.openLockScreenNotificationSettings?.();
 };
 // Short help beside the existing Android controls, without changing callbacks.
 function lockButtonWithHelp(action,description){
  const row=document.createElement('div');row.className='wa-help-row';
  const help=document.createElement('button');help.type='button';help.className='wa-help-dot';
  help.textContent='?';help.setAttribute('aria-label','شرح '+action.textContent.trim());
  help.setAttribute('aria-expanded','false');
  const detail=document.createElement('p');detail.className='wa-help-detail';detail.hidden=true;
  detail.textContent=description;
  help.onclick=()=>{detail.hidden=!detail.hidden;help.setAttribute('aria-expanded',String(!detail.hidden));};
  row.append(action,help,detail);return row;
 }
 if(!document.getElementById('aoqatWidgetHelpCss')){
  const style=document.createElement('style');style.id='aoqatWidgetHelpCss';
  style.textContent='#aoqatLockScreenSection .wa-help-row{position:relative;display:block;width:100%}#aoqatLockScreenSection .wa-help-row>.wa-primary{width:100%;padding-left:46px!important;box-sizing:border-box}#aoqatLockScreenSection .wa-help-dot{position:absolute;left:9px;top:9px;width:30px;height:30px;min-height:30px;border-radius:50%;border:1px solid #9dc6ad;background:#eff8f2;color:#1b5c3a;font-size:18px;font-weight:800;z-index:2}#aoqatLockScreenSection .wa-help-detail{font-size:13px;line-height:1.6;margin:4px 0 7px;background:#f3faf5;padding:8px;border:1px solid #cae3d1;border-radius:7px}#aoqatLockScreenSection .wa-help-detail[hidden]{display:none!important}';
  document.head.append(style);
 }
 lockSection.append(lockHeading);
 if(hasLock){syncLock();
  lockSection.append(
   lockButtonWithHelp(lockToggle,'عرض عدّاد الصلاة والإقامة في إشعار شاشة القفل.'),
   lockButtonWithHelp(lockAccess,'السماح بعرض الإشعارات على شاشة القفل.')
  );
  lockSection.append(lockStatus);checkLock();}
 else {
  const webNote=document.createElement("p");webNote.className="wa-note";
  webNote.textContent="إشعار شاشة القفل وأذوناته متاحان في نسخة أندرويد فقط.";
  lockSection.append(webNote);
 }
 const line=(parent,a,b)=>{
  const el=document.createElement("div");el.className="wa-line";
  const label=document.createElement("span");label.className="wa-label";label.textContent=a;
  const time=document.createElement("strong");time.className="wa-number";time.textContent=b;
  el.append(label,time);parent.append(el);return el;
 };
 function demo(){
  const cfg=data[active];preview.replaceChildren();
  preview.style.background=BG[cfg.background][1];
  const prayers=[["الفجر","5:17 ص"],["الشروق","6:33 ص"],["الظهر","11:53 ص"],
                 ["العصر","2:49 م"],["المغرب","5:09 م"],["العشاء","6:29 م"]];
  if(active==="next"){
   line(preview,"باقي على صلاة الفجر","06:23:03");
  }else if(active==="combined"){
   const both=document.createElement("div");both.className="wa-pair";
   line(both,"أذان الفجر بعد","06:23:03");line(both,"باقي على الإقامة","00:00");preview.append(both);
  }else if(active==="iqama"){
   const title=document.createElement("strong");title.className="wa-label";title.textContent="الفجر";preview.append(title);
   line(preview,"باقي على الإقامة","00:00");line(preview,"مضى على الإقامة","00:00");
  }else if(active==="times"){
   line(preview,"باقي على صلاة الفجر","06:23:03");
   const header=document.createElement("strong");header.className="wa-label";header.textContent="مواقيت الصلاة اليوم";preview.append(header);
   const rows=document.createElement("div");rows.className="wa-timetable";
   prayers.forEach(([a,b],i)=>{const r=document.createElement("div");r.className="wa-time-row"+(i===0?" is-next":"");
    line(r,a,b);rows.append(r);});preview.append(rows);
  }else{
   const header=document.createElement("strong");header.className="wa-label";header.textContent="مواقيت الصلاة اليوم";preview.append(header);
   const grid=document.createElement("div");grid.className="wa-grid"+(active==="five_featured"?" wa-featured":"");
   prayers.forEach(([a,b])=>{const cell=document.createElement("div");cell.className="wa-grid-cell";
    const n=document.createElement("span");n.className="wa-label";n.textContent=a;
    const t=document.createElement("strong");t.className="wa-number";t.textContent=b;
    cell.append(n,t);grid.append(cell);});preview.append(grid);
  }
  preview.querySelectorAll(".wa-label").forEach(el=>{
   el.style.fontFamily=FONTS[cfg.labels.font][1];
   el.style.fontWeight=cfg.labels.weight==="bold"?"800":"400";
   el.style.color=cfg.labels.color;
   el.style.fontSize=(15*cfg.labels.size/100)+"px";
  });
  preview.querySelectorAll(".wa-number").forEach(el=>{
   el.style.fontFamily=FONTS[cfg.numbers.font][1];
   el.style.fontWeight=cfg.numbers.weight==="bold"?"800":"400";
   el.style.color=cfg.numbers.color;
   el.style.fontSize=(18*cfg.numbers.size/100)+"px";
  });
 }
 function persist(){
  status.textContent=save(data)?"تم حفظ إعدادات هذه البطاقة وتحديثها.":"تعذر الحفظ؛ أعد المحاولة.";
  demo();
 }
 function field(label,name,element){
  const wrap=document.createElement("label");wrap.className="wa-field";wrap.textContent=label;
  element.setAttribute("aria-label",label);wrap.append(element);return wrap;
 }
 function choices(options,value,onChange){
  const select=document.createElement("select");
  Object.entries(options).forEach(([id,label])=>{
   const option=document.createElement("option");option.value=id;
   option.textContent=Array.isArray(label)?label[0]:label;
   select.append(option);
  });
  select.value=value;select.onchange=()=>onChange(select.value);return select;
 }
 function buildGroups(){
  styleEditor.replaceChildren();
  for(const key of ["labels","numbers"]){
   const g=data[active][key];const groupBox=document.createElement("div");groupBox.className="wa-style-group";
   const name=document.createElement("strong");name.textContent=key==="labels"?"تنسيق العبارات وأسماء الصلوات":"تنسيق الأرقام والأوقات والعدادات";
   const fields=document.createElement("div");fields.className="wa-fields";
   fields.append(
     field("نوع الخط",key==="labels"?"labels-font":"numbers-font",
       choices(FONTS,g.font,value=>{g.font=value;persist();})),
     field("سمك الخط",key==="labels"?"labels-weight":"numbers-weight",
       choices(WEIGHTS,g.weight,value=>{g.weight=value;persist();}))
   );
   const size=document.createElement("input");size.type="range";size.min="65";size.max="170";size.step="5";size.value=g.size;
   const sizeValue=document.createElement("span");sizeValue.textContent=g.size+"٪";
   size.oninput=()=>{g.size=Number(size.value);sizeValue.textContent=size.value+"٪";demo();};
   size.onchange=persist;
   const sz=field("حجم الخط",key+"-size",size);sz.append(sizeValue);
   const color=document.createElement("input");color.type="color";color.value=g.color;
   color.oninput=()=>{g.color=color.value;demo();};color.onchange=persist;
   fields.append(sz,field("لون الخط",key+"-color",color));
   groupBox.append(name,fields);styleEditor.append(groupBox);
  }
 }
 function render(){
  chooserBtn.textContent="اختيار البطاقة (6): "+NAMES[active]+(showList?" ▲":" ▼");
  chooser.hidden=!showList;styleEditor.hidden=!showEditor;
  typographyBtn.setAttribute("aria-expanded",String(showEditor));
  Object.entries(buttons).forEach(([id,el])=>el.setAttribute("aria-pressed",String(id===active)));
  bgSelect.value=data[active].background;buildGroups();demo();
 }
 IDS.forEach(id=>{
  const b=document.createElement("button");b.type="button";b.textContent=NAMES[id];b.onclick=()=>{active=id;showList=false;status.textContent="";render();};
  chooser.append(b);buttons[id]=b;
 });
 chooserBtn.onclick=()=>{showList=!showList;render();};
 typographyBtn.onclick=()=>{showEditor=!showEditor;render();};
 bgSelect.onchange=()=>{data[active].background=bgSelect.value;persist();};
 pin.onclick=()=>{if(window.AndroidNative?.pinWidget)window.AndroidNative.pinWidget(active);
  else status.textContent="إضافة البطاقات تتم من تطبيق أندرويد؛ هذه معاينة الويب فقط.";};
 reset.onclick=()=>{data[active]=defaults(active);persist();render();};
 root.append(title,chooserBtn,chooser,preview,typographyBtn,styleEditor,bgField,actions,lockSection,note,status);
 render();return root;
}
window.AoqatWidgetAppearance={createPanel,load};
})();