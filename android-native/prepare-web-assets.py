"""Apply APK-only integration to the tested web UI; leave repository web files intact."""
# v1.54/build89: re-run APK assembly after updating workflow artifact names.
# The release workflow must consume this run, never a previously built APK.
from pathlib import Path
import sys
import hashlib
import json
import os
import shutil
import re
root=Path(__file__).resolve().parent.parent
target=Path(sys.argv[1])
transformed_names=set()
def transform(name,changes):
    staged=target/'js'/name
    text=(staged if name in transformed_names else root/'js'/name).read_text()
    for old,new in changes:
        if old not in text:
            if name == 'quran-reader.js':
                print('Quran source has changed; retain current implementation instead of applying obsolete APK patch:',old[:70])
                continue
            raise RuntimeError('APK integration target missing: '+name+' '+old[:70])
        text=text.replace(old,new)
    path=target/'js'/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text)
    transformed_names.add(name)
transform('web-menu-order.js',[
 ('const webOnly=!window.AndroidNative?.configureAdhan;', 'const webOnly=true;'),
 ('...(!window.AndroidNative?.configureAdhan ? [["prayerTimeChoice","🕰️","طريقة اختيار أوقات الصلاة"]] : [])', '...[ ["prayerTimeChoice","🕰️","طريقة اختيار أوقات الصلاة"] ]'),
 ('...(!window.AndroidNative?.configureAdhan ? [["quran","📖","القرآن الكريم"],["qibla","🧭","اتجاه القبلة"],["azkar","📿","الأذكار"]] : [])','["quran","📖","القرآن الكريم"],["qibla","🧭","اتجاه القبلة"],["azkar","📿","الأذكار"]'),
 ('["quran","qibla","azkar"].includes(id)','["quran","qibla","azkar","widget"].includes(id)')])
transform('quran-reader.js',[
 ('  if (window.AndroidNative?.configureAdhan) return;',''),
 ('loadOfficial(),loadPhone()', 'Promise.resolve(null),loadPhone()'),
 ('official=o;phone=f;', "official=o;phone=f;if(!phone)throw Error('Packaged full-page Mushaf unavailable');"),
 ('${phone?\'<label>طريقة العرض<select id="aqLayout"><option value="phone">قراءة الهاتف</option></select></label>\':\'\'}', ''),
 ("    if(phone){$('aqLayout').value=state.layout;$('aqLayout').onchange=e=>setLayout(e.target.value);}", ''),
 ("${official?'تكبير القراءة':'حجم الخط'}", "تكبير القراءة"),
 ('${official?44:22}', '44'),
 ('${official?80:46}', '80'),
 ('تعذر تحميل الصفحة؛ اتصل بالإنترنت أو اختر الصفحة المصوّرة من الإعدادات.', 'تعذر فتح الصفحة المحفوظة داخل التطبيق؛ أعد المحاولة.'),
 ("تعذر تحميل المصحف. اتصل بالإنترنت لأول تحميل.","تعذر فتح ملفات المصحف المحفوظة داخل التطبيق. أعد المحاولة؛ إذا استمرت المشكلة يلزم تحديث التطبيق."),
 ('  async function compressed(url)', '  const mushafUrl = url => url.startsWith("assets/mushaf-") ? "https://aoqat.vercel.app/"+url : url;\n  async function compressed(url)'),
 ('fetch(url)', 'fetch(mushafUrl(url))'),
 ("$('aqSharePage').onclick=async()=>{const url=new URL(location.href);", "$('aqSharePage').onclick=async()=>{const url=new URL('https://aoqat.vercel.app/');"),
 ("fetch('assets/mushaf-phone-hafs-ready.json')", "fetch(mushafUrl('assets/mushaf-phone-hafs-ready.json'))"),
 ("fetch('assets/mushaf-hafs-pocket-ready.json')", "fetch(mushafUrl('assets/mushaf-hafs-pocket-ready.json'))"),
 ("fetch(prefix+'-ready.json')", "fetch(mushafUrl(prefix+'-ready.json'))"),
 ("fetch(prefix+'.json.gz')", "fetch(mushafUrl(prefix+'.json.gz'))"),
 ("throw Error('Invalid responsive Mushaf');return data;", "throw Error('Invalid responsive Mushaf');data.directory=mushafUrl(data.directory);return data;"),
 ("throw Error('Invalid original Mushaf pages');return data;", "throw Error('Invalid original Mushaf pages');data.imageDirectory=mushafUrl(data.imageDirectory||prefix);return data;"),
 ('await caches.open(downloadingPhone?phone.cacheName:official.cacheName||\'aoqat-mushaf-hafs1441\')', '({match:async()=>null,put:async(url,response)=>{await response.arrayBuffer();}})'),
 ("fetch('assets/quran.json').then(r=>{if(!r.ok)throw Error();return r.json();})",'Promise.resolve().then(()=>JSON.parse(window.AndroidNative.readQuranAsset("quran.json")))'),
 ("fetch('assets/quran-pages.json').then(r=>{if(!r.ok)throw Error();return r.json();})",'Promise.resolve().then(()=>JSON.parse(window.AndroidNative.readQuranAsset("quran-pages.json")))')])
