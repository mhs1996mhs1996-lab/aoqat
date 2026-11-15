#!/usr/bin/env python3
"""APK-only QCF performance regression. The hosted web reader remains untouched."""
from pathlib import Path
import json
import hashlib
import zipfile
import sys
import io
import gzip
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
web = (root / "js/quran-reader.js").read_text(encoding="utf-8")
apk_path = root / "android-native/app/src/main/assets/www/js/quran-reader.js"
if not apk_path.is_file():
    raise SystemExit("APK QCF reader has not been staged; run Gradle syncWebAssets")
apk = apk_path.read_text(encoding="utf-8")

def require(yes, message):
    if not yes:
        raise AssertionError(message)

require("const webQcfTrial=!window.AndroidNative?.configureAdhan;" in web,
        "Hosted web QCF engine modified")
require("APK_QCF_FAST_SWIPE_V147" not in web,
        "APK-only performance patch leaked into hosted web")
require("APK_QCF_FAST_SWIPE_V147" in apk,
        "APK fast swipe patch absent from installed app")
require("const webQcfTrial=true;" in apk and "state.renderEngine='qcf';" in apk,
        "Installed app no longer uses one offline QCF engine")
require("https://verses.quran.foundation/fonts" not in apk,
        "APK accidentally requires remote Quran page fonts")
require("if(!root?.isConnected||pointer||galleryBusy||state.page!==current)return;" in apk,
        "Idle Quran lookahead must cancel during a finger gesture")
require("const ahead=current+galleryLastDirection*2;" in apk,
        "Only future page font must be warmed in idle time")
require("const metrics=Array.from(lines,line=>({" in apk and
        "const adjustedWidths=Array.from(lines,line=>line.scrollWidth);" in apk,
        "QCF text fitting not batched")
require("""const targets=isQcf()
        ?[activePage+galleryLastDirection,activePage-galleryLastDirection]
        :[activePage+1,activePage-1];""" in apk,
        "More than two adjacent QCF DOM pages prepared")
require("""const wanted=new Set(isQcf()?[
      state.page+galleryLastDirection,state.page-galleryLastDirection
    ]:[state.page+1,state.page-1]);""" in apk,
        "Offscreen QCF page DOM retained too aggressively")
require("state.renderEngine='svg'" not in apk,
        "APK can silently switch to obsolete SVG edition")
require("qcfLoad(page)" in apk, "Per-page verified offline Quran loading missing")
# Build 148 responsiveness checks: only installed APK code may change.
require("APK_QCF_TURN_LATENCY_V148" in apk, "B148 QCF performance marker missing")
require("const QCF_TEXT_CACHE_LIMIT=24,QCF_FONT_CACHE_LIMIT=20;" in apk,
        "Recent Quran fonts must be retained for reverse swipes")
require("commit&&swipeSpeed>=1.1?85:commit&&swipeSpeed>=.65?105" in apk,
        "Fast QCF swipe settles must not remain in B147 timing")
require("const ahead=current+galleryLastDirection*2;" in apk and
        "},85);" in apk,
        "Next-page font lookahead must begin promptly after settling")
require("function qcfScheduleNavigationSave()" in apk and
        "window.addEventListener('pagehide'" in apk,
        "Debounced page location must flush on leaving app")
require("if($('aqSheet')&&!$('aqSheet').hidden)closeSheet();" in apk,
        "QCF swipe must avoid repeated unnecessary focus() and layout")
require("APK_QCF_TURN_LATENCY_V148" not in web,
        "QCF performance test leaked into hosted web reader")
require("APK_QCF_UNIFORM_LINES_V149" in apk,
        "No uniform font-size fix for regular Quran pages")
require("APK_QCF_UNIFORM_LINES_V149" not in web,
        "APK-only uniform font-size fix leaked into web")
normal = apk.split("      if(page>2){\n        // APK_QCF_UNIFORM_LINES_V149",1)[1].split("      const memo=qcfFitCache",1)[0]
require("const fullLineEm=17.60;" in normal and
        "for(const line of lines)line.style.setProperty('font-size',px,'important');" in normal,
        "Every normal Mushaf line must receive identical font size")
