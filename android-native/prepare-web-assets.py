"""Apply APK-only integration to the tested web UI; leave repository web files intact."""
from pathlib import Path
import sys
import hashlib
import json
import os
import shutil
import re
root=Path(__file__).resolve().parent.parent
target=Path(sys.argv[1])
def transform(name,changes):
    text=(root/'js'/name).read_text()
    for old,new in changes:
        if old not in text: raise RuntimeError('APK integration target missing: '+name+' '+old[:70])
        text=text.replace(old,new)
    path=target/'js'/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text)
transform('web-menu-order.js',[
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
 ('panel.querySelectorAll("[data-setting]")', 'document.querySelectorAll("#adhanPanel [data-setting], #prayerServicePanel [data-setting]")'),
 ('if (!native) { $("adServiceMenu").hidden=true;', 'if (servicePanel) { $("adServiceMenu").hidden=true;'),
 ('...(native ? [["services", "✨", "الخدمات"]] : [])','...[]'),
 ('...(native ? ["friday"] : [])', '...[]'),
 ('if (!native && servicePanel)', 'if (servicePanel)'),
 ('if (native || !["quran","qibla","azkar"].includes(kind)) return;', 'if (!["quran","qibla","azkar","widget"].includes(kind)) return;'),
 ('if (kind === "quran" && !native)', 'if (kind === "quran")'),
 ('    if (!native) {\n      servicePanel = document.createElement("section");','    {\n      servicePanel = document.createElement("section");'),
 ('على الويب نعاين فترة الصامت ونكتم صوت الأذان داخل الصفحة أثناءها. تحويل الهاتف نفسه إلى الصامت واستعادة وضعه يحتاج تطبيق Android بعد تحديثه.', 'يبدأ وضع الصامت عند الإقامة ويُستعاد وضع الهاتف السابق عند انتهاء المدة. يحتاج إذن التحكم بوضع الصامت في Android.')])

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
html=(target/'index.html').read_text()
static=re.findall(r'<script\b[^>]*src="([^"]+)"[^>]*></script>',html)
dynamic=re.findall(r'await loadScript\("([^"]+)"', (root/'data/prayer-times.js').read_text())
paths=['js/startup-stabilizer.js','js/design-side-menu.js']+[src.split('?')[0] for src in static if not src.startswith('data/prayer-times.js')]+[src.split('?')[0] for src in dynamic]
seen=set();chunks=['const prayerTimes=[];']
for relative in paths:
    # This old compatibility module repeatedly unhides all slides, conflicting
    # with the unified carousel. Visibility is now owned by its saved settings.
    if relative=='js/five-new-designs.js':continue
    if relative in seen:continue
    seen.add(relative)
    path=target/relative
    if not path.exists():path=root/relative
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
for source in [root/'assets/mushaf-phone-hafs-ready.json',root/'assets/mushaf-phone-hafs.json.gz'] + sorted((root/'assets/mushaf-phone-hafs').glob('*.json.gz')):
    relative=source.relative_to(root);destination=target/(str(relative)+".bin" if source.name.endswith(".gz") else str(relative))
    # AAPT treats .gz names specially; retain compressed bytes under a neutral suffix.
    if source.name.endswith(".gz") and (target/relative).exists(): (target/relative).unlink()
    destination.parent.mkdir(parents=True,exist_ok=True)
    if not destination.exists():
        try: os.link(source,destination)
        except OSError: shutil.copyfile(source,destination)
    manifest[str(relative)]=hashlib.sha256(source.read_bytes()).hexdigest()
for prefix,extension in [('mushaf-phone-hafs','json.gz')]:
    for page in range(1,605):
        name=f'assets/{prefix}/{page:03d}.{extension}'
        manifest[name]=hashlib.sha256((root/name).read_bytes()).hexdigest()
(target/'assets').mkdir(parents=True,exist_ok=True)
(target/'assets/mushaf-apk-sha256.json').write_text(json.dumps(manifest,separators=(',',':')))