transform('adhan-settings.js',[
 ('if(!native&&window.aoqatRenderAzkar)', 'if(window.aoqatRenderAzkar)'),
 ('panel.querySelectorAll("[data-setting]")', 'document.querySelectorAll("#adhanPanel [data-setting], #prayerServicePanel [data-setting]")'),
 ('if (!native) { $("adServiceMenu").hidden=true;', 'if (servicePanel) { $("adServiceMenu").hidden=true;'),
 ('...(native ? [["services", "✨", "الخدمات"]] : [])','...[]'),
 ('...(native ? ["friday"] : [])', '...[]'),
 ('if (!native && servicePanel)', 'if (servicePanel)'),
 ('if (native || !["quran","qibla","azkar"].includes(kind)) return;', 'if (!["quran","qibla","azkar","widget"].includes(kind)) return;'),
 ('if (kind === "quran" && !native)', 'if (kind === "quran")'),
 ('    if (!native) {\n      servicePanel = document.createElement("section");','    {\n      servicePanel = document.createElement("section");'),
 ('على الويب نعاين فترة الصامت ونكتم صوت الأذان داخل الصفحة أثناءها. تحويل الهاتف نفسه إلى الصامت واستعادة وضعه يحتاج تطبيق Android بعد تحديثه.', 'يبدأ وضع الصامت عند الإقامة ويُستعاد وضع الهاتف السابق عند انتهاء المدة. يحتاج إذن التحكم بوضع الصامت في Android.')])

# Android-only: a clear permission action if the user's iqama quiet switch
# is enabled but Android has not granted notification-policy access.
transform('adhan-settings.js', [
 ("يحتاج إذن التحكم بوضع الصامت في Android.</p></div>`;", "يحتاج إذن التحكم بوضع الصامت في Android.</p>${native&&s.enabled&&!window.AndroidNative?.hasQuietPolicyAccess?.()?'<button type=\"button\" id=\"adQuietPermission\">منح صلاحية تشغيل الصامت للهاتف</button>':''}</div>`;"),
 ("    $(\"adSilentAfterEnabled\").onchange=(e)=>{state.afterIqamaSilent.enabled=e.target.checked;persist();render();};", "    $(\"adSilentAfterEnabled\").onchange=(e)=>{state.afterIqamaSilent.enabled=e.target.checked;persist();render();};\n    $(\"adQuietPermission\")?.addEventListener(\"click\",()=>window.AndroidNative?.requestQuietPolicyAccess?.());"),
])

# APK-only: keep the hosted web's adhan settings unchanged and add a
# standalone phone quiet page for quiet-at-adhan and quiet-after-iqama.
transform('adhan-core.js', [
 ('      afterIqamaSilent: {\n        enabled: false,\n        minutes: Object.fromEntries(ids.map((id) => [id, 0])),\n      },',
  '      afterIqamaSilent: {\n        enabled: false,\n        minutes: Object.fromEntries(ids.map((id) => [id, 0])),\n      },\n      atAdhanSilent: {enabled:false,minutes:Object.fromEntries(ids.map(id=>[id,10]))},'),
 ('    d.friday = normalizeFriday(s.friday);',
  '    d.atAdhanSilent.enabled=s.atAdhanSilent?.enabled===true;\n    for(const id of ids){const n=Number(s.atAdhanSilent?.minutes?.[id]);if(Number.isFinite(n))d.atAdhanSilent.minutes[id]=Math.max(0,Math.min(120,Math.floor(n)));}\n    d.friday = normalizeFriday(s.friday);')
])
transform('web-menu-order.js', [
 ('[["🔊","الأذان والتنبيه","adhanPanel"],["⏳","أوقات الإقامة","iqamaPanel"],["⏱️","اوقات بعد الاقامة","afterIqamaPanel"]]',
  '[["🔊","الأذان والتنبيه","adhanPanel"],["⏳","أوقات الإقامة","iqamaPanel"],["⏱️","اوقات بعد الاقامة","afterIqamaPanel"],["🔕","تفعيل وضع الصامت","quietPanel"]]'),
 ('b.onclick=()=>openPanel(title,id,"adhanIqama");wrap.appendChild(b);',
  'b.onclick=()=>{if(id==="quietPanel")window.AoqatApkQuietSettings?.render?.();openPanel(title,id,"adhanIqama");};wrap.appendChild(b);')
])

# Replace the browser alarm entirely: Android owns audio, stopping, snooze and lock-screen UI.
(target/'js/tomorrow-alarm.js').write_text((root/'android-native/apk-overrides/native-publish-alarm.js').read_text())
# No browser push subscription or service-worker alarm can compete with the native alarm.
(target/'js/push-notifications.js').write_text('/* APK uses native publish notifications. */')

