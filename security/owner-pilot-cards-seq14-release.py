#!/usr/bin/env python3
"""Pilot seq14: derive exactly two WEB override changes from signed live seq10.
No native changes; no private key in GitHub or CI. Uses original pinned pilot signer.
"""
import base64
import hashlib
import importlib.util
import json
import re
import subprocess
import tempfile
import time
import zipfile
from pathlib import Path

HERE=Path(__file__).resolve().parent.parent
ROOT="android-updates/owner-pilot/build-150/"
PIN="a0acf8f0464bad18392073c47166937e68f72b732efa3e1299331d0bc43307ea"
CHANGED={"js/web-menu-order.js","js/apk-startup-bundle.js"}
PROOF=HERE/"security/owner-pilot-cards-seq14-signed-public.json"
START="  // Owner-pilot web-only card navigation;"
OLD_START="  // Owner-pilot web-only cards + lock-screen navigation."
END="  function themeView(){"

def hash_bytes(data):return hashlib.sha256(data).hexdigest()
def show(name):
    return subprocess.check_output(["git","show","origin/owner-pilot-ota:"+ROOT+name])

def no_duplicate(pairs):
    value={}
    for key,item in pairs:
        if key in value:raise ValueError("Duplicate manifest key")
        value[key]=item
    return value

def signer_module():
    spec=importlib.util.spec_from_file_location("aoqat_pilot_signer",HERE/"security/owner-pilot-auto-ota-sign.py")
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def prepare_assets():
    prior=json.loads(show("manifest.json"),object_pairs_hook=no_duplicate)
    assert (prior["nativeBuild"],prior["sequence"],prior["channel"])==(150,13,"owner-pilot")
    assert len(prior["files"])==88
    assets={name:show("files/"+name) for name in sorted(prior["files"])}
    assert {name:hash_bytes(data) for name,data in assets.items()}==prior["files"]
    source=(HERE/"js/web-menu-order.js").read_text(encoding="utf-8")
    assert source.count(START)==1 and source.count(END)>=1
    section=source[source.index(START):source.index(END,source.index(START))]
    assert section.count("padding:9px 12px 9px 50px!important")==2,"left help glyph padding not fixed"
    for name in CHANGED:
        text=assets[name].decode("utf-8")
        assert text.count(START)==1 and text.count(END)>=1
        beg=text.index(START)
        end=text.index(END,beg)
        previous=text[beg:end]
        assert previous.count("padding:9px 46px 9px 12px!important")==2,"expected signed seq13 before applying fix"
        assert "readLockScreenTextStyle" in previous and "lockFontSubmenuView" in previous
        text=text[:beg]+section+text[end:]
        assets[name]=text.encode("utf-8")
    sums={name:hash_bytes(data) for name,data in assets.items()}
    assert set(sums)==set(prior["files"])
    assert {name for name in sums if sums[name]!=prior["files"][name]}==CHANGED
    assert b"js/apk-startup-bundle.js" in assets["index.html"]
    for name in CHANGED:
        for anchor in (b"privacyPolicy",b"aoqatPersonalProfile",b"aoqatProfileBackupSchedule",b"aoqatPilotOtaPanel",b"aoqatQuranReaderV1"):
            assert anchor in assets[name],(name,anchor)
    signer=signer_module()
    assert all(signer.allowed(name) and len(data)<=signer.MAX_FILE for name,data in assets.items())
    assert sum(map(len,assets.values()))<=signer.MAX_TOTAL
    return prior,assets,sums

def create_candidate(destination):
    prior,assets,sums=prepare_assets()
    destination.mkdir(parents=True,exist_ok=True)
    target=destination/"AOQAT-OWNER-PILOT-OTA-SEQ14-UNSIGNED.zip"
    with zipfile.ZipFile(target,"w",zipfile.ZIP_DEFLATED) as z:
        for name,data in sorted(assets.items()):z.writestr(name,data)
    (destination/"previous-seq13-manifest.json").write_bytes(show("manifest.json"))
    (destination/"candidate.sha256").write_text(hash_bytes(target.read_bytes())+"  "+target.name+"\n")
    for name in CHANGED:
        (destination/("check-"+name.split("/")[-1])).write_bytes(assets[name])
    print("PASS: preserved all 88 signed seq10 paths; only two owner pilot web JS assets modified; UNSIGNED")

def verify_and_stage(destination):
    signer=signer_module()
    assert signer.PINNED_PUBLIC_KEY_SPKI==PIN
    prior,assets,sums=prepare_assets()
    proof=json.loads(PROOF.read_text(encoding="utf-8"),object_pairs_hook=no_duplicate)
    assert set(proof)=={"nativeBuild","sequence","channel","expiresAt","revision","signature"}
    assert (proof["nativeBuild"],proof["sequence"],proof["channel"])==(150,14,"owner-pilot")
    assert type(proof["expiresAt"]) is int and int(time.time()*1000)+300000<proof["expiresAt"]<int(time.time()*1000)+15*86400000
    manifest={**proof,"files":sums}
    canonical="\n".join(name+":"+sums[name] for name in sorted(sums))
    assert manifest["revision"]==hash_bytes(canonical.encode()),"Proof doesn't match current candidate"
    source=(HERE/"android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    match=re.search(r'PILOT_SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"',source)
    assert match,"Pinned public key missing"
    der=base64.b64decode(match.group(1),validate=True)
    assert hash_bytes(der)==PIN
    with tempfile.TemporaryDirectory(prefix="aoqat-seq14-verification-") as tmp:
        pub=Path(tmp)/"public.pem"
        pub.write_bytes(subprocess.check_output(["openssl","pkey","-pubin","-inform","DER","-outform","PEM"],input=der))
        signer.verify_signature(manifest,pub)
    target=destination/ROOT
    assert not target.exists()
    target.mkdir(parents=True)
    (target/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    for name in CHANGED:
        p=target/"files"/name
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_bytes(assets[name])
        assert hash_bytes(p.read_bytes())==sums[name]
    print("PASS: pinned original pilot signature verified, sequence 14; only two JS override changes")
    print("PASS: no production, main, APK, Quran, prayer times or admin modified")

if __name__=="__main__":
    import argparse
    ap=argparse.ArgumentParser()
    ap.add_argument("--candidate-dir",type=Path)
    ap.add_argument("--verify-output",type=Path)
    args=ap.parse_args()
    if bool(args.candidate_dir)==bool(args.verify_output):ap.error("Choose exactly one mode")
    if args.candidate_dir:create_candidate(args.candidate_dir)
    else:verify_and_stage(args.verify_output)
