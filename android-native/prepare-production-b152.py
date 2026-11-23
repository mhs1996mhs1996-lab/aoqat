#!/usr/bin/env python3
"""Package the exactly owner-pilot accepted seq22 web UI into B152 native notification fix APK.
This never copies pilot OTA keys or grants pilot access to the production APK.
Only the web UI, CSS and JS are overlaid. Quran, prayer data and native assets
retain their immutable build source. No files from the installed user app touched.
"""
from __future__ import annotations
import base64
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
PILOT=ROOT/"android-updates/owner-pilot/build-150"
SNAPSHOT=PILOT/"files"
SEQUENCE=22
EXPECTED_SOURCE_REVISION="a4d9b9cb3256031ca7310b82d0b6d73bff6a365e1bd551a441e5b80e06916507"
PILOT_MENU='...(((window.AndroidNative?.readOwnerPilotOtaState && window.AndroidNative.readOwnerPilotOtaState()) || (window.AndroidNative?.configureAdhan && (location.protocol==="file:" || location.hostname==="appassets.androidplatform.net"))) ? [["ownerPilotOta","🔄","تحديثات النسخة التجريبية"]] : [])'
RELEASE_MENU="...[]"
CONDITION_START='const PILOT_OTA_APK=!!(\n    (window.AndroidNative?.readOwnerPilotOtaState && window.AndroidNative.readOwnerPilotOtaState()) ||\n    (window.AndroidNative?.configureAdhan && (location.protocol==="file:"||location.hostname==="appassets.androidplatform.net"))\n  );'
CONDITION_RELEASE='const PILOT_OTA_APK=false;'
WELCOME_START='if(!PILOT_OTA_APK || !window.AndroidNative?.readOwnerPilotOtaState ||'
WELCOME_RELEASE='if(!window.AndroidNative?.configureAdhan ||'
WELCOME_TIMER_START='if(!PILOT_OTA_APK||!window.AndroidNative?.readOwnerPilotOtaState||pilotPrivacyWelcomeQueued)return;'
WELCOME_TIMER_RELEASE='if(!window.AndroidNative?.configureAdhan||pilotPrivacyWelcomeQueued)return;'
OLD_KEY='pilotPrivacyWelcomeSeenV1'
NEW_KEY='aoqatPrivacyWelcomeSeenV1'
PILOT_ABOUT='أوقات الصلاة في الحويجة وضواحيها · التجريبي 2.12 (بناء 150)'
PRODUCTION_ABOUT='أوقات الصلاة في الحويجة وضواحيها · النسخة الرئيسية 2.13.1 (بناء 152)'
PILOT_ABOUT_ACTION='النسخة التجريبية تستقبل تحديثات OTA الموقّعة تلقائياً عند اتصال التطبيق بالإنترنت.'
PRODUCTION_ABOUT_ACTION='النسخة الرئيسية تستقبل تحديثات OTA الآمنة والموقّعة بعد اعتمادها ونشرها على القناة الرئيسية.'