# Native compass and screen illumination settings live only in the APK drawer.
# The hosted web keeps its original menus and does not control physical alarms.
transform('web-menu-order.js', [
 ('MENU_ROWS.push(["helpSupport","📖","المساعدة والتواصل"]);',
  'MENU_ROWS.push(["helpSupport","📖","المساعدة والتواصل"]);MENU_ROWS.push(["screenAlerts","💡","إضاءة شاشة الهاتف"]);'),
 ('const id=b.dataset.drawer;',
  'const id=b.dataset.drawer;if(id==="qibla"){window.AndroidNative.openQibla();return;}if(id==="screenAlerts"){window.AoqatScreenAlerts?.open();return;}')
])
# The legacy adhan-only screen switch is obsolete: one native setting controls
# adhan, selected prayer notices, alarm and publishing alike. Remove duplicate UI.
transform('adhan-settings.js', [
 ('${check("screen", "إضاءة شاشة القفل للأذان والتذكير")}',
  '<p class="ad-note">💡 إضاءة الشاشة لجميع التنبيهات تُضبط من «إضاءة شاشة الهاتف» في القائمة الرئيسية.</p>')
])
# The native scheduler owns background reminders; the web module supplies its reviewed controls only.
transform('azkar-reminders.js', [
 ('  if(window.AndroidNative?.configureAdhan)return;', ''),
 ('function tick(now=new Date()){', 'function tick(now=new Date()){if(window.AndroidNative?.configureAdhan)return;'),
 ('function permissionNote(){', "function permissionNote(){if(window.AndroidNative?.configureAdhan)return 'تنبيهات الهاتف تعمل دون إنترنت وبالخلفية بعد منح الأذونات.';"),
 ('async function permission(){', 'async function permission(){if(window.AndroidNative?.configureAdhan){window.AndroidNative.communityReminderPermissions();draw();return;}'),
 ("await permission();notify([{kind:'preview'", "await permission();if(window.AndroidNative?.previewAzkarReminder){window.AndroidNative.previewAzkarReminder(kind);return;}notify([{kind:'preview'"),
 ("host.querySelector('[data-azkar-permission]').hidden=", "host.querySelector('[data-azkar-permission]').hidden=!window.AndroidNative?.configureAdhan&&"),
 ('السماح بإشعارات المتصفح', 'أذونات الإشعارات والعمل بالخلفية'),
 ('المواعيد بتوقيت العراق. تعمل التنبيهات أثناء فتح الموقع، وصوت إشعار الهاتف حسب إعدادات الجهاز والمتصفح.', 'المواعيد بتوقيت العراق. التنبيهات تعمل دون إنترنت وبالخلفية، بصوت إشعار قصير حسب إعدادات الهاتف.')])
transform('adhan-settings.js', [
 ('native ? "أذان مكة — محمد خليل رمل" : "أذان مسجد قباء — عبدالمجيد السريحي"', '"أذان مسجد قباء — عبدالمجيد السريحي"')])

# Bring the reviewed web-only menus, Azkar reader and saved font overrides into this APK.
transform('azkar-web.js', [(' if(window.AndroidNative?.configureAdhan)return;', '')])
transform('web-menu-button-theme.js', [(' if(window.AndroidNative?.configureAdhan)return;', '')])
transform('web-theme-settings.js', [
 ('if(!window.AndroidNative?.configureAdhan)document.addEventListener', 'document.addEventListener'),
 ("(!window.AndroidNative?.configureAdhan?controls():'')", 'controls()')])
transform('font-controls-core.js', [
 ('!window.AndroidNative?.configureAdhan&&list.some', 'list.some'),
 ('if(window.AndroidNative?.configureAdhan||!root)return;', 'if(!root)return;')])
transform('prayer-countdown.js', [("${nativeIqama?'.iqama-status{background:rgba(126,84,14,.9)}':''}", '')])
transform('exact-export.js', [
 ('phoneMode&&!window.AndroidNative?.configureAdhan&&window.aoqatOpenPrayerShare', 'phoneMode&&window.aoqatOpenPrayerShare'),
 ('const supported=!!navigator.share', 'const supported=!!window.AndroidNative?.sharePrayerImage||!!navigator.share'),
 ("await navigator.share({files:[file],title:'مواقيت الصلاة'});", "if(window.AndroidNative?.sharePrayerImage)await nativeImageAction('sharePrayerImage',file);else await navigator.share({files:[file],title:'مواقيت الصلاة'});"),
 ("save.onclick=()=>{if(file){downloadBlob(file,'jpg');status.textContent='تم طلب حفظ الصورة على الجهاز. يمكنك مشاركتها أيضاً.';}};", "save.onclick=async()=>{if(!file)return;save.disabled=true;try{if(window.AndroidNative?.savePrayerImage)await nativeImageAction('savePrayerImage',file);else downloadBlob(file,'jpg');if(!disposed)status.textContent='تم حفظ الصورة على الجهاز. يمكنك مشاركتها أيضاً.';}catch(e){if(!disposed)status.textContent='تعذر الحفظ. امنح إذن الحفظ إذا طُلب، ثم أعد المحاولة.';}finally{if(!disposed)save.disabled=false;}};"),
 ('  window.aoqatCreatePrayerShareView=function(){', '''  let imageActionSequence=0;const imageActions=new Map();
  window.aoqatImageActionResult=(id,ok)=>{const pending=imageActions.get(id);if(!pending)return;imageActions.delete(id);ok?pending.resolve():pending.reject(Error('Native image action failed'));};
  async function nativeImageAction(method,file){const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});return new Promise((resolve,reject)=>{const id='image-'+(++imageActionSequence);imageActions.set(id,{resolve,reject});try{window.AndroidNative[method](dataUrl,file.name,id);}catch(e){imageActions.delete(id);reject(e);}});}
  window.aoqatNativeImageAction=nativeImageAction;
  window.aoqatCreatePrayerShareView=function(){''')])