require("scrollWidth" not in normal and "clientWidth" not in normal and
        "offsetWidth" not in normal and "getBoundingClientRect" not in normal,
        "Normal QCF pages must avoid synchronous DOM measurements")
require("return;" in normal, "Old per-line QCF layout code is still running")



# The complete word, aya-marker, surah and 604-page DOM content
# construction code must be exactly unchanged, not even whitespace.
def sacred_renderer(js):
    start = js.index("  function qcfHTML(page){")
    end = js.index("  function pageHTML(page){", start)
    return js[start:end]
require(sacred_renderer(web) == sacred_renderer(apk),
        "QCF verse glyphs, surah decoration or text construction changed")

archive = root / "android-native/app/build/outputs/apk/release/app-release-unsigned.apk"
if archive.is_file():
    with zipfile.ZipFile(archive) as z:
        base="assets/www/"
        fonts=[p for p in z.namelist()
               if p.startswith(base+"assets/qcf-v2-page-fonts/p")
               and p.endswith(".woff2")]
        require(len(fonts)==604, "QCF 604 offline page fonts incomplete")
        prayers=json.loads(z.read(base+"data/prayer-times-offline.json"))
        require(len(prayers)==366, "Hawija prayer days changed")
        protected=json.loads(z.read(base+"assets/mushaf-apk-sha256.json"))
        for file, digest in protected.items():
            item=base+file+(".bin" if file.endswith(".gz") else "")
            require(hashlib.sha256(z.read(item)).hexdigest()==digest,
                    "Sacred offline APK payload hash mismatch: "+file)
        # The precomputed universal bound is grounded in the ACTUAL 604
        # packaged WOFF2 fonts and original 604-page QCF word layout.
        # It must include the fixed 1.12em ornament replacing QCF markers.
        manifest=z.read(base+"experiments/qcf604-web-verse-layouts.json.gz.bin")
        require(hashlib.sha256(manifest).hexdigest()==
                "c4bb062c0b0d8e91e8e453274535b36daee22b90d1f39cbe9ba0808dbf65a526",
                "QCF word layout changed; font bounds need independent re-review")
        page_data=json.loads(gzip.decompress(manifest))["pages"]
        require(len(page_data)==604, "Not all 604 pages present")
        aggregate=hashlib.sha256()
        largest=0.0
        largest_page=0
        for number in range(1,605):
            font_bytes=z.read(base+f"assets/qcf-v2-page-fonts/p{number}.woff2")
            aggregate.update(font_bytes)
            font=TTFont(io.BytesIO(font_bytes))
            cmap=font.getBestCmap()
            widths=font["hmtx"].metrics
            units=font["head"].unitsPerEm
            for row in page_data[str(number)]["lines"]:
                if not row.get("v"): continue
                width=0.0
                for _,glyph,is_marker in row["v"]:
                    if is_marker: width+=1.12; continue
                    for char in glyph:
                        name=cmap.get(ord(char))
                        width+=(widths[name][0]/units if name else 0.32)
                if width>largest:
                    largest=width
                    largest_page=number
            font.close()
        require(aggregate.hexdigest()==
                "212469cdf692d30a8fe2abe623eda29bcfa4428fdc98de7f139332a0f19f4e0d",
                "Original offline QCF 604 fonts changed")
        require(largest<=17.60,
                f"QCF rows exceed page-width bound {largest:.3f}em on page {largest_page}")
        print(f"PASS: all 604 original fonts checked, maximum line {largest:.3f}em, "
              "uniform size fits without per-line WebView reflow")
        require("2.11.3-qcf-uniform-test" in
                (root / "android-native/app/build.gradle").read_text(),
                "APK performance version missing")
print("PASS: APK QCF two-page staging, uniform normal page typography, idle font lookahead;")
print("PASS: unmodified hosted web/QCF sacred word renderer and 604 offline fonts")
