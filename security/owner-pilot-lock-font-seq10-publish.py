#!/usr/bin/env python3
"""Verify original-key signed owner-only seq10 font BUTTON and stage exactly 3 public feed files.

Only 2 JS asset bytes are modified from the LIVE, already signed owner-pilot seq9.
The secret key never enters this repository or CI. A signed public proof is required.
"""
from pathlib import Path
import base64
import hashlib
import importlib.util
import json
import re
import subprocess
import tempfile
import time

PROJECT = Path(__file__).resolve().parent.parent
ROOT = "android-updates/owner-pilot/build-150/"
PROOF = PROJECT / "security/owner-pilot-lock-font-seq10-signature.json"
PIN = "a0acf8f0464bad18392073c47166937e68f72b732efa3e1299331d0bc43307ea"
CHANGED = {"js/web-menu-order.js", "js/apk-startup-bundle.js"}

OLD = """  function widgetAppearanceView(){
    const panel=window.AoqatWidgetAppearance?.createPanel?.();
    if(panel)openSub("تعديل بطاقات الشاشة الرئيسية",panel,"appearance");
  }"""
NEW = """  function widgetAppearanceView(){
    const panel=window.AoqatWidgetAppearance?.createPanel?.();
    if(!panel)return;
    if(window.AndroidNative?.readOwnerPilotOtaState?.()){
      const button=document.createElement("button");
      button.type="button";button.className="main-action";
      button.id="aoqatLockScreenNotificationTextStyle";
      button.textContent="🔤 تنسيق خطوط إشعار شاشة القفل";
      button.onclick=()=>{
        if(typeof window.AndroidNative?.openLockScreenTextStyle==="function")
          window.AndroidNative.openLockScreenTextStyle();
        else window.alert("تنسيق الخط يحتاج إصدار APK التجريبي الذي يدعم هذه الميزة.");
      };
      panel.append(button);
    }
    openSub("تعديل بطاقات الشاشة الرئيسية",panel,"appearance");
  }"""

def sha(data):
    return hashlib.sha256(data).hexdigest()

def feed(path):
    return subprocess.check_output(["git","show","origin/owner-pilot-ota:"+ROOT+path])

def assets_from_feed():
    prior = json.loads(feed("manifest.json"))
    assert (prior["sequence"], prior["nativeBuild"], prior["channel"]) == (9,150,"owner-pilot")
    assert len(prior["files"]) == 88
    assets = {name:feed("files/"+name) for name in sorted(prior["files"])}
    assert {name:sha(data) for name,data in assets.items()} == prior["files"]
    for name in CHANGED:
        text = assets[name].decode("utf-8")
        assert text.count(OLD) == 1, "Original menu not exactly from signed seq9: "+name
        text = text.replace(OLD,NEW)
        assert text.count("aoqatLockScreenNotificationTextStyle") == 1
        section = text.split("function widgetAppearanceView(){",1)[1].split("function themeView(){",1)[0]
        assert "panel.append(button)" in section
        assert "openSub(\"تعديل بطاقات الشاشة الرئيسية\",panel,\"appearance\")" in section
        assets[name] = text.encode("utf-8")
    current = {name:sha(data) for name,data in assets.items()}
    assert {name for name in current if current[name]!=prior["files"][name]} == CHANGED
    assert set(current) == set(prior["files"])
    assert b"aoqatPersonalProfile" in assets["js/apk-startup-bundle.js"]
    assert b"aoqatProfileBackupSchedule" in assets["js/apk-startup-bundle.js"]
    assert b"privacyPolicy" in assets["js/apk-startup-bundle.js"]
    assert b"aoqatQuranReaderV1" in assets["js/apk-startup-bundle.js"]
    assert b"js/apk-startup-bundle.js" in assets["index.html"]
    return prior,assets,current

def verify_and_stage(destination):
    spec = importlib.util.spec_from_file_location("owner_pilot_signer",
        PROJECT/"security/owner-pilot-auto-ota-sign.py")
    signer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(signer)
    assert PIN == signer.PINNED_PUBLIC_KEY_SPKI
    prior,assets,current = assets_from_feed()
    proof=json.loads(PROOF.read_text(encoding="utf-8"),
                     object_pairs_hook=lambda pairs:checked_object(pairs))
    assert set(proof) == {"nativeBuild","sequence","channel","expiresAt","revision","signature"}
    assert (proof["nativeBuild"],proof["sequence"],proof["channel"])==(150,10,"owner-pilot")
    assert type(proof["expiresAt"]) is int
    assert int(time.time()*1000)+300_000 < proof["expiresAt"] < int(time.time()*1000)+15*86400_000
    canonical = "\n".join(f"{name}:{current[name]}" for name in sorted(current))
    manifest = dict(proof)
    manifest["files"] = current
    assert manifest["revision"] == sha(canonical.encode())
    source=(PROJECT/"android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    match=re.search(r'PILOT_SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"',source)
    assert match
    der=base64.b64decode(match.group(1),validate=True)
    assert sha(der) == PIN
    with tempfile.TemporaryDirectory(prefix="pilot-seq10-public-verify-") as tmp:
        pub=Path(tmp)/"pub.pem"
        pub.write_bytes(subprocess.check_output(["openssl","pkey","-pubin",
          "-inform","DER","-outform","PEM"],input=der))
        signer.verify_signature(manifest,pub)
    target = Path(destination)/ROOT
    assert not target.exists()
    target.mkdir(parents=True)
    (target/"manifest.json").write_text(json.dumps(manifest,separators=(",",":"),ensure_ascii=False),encoding="utf-8")
    for name in CHANGED:
        p=target/"files"/name
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_bytes(assets[name])
        assert sha(p.read_bytes())==current[name]
    print("PASS: original owner key signed sequence 10 verified; unchanged 86 of 88 files.")
    print("PASS: only web-menu-order.js, apk-startup-bundle.js and signed manifest may publish.")
    print("PASS: no native APK, production, main branch, Vercel or admin edits.")

def checked_object(pairs):
    d={}
    for k,v in pairs:
        if k in d:raise ValueError("duplicate key")
        d[k]=v
    return d

if __name__=="__main__":
    import argparse
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    opts=ap.parse_args()
    verify_and_stage(opts.output)