# Enable the newly reviewed local Muslim bag modules only in the packaged APK.
for module in ['reminder-inbox.js','friday-reminders.js','fasting-reminders.js','community-posts-renderer.js','community-posts.js']:
    transform(module,[('if(window.AndroidNative?.configureAdhan)return;','')])
transform('community-posts-renderer.js', [('url("/assets/fonts/amiri-quran.ttf")','url("assets/fonts/amiri-quran.ttf")')])
transform('community-posts.js',[
 ('async function permission(){', 'async function permission(){if(window.AndroidNative?.communityReminderPermissions){window.AndroidNative.communityReminderPermissions();return;}'),
 ('function tick(now=new Date()){', 'function tick(now=new Date()){if(window.AndroidNative?.configureAdhan)return;'),
 ('const supported=!!navigator.share', 'const supported=!!window.AndroidNative?.sharePrayerImage||!!navigator.share'),
 ("await navigator.share({files:[file],title:kind==='friday'?'سنن يوم الجمعة وآدابها':'صيام التطوع'});", "if(window.AndroidNative?.sharePrayerImage)await window.aoqatNativeImageAction('sharePrayerImage',file);else await navigator.share({files:[file],title:kind==='friday'?'سنن يوم الجمعة وآدابها':'صيام التطوع'});"),
 ("download.onclick=()=>{if(!file||!url)return;", "download.onclick=async()=>{if(!file||!url)return;if(window.AndroidNative?.savePrayerImage){download.disabled=true;try{await window.aoqatNativeImageAction('savePrayerImage',file);if(!disposed)status.textContent='تم حفظ البوست على الجهاز.';}catch(_){if(!disposed)status.textContent='تعذر الحفظ. أعد المحاولة.';}finally{if(!disposed)download.disabled=false;}return;}"),
 ('تنبيه النشر منفصل عن تذكيرات العبادة، ويعمل أثناء فتح الموقع؛ إغلاقه يوقف التنبيه المحلي.', 'تنبيه النشر منفصل عن تذكيرات العبادة، ويعمل دون إنترنت وبالخلفية بعد منح أذونات الهاتف.')])
transform('friday-reminders.js',[
 ('async function requestPermission(){', 'async function requestPermission(){if(window.AndroidNative?.communityReminderPermissions){window.AndroidNative.communityReminderPermissions();return;}'),
 ('function tick(now=new Date()){', 'function tick(now=new Date()){if(window.AndroidNative?.configureAdhan)return;'),
 ('التنبيهات المحلية تعمل أثناء فتح الموقع؛ إغلاق الصفحة يوقفها. يمكن عرض إشعار الهاتف إذا سمحت للمتصفح.', 'التنبيهات تعمل دون إنترنت وبالخلفية بعد منح أذونات الإشعارات والمنبّه.')])
transform('fasting-reminders.js',[
 ('async function permission(){', 'async function permission(){if(window.AndroidNative?.communityReminderPermissions){window.AndroidNative.communityReminderPermissions();return;}'),
 ('function tick(now=new Date()){', 'function tick(now=new Date()){if(window.AndroidNative?.configureAdhan)return;'),
 ('يعمل أثناء فتح الموقع؛ إشعار الهاتف يحتاج السماح للمتصفح.', 'يعمل دون إنترنت وبالخلفية بعد منح أذونات الهاتف.')])

# Use the current web menu with durable Android notification delivery.
transform('prayer-alert-methods.js',[('  if(window.AndroidNative?.configureAdhan)return;', '  const N=window.AndroidNative,native=!!N?.configurePrayerNotifications;'), ("JSON.parse(localStorage.getItem(KEY)||'{}')", "JSON.parse(native?N.readPrayerNotificationSettings():localStorage.getItem(KEY)||'{}')"), ('function save(){localStorage.setItem(KEY,JSON.stringify(settings));}', 'function save(){localStorage.setItem(KEY,JSON.stringify(settings));if(native)N.configurePrayerNotifications(JSON.stringify(settings));}'), ('function unlock(){try{', 'function unlock(){if(native)return;try{'), ('function chime(){if(!audio', 'function chime(){if(native){N.previewPrayerNotification();return;}if(!audio'), ('تنبيه الويب يعمل أثناء فتح الصفحة؛ اسمح بالإشعارات حتى تظهر في قائمة إشعارات الهاتف.', 'الإشعارات تعمل من المواقيت المحفوظة، دون إنترنت وبالخلفية بعد منح الأذونات.'), ('<p id="pnStatus" role="status"></p>', '${native?\'<button type="button" id="pnPermissions">أذونات الإشعارات والعمل بالخلفية</button><p class="ad-note">\'+N.prayerNotificationReadiness()+\'</p>\':\'\'}<p id="pnStatus" role="status"></p>'), ("if(settings.enabled&&'Notification' in window", "if(!native&&settings.enabled&&'Notification' in window"), ("if(settings.enabled&&(!('Notification'", "if(!native&&settings.enabled&&(!('Notification'"), ("$('pnPreview').onclick=()=>{unlock();chime();};", "$('pnPreview').onclick=()=>{unlock();chime();};if(native)$('pnPermissions').onclick=()=>N.prayerNotificationPermissions();"), ('  function tick(){const now=', '  function tick(){if(native)return;const now='), ("  document.addEventListener('pointerdown'", "  window.aoqatPrayerNotificationNativeSettings=value=>{if(!native)return;settings={...settings,...value};drawNotice();};\n  document.addEventListener('pointerdown'")])

