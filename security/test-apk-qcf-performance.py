#!/usr/bin/env python3
"""APK-only QCF performance regression. The hosted web reader remains untouched."""
from pathlib import Path
import json
import hashlib
import zipfile
import sys

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
        require("2.11.1-qcf-performance-test" in
                (root / "android-native/app/build.gradle").read_text(),
                "APK performance version missing")
print("PASS: APK QCF two-page staging, batched measurement, idle font lookahead;")
print("PASS: unmodified hosted web/QCF sacred word renderer and 604 offline fonts")
