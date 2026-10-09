"""Apply APK-only integration to the tested web UI; leave repository web files intact."""
from pathlib import Path
import sys
import hashlib
import json
root=Path(__file__).resolve().parent.parent
target=Path(sys.argv[1])
def transform(name,changes):
    text=(root/'js'/name).read_text()
    for old,new in changes:
        if old not in text: raise RuntimeError('APK integration target missing: '+name+' '+old[:70])
        text=text.replace(old,new)
    path=target/'js'/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text)
transform('web-menu-order.js',[
 ('...(!window.AndroidNative?.configureAdhan ? [["quran","📖","القرآن الكريم"],["qibla","🧭","اتجاه القبلة"],["azkar","📿","الأذكار"]] : [])','["quran","📖","القرآن الكريم"],["qibla","🧭","اتجاه القبلة"],["azkar","📿","الأذكار"]'),
 ('["quran","qibla","azkar"].includes(id)','["quran","qibla","azkar","widget"].includes(id)')])
transform('quran-reader.js',[
 ('  if (window.AndroidNative?.configureAdhan) return;',''),
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
 ('if (!native && servicePanel)', 'if (servicePanel)'),
 ('if (native || !["quran","qibla","azkar"].includes(kind)) return;', 'if (!["quran","qibla","azkar","widget"].includes(kind)) return;'),
 ('if (kind === "quran" && !native)', 'if (kind === "quran")'),
 ('    if (!native) {\n      servicePanel = document.createElement("section");','    {\n      servicePanel = document.createElement("section");'),
 ('على الويب نعاين فترة الصامت ونكتم صوت الأذان داخل الصفحة أثناءها. تحويل الهاتف نفسه إلى الصامت واستعادة وضعه يحتاج تطبيق Android بعد تحديثه.', 'يبدأ وضع الصامت عند الإقامة ويُستعاد وضع الهاتف السابق عند انتهاء المدة. يحتاج إذن التحكم بوضع الصامت في Android.')])

# Pin every downloadable page to this release; cached bytes must match the original assets.
manifest={}
for prefix,extension in [('mushaf-phone-hafs','json.gz'),('mushaf-hafs-pocket','webp')]:
    for page in range(1,605):
        name=f'assets/{prefix}/{page:03d}.{extension}'
        manifest[name]=hashlib.sha256((root/name).read_bytes()).hexdigest()
(target/'assets').mkdir(parents=True,exist_ok=True)
(target/'assets/mushaf-apk-sha256.json').write_text(json.dumps(manifest,separators=(',',':')))