# Native settings also feed browser previews; raw database cache is never adjusted.
transform('supabase-db.js',[("    if(window.AndroidNative?.configureAdhan){\n        document.getElementById(\"gregorianDay\")?.addEventListener(\"change\",()=>loadPrayerFromDatabase(true));\n        document.getElementById(\"gregorianMonth\")?.addEventListener(\"change\",()=>loadPrayerFromDatabase(true));return;\n    }", "")])
# Lazy time pickers must accept every day's value before painting a new date.
transform('modal-panels.js', [
 ('const row=await fetchAnnualPrayer(dateParts.month,dateParts.day);', 'const raw=cachedAnnualPrayer(dateParts.month,dateParts.day)||await fetchAnnualPrayer(dateParts.month,dateParts.day);const row=window.AoqatPrayerTimeChoice?.applyRow(raw)||raw;'),
 ('if(el&&row[id]!=null) el.value=String(row[id]);', 'if(el&&row[id]!=null){const value=String(row[id]);if(!Array.from(el.options).some(o=>o.value===value))el.add(new Option(value,value));el.value=value;}'),
 ('if(autoEnabled()) setTimeout(()=>evaluateAutoSwitch(true),1400);', 'if(autoEnabled()) evaluateAutoSwitch(true);')])
# Complete local rows are applied synchronously, before the startup preview is shown.
p=target/'js/supabase-db.js';text=p.read_text();text=text.replace('const row=await readAnnualPrayer(month,day,!silent);','const row=(silent&&cachedAnnualPrayer(month,day))||await readAnnualPrayer(month,day,!silent);');p.write_text(text)
transform('prayer-time-choice.js',[
 ("s.mode!=='custom'||window.AndroidNative?.configureAdhan", "s.mode!=='custom'"),
 ("function read(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}", "let nativeChoice;function read(){try{if(window.AndroidNative?.readPrayerTimeChoice){if(!nativeChoice)nativeChoice=normalize(JSON.parse(window.AndroidNative.readPrayerTimeChoice()));return nativeChoice;}return normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}"),
 ("localStorage.setItem(KEY,JSON.stringify(s));window.dispatchEvent", "localStorage.setItem(KEY,JSON.stringify(s));window.AndroidNative?.configurePrayerTimeChoice?.(JSON.stringify(s));nativeChoice=s;window.dispatchEvent")])

# Build full minute pickers when opened, rather than 8640 option nodes on startup.
script=(root/'js/script.js').read_text()
start=script.index('function initPrayerTimes()')
end=script.index('function updateDatePreview()',start)
script=script[:start]+'''
function initPrayerTimes(){
  const ids=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
  for(const id of ids){const el=document.getElementById(id);el.replaceChildren(new Option('--:--',''));}
  function populate(el){if(el.dataset.apkTimesReady)return;const selected=el.value,fragment=document.createDocumentFragment();
    for(let hour=1;hour<=12;hour++)for(let minute=0;minute<60;minute++){const value=hour+':'+String(minute).padStart(2,'0');fragment.appendChild(new Option(value,value));}
    el.appendChild(fragment);el.value=selected;el.dataset.apkTimesReady='1';
  }
  document.addEventListener('focusin',e=>{if(ids.includes(e.target.id))populate(e.target);});
  document.addEventListener('pointerdown',e=>{if(ids.includes(e.target.id))populate(e.target);},{capture:true,passive:true});
}
'''+script[end:]
(target/'js/script.js').write_text(script)

# Pack local UI modules in dependency order. No window.load or serial file request chain.
# The original web carousel initializes after fixed timers. Packaged dependencies
# are already ordered, so build the four templates and navigation synchronously.
transform('second-design.js', [('setTimeout(initSecondDesign,900)', 'initSecondDesign()')])
transform('additional-designs.js', [('function init(){injectStyles();let tries=0;', 'function init(){injectStyles();if(rebuild()){setupSync();setupExport();sync();resize();window.addEventListener("resize",resize,{passive:true});window.addEventListener("orientationchange",()=>setTimeout(resize,150),{passive:true});return;}let tries=0;')])
transform('design-order.js', [('  let tries=0;', '  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",applyPreferredDesignOrder,{once:true});else applyPreferredDesignOrder();\n  let tries=0;')])
transform('carousel-unified-fix.js', [('function init(){let tries=0;', 'function init(){install();let tries=0;')])