def sha(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()

def replace_one(text:str,old:str,new:str,label:str)->str:
    count=text.count(old)
    if count!=1:raise RuntimeError(f"{label}: expected exactly one match, got {count}")
    return text.replace(old,new)

def verify_approved_pilot():
    spec=importlib.util.spec_from_file_location("pilot_signer",ROOT/"security/owner-pilot-auto-ota-sign.py")
    pilot=importlib.util.module_from_spec(spec);spec.loader.exec_module(pilot)
    manifest=json.loads((PILOT/"manifest.json").read_text(encoding="utf-8"))
    assert (manifest.get("nativeBuild"),manifest.get("sequence"),manifest.get("channel"))==(150,SEQUENCE,"owner-pilot")
    assert manifest.get("revision")==EXPECTED_SOURCE_REVISION
    files=manifest["files"]
    assert len(files)==88 and "index.html" in files
    checked={}
    total=0
    for name,digest in files.items():
        if not pilot.allowed(name):raise RuntimeError("Untrusted staged override path")
        data=(SNAPSHOT/name).read_bytes()
        if sha(data)!=digest:raise RuntimeError("Pilot asset checksum mismatch: "+name)
        total+=len(data)
        if len(data)>pilot.MAX_FILE:raise RuntimeError("Asset too large: "+name)
        checked[name]=data
    assert total<=pilot.MAX_TOTAL
    b=("\n".join(f"{p}:{files[p]}" for p in sorted(files))).encode()
    assert sha(b)==EXPECTED_SOURCE_REVISION
    native=(ROOT/"android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    match=re.search(r'PILOT_SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"',native)
    assert match,"Pilot public verification key missing"
    der=base64.b64decode(match.group(1),validate=True)
    if sha(der)!=pilot.PINNED_PUBLIC_KEY_SPKI:raise RuntimeError("Unexpected pilot signer")
    with tempfile.TemporaryDirectory(prefix="aoqat-release-source-") as tmp:
        pub=Path(tmp)/"pub.pem"
        public=subprocess.run(["openssl","pkey","-pubin","-inform","DER","-outform","PEM"],input=der,capture_output=True,check=True).stdout
        pub.write_bytes(public)
        pilot.verify_signature(manifest,pub)
    return checked

def produce_release_ui(data:bytes)->bytes:
    txt=data.decode("utf-8")
    txt=replace_one(txt,PILOT_MENU,RELEASE_MENU,"pilot navigation")
    txt=replace_one(txt,CONDITION_START,CONDITION_RELEASE,"pilot OTA feature")
    txt=replace_one(txt,WELCOME_START,WELCOME_RELEASE,"privacy splash gate")
    txt=replace_one(txt,WELCOME_TIMER_START,WELCOME_TIMER_RELEASE,"privacy scheduler gate")
    txt=replace_one(txt,OLD_KEY,NEW_KEY,"production privacy storage")
    # About must describe the actual release, never the source pilot package.
    # Both the visible subtitle and its on-tap description are production only.
    txt=replace_one(txt,PILOT_ABOUT,PRODUCTION_ABOUT,"main version and channel label")
    txt=replace_one(txt,PILOT_ABOUT_ACTION,PRODUCTION_ABOUT_ACTION,"main OTA description")
    # The pilot-only lock typography button was accidentally withheld from
    # production even though these same six tested views are in the release UI.
    # Reveal it ONLY if the B151 native persistence bridge really exists.
    pilot_guard='if(window.AndroidNative?.readOwnerPilotOtaState?.())'
    main_guard='if(typeof window.AndroidNative?.readLockScreenTextStyle==="function" && typeof window.AndroidNative?.configureLockScreenTextStyle==="function")'
    if txt.count(pilot_guard)!=2:raise RuntimeError("Pilot-only typography guard unexpectedly changed")
    txt=txt.replace(pilot_guard,main_guard)
    if 'const PILOT_OTA_APK=false;' not in txt:raise RuntimeError("Pilot disabled check failed")
    if 'aoqatPrivacyWelcomeSeenV1' not in txt:raise RuntimeError("Privacy missing")
    return txt.encode("utf-8")

def main():
    if len(sys.argv)!=2:raise SystemExit("Usage: prepare-production-b151.py ASSETS_WWW_DIR")
    target=Path(sys.argv[1]).resolve()
    if not target.is_dir() or not (target/"index.html").exists():
        raise RuntimeError("APK asset staging directory not ready")
    approved=verify_approved_pilot()
    release={}
    for name,data in approved.items():
        release[name]=produce_release_ui(data) if name in ("js/web-menu-order.js","js/apk-startup-bundle.js") else data
    assert release["index.html"]==approved["index.html"]
    assert release["js/web-menu-button-theme.js"]==approved["js/web-menu-button-theme.js"]
    for name in ("js/web-menu-order.js","js/apk-startup-bundle.js"):
        file=release[name]
        if file.count(b'aoqatLockScreenNotificationTextStyle')!=1:
            raise RuntimeError("Lock text formatting feature was dropped from main: "+name)
        if file.count(b'aoqatLockScreenFontFromLock')!=1:
            raise RuntimeError("Nested lock text formatting feature was dropped: "+name)
        if file.count(b'readLockScreenTextStyle')<3:
            raise RuntimeError("Native bridge gate and state editor missing: "+name)
        if PRODUCTION_ABOUT.encode("utf-8") not in file or PRODUCTION_ABOUT_ACTION.encode("utf-8") not in file:
            raise RuntimeError("Main about/version label was not promoted: "+name)
        if PILOT_ABOUT.encode("utf-8") in file or PILOT_ABOUT_ACTION.encode("utf-8") in file:
            raise RuntimeError("Experimental about/version label leaked into main: "+name)
        for required in (b'aoqatProfileBackupDownload',b'aoqatProfileBackupShare',
                         b'aoqatProfileBackupActions',b'profileBackupRestore',
                         b'profileBackupSave',b'PROFILE_BACKUP_DB'):
            if required not in file:
                raise RuntimeError("Backup feature omitted from main: "+str(required))
    if release["js/web-menu-order.js"].count(b"aoqatPrivacyWelcomeSeenV1")!=1:
        raise RuntimeError("Embedded production privacy gate missing")
    if release["js/apk-startup-bundle.js"].count(b"aoqatPrivacyWelcomeSeenV1")!=1:
        raise RuntimeError("Bundled production privacy gate missing")
    for name,data in release.items():
        file=target/name;file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(data)
    # Confirm QCF reader/font, prayers and all native assets remain untouched by the overlay.
    assert (target/"data/prayer-times-offline.json").is_file()
    assert (target/"assets/qcf-v2-page-fonts").is_dir()
    assert (target/"js/quran-reader.js").is_file()
    assert all((target/name).read_bytes()==data for name,data in release.items())
    print(f"PASS: signed pilot seq{SEQUENCE}, {len(release)} approved web assets -> main 2.13 B151")
    print("PASS: no pilot OTA UI; retained first-run privacy and theme gradients")
    print("PASS: no Quran, prayer timetable, userdata, or native asset modification")

if __name__=="__main__":main()