# Clock and menu text mutations do not change the editable element tree.
# Avoid walking every design on every unrelated DOM mutation.
transform('universal-preview-editor.js', [('const obs=new MutationObserver(()=>{markMovables();bindSave();});obs.observe(document.body,{childList:true,subtree:true});', 'let queued=false;const obs=new MutationObserver(records=>{if(queued||!records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)))return;queued=true;requestAnimationFrame(()=>{queued=false;markMovables();bindSave();});});const preview=document.querySelector(".previewBox");if(preview)obs.observe(preview,{childList:true,subtree:true});')])
transform('adaptive-design-boxes.js', [('  function schedule(root){requestAnimationFrame(()=>requestAnimationFrame(()=>fitRoot(root||document)));}', '  let fitQueued=false;const fitRoots=new Set();function schedule(root){fitRoots.add(root||document);if(fitQueued)return;fitQueued=true;requestAnimationFrame(()=>{fitQueued=false;for(const node of fitRoots)fitRoot(node);fitRoots.clear();});}'), ('if(m.some(x=>x.type===\'childList\'))schedule(document);', 'if(m.some(x=>x.target.closest?.(CARD_SELECTORS)||[...x.addedNodes,...x.removedNodes].some(n=>n.nodeType===1)))schedule(document.querySelector(".previewBox"));'), ('}).observe(document.body,{subtree:true,childList:true});', '}).observe(document.querySelector(".previewBox")||document.body,{subtree:true,childList:true});')])
# APK reveal follows complete local initialization and two layout frames.
# Keep this separate from hosted startup behavior and never wait for online sync.
transform('startup-stabilizer.js', [
 ('  function finish(){', '  let finishing=false;\n  function finish(){\n    if(finishing)return;finishing=true;'),
 ("    document.body.classList.remove('aoqat-booting');\n    document.body.classList.add('aoqat-ready');\n    window.aoqatUIReady=true;", """    document.body.classList.remove('design-menu-open');
    const menu=document.getElementById('designSideMenuBtn');
    if(menu)menu.setAttribute('aria-expanded','false');
    window.AoqatAndroidUniversal?.syncAllData?.();
    // Trigger local font layout now; the cap only protects against broken fonts.
    document.querySelector('.previewBox')?.getBoundingClientRect();
    const fonts=document.fonts?.ready||Promise.resolve();
    let cap;Promise.race([fonts,new Promise(resolve=>{cap=setTimeout(resolve,800);})]).then(()=>{
      clearTimeout(cap);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        document.body.classList.remove('aoqat-booting');
        document.body.classList.add('aoqat-ready');
        window.aoqatUIReady=true;
        window.AndroidNative?.startupReady?.();
      }));
    });"""),
 ('modulesReady=true;if(prayerDataReady())finish();', 'modulesReady=true;'),
 ('tries>=40', 'tries>=125'),
 ('},100);', '},32);')])
# Menu post-module adjustments run in the initialization turn, before reveal.
transform('compact-design-menu.js', [("()=>setTimeout(()=>{arrange();installExclusivePopupBehavior();},50)", "()=>{arrange();installExclusivePopupBehavior();}")])
transform('web-menu-order.js', [("()=>setTimeout(install,100)", "install")])
transform('design-side-menu.js', [("()=>setTimeout(()=>{syncActionWidth();hideEmptyStrips();},80)", "()=>{syncActionWidth();hideEmptyStrips();}")])

# APK defaults remain separate from the hosted web interface and saved user choices.
transform('compact-design-menu.js', [("let state={};try{state=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){}\n    const items=", "let state={};try{state={clock:true,date:true,adhan:true,iqama:true,...(JSON.parse(localStorage.getItem(KEY)||'{}')||{})};}catch(_){state={clock:true,date:true,adhan:true,iqama:true};}if(localStorage.getItem(KEY)===null)localStorage.setItem(KEY,JSON.stringify(state));\n    const items=")])
transform('interface-clock.js', [('#liveClockTime{font-size:12.5px}#liveClockDate{font-size:11px}', '#liveClockTime{font-size:16px}#liveClockDate{font-size:14px}')])
transform('prayer-countdown.js', [
 ('.next-prayer span,.iqama-status span{font-size:9px}', '#nextPrayerLabel,#iqamaLabel{font-size:12px}.next-prayer span,.iqama-status span{font-size:12px}'),
 ('.next-prayer b,.iqama-status b{font-size:12px}', '.next-prayer b,.iqama-status b{font-size:15px}'),
 ('.live-prayer-status{width:max-content!important;max-width:calc(100vw - 12px)!important;gap:3px!important;flex-wrap:nowrap!important}', '.live-prayer-status{width:max-content!important;max-width:calc(100vw - 12px)!important;gap:3px!important;flex-wrap:wrap!important}')])

# Include current calendar/search services in Android and use its image sharing bridge.
transform('web-menu-order.js', [('if(!window.AndroidNative?.configureAdhan)window.AoqatWebSettingsNavigation={', 'window.AoqatWebSettingsNavigation={')])
transform('web-settings-search-calendar.js', [('if(window.AndroidNative?.configureAdhan)return;', '')])
transform('monthly-calendars-renderer.js', [('if(window.AndroidNative?.configureAdhan)return;', ''), ('url("/assets/fonts/amiri-quran.ttf")','url("assets/fonts/amiri-quran.ttf")')])
# Do not block calendar rendering on unrelated Quran/WebView font loading.
transform('monthly-calendars-renderer.js', [('await document.fonts.ready;', '/* Both calendar fonts were loaded explicitly. */')])
transform('monthly-calendars.js', [
 ('if(window.AndroidNative?.configureAdhan)return;', ''),
 # APK: blank <img> elements otherwise show a broken-image icon/alt text before
 # canvas rendering is complete. Keep it invisible until the PNG decodes.
 ("img.className='mc-preview';img.alt=", "img.className='mc-preview';img.style.display='none';img.alt="),
 ("img.src=url;download.disabled=false;", "img.src=url;await img.decode();if(token!==sequence||!p.isConnected)return;img.style.display='';download.disabled=false;"),
 # In the font-format editor, retain the old image until the new drawing is ready.
 ("img.src=canvas.toDataURL('image/png');const applied=", "img.src=canvas.toDataURL('image/png');await img.decode();if(id!==drawId||!p.isConnected)return;img.style.display='';const applied="),
 ("function rawRows(){return typeof availablePrayerRows==='function'?availablePrayerRows(false):window.AoqatPrayerBackupRows||[];}", "function rawRows(){let rows=typeof availablePrayerRows==='function'?availablePrayerRows(false):[];if(Array.isArray(rows)&&rows.length>=365)return rows;try{const nativeRows=JSON.parse(window.AndroidNative?.readPrayerRows?.()||'[]');if(Array.isArray(nativeRows)&&nativeRows.length>=365)return nativeRows;}catch(_){}return Array.isArray(window.AoqatPrayerBackupRows)?window.AoqatPrayerBackupRows:rows||[];}"),
 ('await navigator.share({files:[file],title:img.alt});', "if(window.AndroidNative?.sharePrayerImage)await window.aoqatNativeImageAction('sharePrayerImage',file);else await navigator.share({files:[file],title:img.alt});"),
 ('const can=!!navigator.share', 'const can=!!window.AndroidNative?.sharePrayerImage||!!navigator.share'),
 ("download=button('حفظ الصورة على الهاتف',()=>{if(!file||!url)return;", "download=button('حفظ الصورة على الهاتف',async()=>{if(!file||!url)return;if(window.AndroidNative?.savePrayerImage){download.disabled=true;try{await window.aoqatNativeImageAction('savePrayerImage',file);status.textContent='تم حفظ صورة التقويم على الجهاز.';}catch(_){status.textContent='تعذر حفظ الصورة. أعد المحاولة.';}finally{download.disabled=false;}return;}")])

# APK calendar: a complete rendered PNG can be shown immediately.
# Waiting for WebView's image.decode() can hang on some Android OEM devices,
# leaving the share and save buttons grey even after the image blob is ready.
transform('monthly-calendars.js', [
 ("img.src=url;await img.decode();if(token!==sequence||!p.isConnected)return;img.style.display='';download.disabled=false;", "img.src=url;img.style.display='';download.disabled=false;"),
 ("img.src=canvas.toDataURL('image/png');await img.decode();if(id!==drawId||!p.isConnected)return;img.style.display='';const applied=", "img.src=canvas.toDataURL('image/png');img.style.display='';const applied=")
])

# APK-only: make the approved QCF V2 reader the sole Quran engine.
# Preserve the user's chosen page, appearance and bookmarks without an SVG fallback.
qcf=target/'js/quran-reader.js'
source=qcf.read_text()
source=source.replace('const webQcfTrial=!window.AndroidNative?.configureAdhan;', 'const webQcfTrial=true;')
source=source.replace("state.renderEngine=webQcfTrial&&state.renderEngine!=='svg'?'qcf':'svg';", "state.renderEngine='qcf';")
source=source.replace("""'url("https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p'+page+'.woff2")'""", """'url("assets/qcf-v2-page-fonts/p'+page+'.woff2")'""")
# Remove the redundant edition dropdown, keep paper/theme and every other reading tool.
source=source.replace("""${webQcfTrial?'<label>طريقة عرض المصحف<select id="aqRenderingMode"><option value="qcf">خط QCF V2 — تجربة السلاسة</option><option value="svg">عرض SVG الأصلي</option></select></label>':''}""", "")
source=source.replace("""if(webQcfTrial){$('aqRenderingMode').value=state.renderEngine;""", """if(webQcfTrial&&$('aqRenderingMode')){$('aqRenderingMode').value=state.renderEngine;""")
source=source.replace("state.renderEngine='svg';save();galleryClearReady();preparedPages.clear();", "galleryClearReady();preparedPages.clear();")
# The APK keeps its lightweight index, while full page glyphs/fonts are already local.
start=source.find("if(phone){const button=document.createElement('button');button.type='button';button.textContent='تنزيل صفحات المصحف للقراءة بدون إنترنت';")
if start>=0:
    end=source.find('if(webQcfTrial&&',start)
    if end<0: raise RuntimeError('Could not locate SVG offline download control')
    source=source[:start]+source[end:]
if "state.renderEngine='qcf';" not in source: raise RuntimeError('QCF default not applied')
if 'https://verses.quran.foundation/fonts' in source: raise RuntimeError('External Quran fonts remain')
qcf.write_text(source)

# Never reach out to the web for Quran page indexes in the installed APK.
source=source.replace('const mushafUrl = url => url.startsWith("assets/mushaf-") ? "https://aoqat.vercel.app/"+url : url;', "const mushafUrl = url => url.endsWith('.gz') ? url+'.bin' : url;")
source=source.replace("renderPage(false);notice('تعذّر تحميل خط QCF V2؛ تم الرجوع إلى عرض المصحف الأصلي.');", "root.dataset.ready='error';$('adVerses').innerHTML='<p class=\"aq-loading\">تعذّر تحميل صفحة المصحف المحفوظة؛ أعد فتح المصحف.</p>';notice('تعذّر تحميل خط المصحف المحلي.');")
# For APK, read both compressed Quran indexes with the native AssetManager.
# Android WebView versions differ in whether fetch(file://...) and
# DecompressionStream('gzip') are supported for file-backed resources.
source=source.replace(
    "async function compressed(url){const r=await fetch(mushafUrl(url));",
    "async function compressed(url){if(url==='assets/mushaf-phone-hafs.json.gz')return JSON.parse(window.AndroidNative.readQuranAsset('mushaf-phone-hafs.json.gz'));if(url==='experiments/qcf604-web-verse-layouts.json.gz')return JSON.parse(window.AndroidNative.readQuranAsset('qcf604-web-verse-layouts.json.gz'));const r=await fetch(mushafUrl(url));")
source=source.replace(
    "const ready=await fetch(mushafUrl('assets/mushaf-phone-hafs-ready.json'));if(!ready.ok)throw Error('Phone Mushaf unavailable');",
    "")
if "async function compressed(url){if(url==='assets/mushaf-phone-hafs.json.gz')" not in source:
    raise RuntimeError('Native Quran JSON decoder was not installed at exact call site')
if "const ready=await fetch(mushafUrl('assets/mushaf-phone-hafs-ready.json'))" in source:
    raise RuntimeError('Unnecessary WebView Quran ready file fetch remains')
# Confirm the one installed edition cannot silently switch to legacy SVG mode.
if "state.renderEngine='svg'" in source: raise RuntimeError('Legacy Quran engine fallback still present')
if 'aqRenderingMode"><option' in source: raise RuntimeError('Old Quran edition switch is still visible')
if 'https://verses.quran.foundation/fonts' in source: raise RuntimeError('QCF font URLs not local')
qcf.write_text(source)

# Include the QCF verse/page manifest explicitly; Gradle copy filters may omit
# the experiments directory in its base web-asset snapshot.
qcf_layout=root/'experiments/qcf604-web-verse-layouts.json.gz'
if not qcf_layout.is_file(): raise RuntimeError('Missing reviewed QCF layout manifest')
qcf_layout_dest=target/'experiments/qcf604-web-verse-layouts.json.gz.bin'
qcf_layout_dest.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(qcf_layout,qcf_layout_dest)

html=(target/'index.html').read_text()
static=re.findall(r'<script\b[^>]*src="([^"]+)"[^>]*></script>',html)
dynamic=re.findall(r'await loadScript\("([^"]+)"', (root/'data/prayer-times.js').read_text())
paths=['js/startup-stabilizer.js','js/design-side-menu.js']+[src.split('?')[0] for src in static if not src.startswith('data/prayer-times.js')]+[src.split('?')[0] for src in dynamic]
(target/'js/native-reminders.js').write_text((root/'android-native/apk-overrides/native-reminders.js').read_text())
(target/'js/native-quiet-menu.js').write_text((root/'android-native/apk-overrides/native-quiet-menu.js').read_text())
(target/'js/native-screen-alerts.js').write_text((root/'android-native/apk-overrides/native-screen-alerts.js').read_text())
paths.append('js/native-reminders.js')
paths.append('js/native-quiet-menu.js')
paths.append('js/native-screen-alerts.js')
seen=set();chunks=['const prayerTimes=[];']
for relative in paths:
    # This old compatibility module repeatedly unhides all slides, conflicting
    # with the unified carousel. Visibility is now owned by its saved settings.
    if relative=='js/five-new-designs.js':continue
    if relative in seen:continue
    seen.add(relative)
    path=target/relative
    if not path.exists():path=root/relative
    if relative=='js/native-reminders.js':path=root/'android-native/apk-overrides/native-reminders.js'
    chunks.append('\n/* '+relative+' */\n'+path.read_text()+'\n;')
chunks.append("document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('aoqatModulesReady'))),{once:true});")
(target/'js/apk-startup-bundle.js').write_text('\n'.join(chunks))
html=re.sub(r'<script\b[^>]*src="[^"]+"[^>]*></script>','',html)
html=html.replace('</body>','<script src="js/apk-startup-bundle.js"></script>\n</body>')
(target/'index.html').write_text(html)

# Pin every downloadable page to this release; cached bytes must match the original assets.
# The reader is complete at first install, including metadata and every page.
# Test fixtures omit large source assets; materialize the same package with hard links.
manifest={}
# Keep only the full-page phone edition. Hosted web editions remain untouched.
# Remove an earlier package's photo edition when reusing the staging directory.
for obsolete in (target/'assets').glob('mushaf-hafs-*'):
    if obsolete.is_dir(): shutil.rmtree(obsolete)
    else: obsolete.unlink()
for source in [root/'assets/mushaf-phone-hafs-ready.json',root/'assets/mushaf-phone-hafs.json.gz']:
    relative=source.relative_to(root);destination=target/(str(relative)+".bin" if source.name.endswith(".gz") else str(relative))
    # AAPT treats .gz names specially; retain compressed bytes under a neutral suffix.
    if source.name.endswith(".gz") and (target/relative).exists(): (target/relative).unlink()
    destination.parent.mkdir(parents=True,exist_ok=True)
    if not destination.exists():
        try: os.link(source,destination)
        except OSError: shutil.copyfile(source,destination)
    manifest[str(relative)]=hashlib.sha256(source.read_bytes()).hexdigest()
(target/'assets').mkdir(parents=True,exist_ok=True)
(target/'assets/mushaf-apk-sha256.json').write_text(json.dumps(manifest,separators=(',',':')))





