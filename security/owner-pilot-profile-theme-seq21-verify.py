#!/usr/bin/env python3
"""Owner-only signed OTA seq21: protect dynamic profile theme gradients."""
import argparse, base64, hashlib, importlib.util, json, re, subprocess, tempfile, time, zipfile
from pathlib import Path

ROOT=Path("android-updates/owner-pilot/build-150")
PREV="origin/owner-pilot-ota"
PIN="a0acf8f0464bad18392073c47166937e68f72b732efa3e1299331d0bc43307ea"
PROOF=Path("security/owner-pilot-profile-theme-seq21-signed-public.json")
CHANGED={"js/web-menu-button-theme.js","js/web-menu-order.js","js/apk-startup-bundle.js"}
PAINTER_OLD=".web-settings-list .main-action,#adhanServicesDialog"
PAINTER_NEW=".web-settings-list .main-action,#aoqatPersonalProfile .aoqat-profile-row,#adhanServicesDialog"
STYLE_OLD="border:1px solid #d1b981!important;background:linear-gradient(90deg,#fffdf7 0%,#f7ebce 100%)!important;color:#4b3924!important"
STYLE_NEW="border:1px solid var(--wt-border,#c5d5c8)!important;background:linear-gradient(90deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9))!important;color:var(--wt-text,#284435)!important"

def sha(b):
    return hashlib.sha256(b).hexdigest()

def git_show(name):
    return subprocess.check_output(["git","show",f"{PREV}:{ROOT}/{name}"])

def no_dupes(pairs):
    result={}
    for k,v in pairs:
        if k in result: raise ValueError("Duplicate JSON key")
        result[k]=v
    return result

def transform(name,original):
    content=original.decode("utf-8")
    if name in ("js/web-menu-button-theme.js","js/apk-startup-bundle.js"):
        assert content.count(PAINTER_OLD)==1,name
        content=content.replace(PAINTER_OLD,PAINTER_NEW)
    if name in ("js/web-menu-order.js","js/apk-startup-bundle.js"):
        assert content.count(STYLE_OLD)==1,name
        assert content.count("aoqatPilotProfileLightV7")==2,name
        content=content.replace(STYLE_OLD,STYLE_NEW).replace("aoqatPilotProfileLightV7","aoqatPilotProfileThemeV8")
        assert content.count("aoqatProfileGroup-")>=1,name
    return content.encode("utf-8")

def verified_snapshot():
    spec=importlib.util.spec_from_file_location("pilot",Path("security/owner-pilot-auto-ota-sign.py"))
    signer=importlib.util.module_from_spec(spec);spec.loader.exec_module(signer)
    assert signer.PINNED_PUBLIC_KEY_SPKI==PIN
    old=json.loads(git_show("manifest.json"),object_pairs_hook=no_dupes)
    assert (old["nativeBuild"],old["channel"],old["sequence"])==(150,"owner-pilot",20)
    assert len(old["files"])==88
    native=Path("android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    match=re.search(r'PILOT_SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"',native)
    assert match,"Pinned key absent"
    der=base64.b64decode(match.group(1),validate=True)
    assert sha(der)==PIN
    assets={}
    for name,digest in sorted(old["files"].items()):
        previous=git_show("files/"+name)
        assert sha(previous)==digest,("Prior signed file tampered",name)
        latest=(ROOT/"files"/name).read_bytes()
        if name in CHANGED:
            assert latest==transform(name,previous),("Change outside approved profile theme patch",name)
        else:
            assert latest==previous,("Changed unrelated file",name)
        assets[name]=latest
    assert set(CHANGED)<=set(assets)
    digests={name:sha(data) for name,data in assets.items()}
    assert {name for name in digests if digests[name]!=old["files"][name]}==CHANGED
    assert all(signer.allowed(name) and len(data)<=signer.MAX_FILE for name,data in assets.items())
    assert sum(map(len,assets.values()))<=signer.MAX_TOTAL
    canonical="\n".join(f"{name}:{digests[name]}" for name in sorted(digests))
    revision=sha(canonical.encode())
    public_pem=subprocess.check_output(["openssl","pkey","-pubin","-inform","DER","-outform","PEM"],input=der)
    with tempfile.TemporaryDirectory(prefix="pilot21-public-") as tmp:
        pub=Path(tmp)/"pilot-public.pem"
        pub.write_bytes(public_pem)
        signer.verify_signature(old,pub)
    return signer,old,assets,digests,revision,public_pem

def candidate(directory):
    signer,old,assets,digests,revision,public=verified_snapshot()
    directory.mkdir(parents=True,exist_ok=False)
    target=directory/"AOQAT-OWNER-PILOT-SEQ21-THEME-GRADIENT-UNSIGNED.zip"
    with zipfile.ZipFile(target,"w",zipfile.ZIP_DEFLATED) as archive:
        for name,data in sorted(assets.items()): archive.writestr(name,data)
    assert signer.read_candidate(target)==assets
    (directory/"pilot-public.pem").write_bytes(public)
    (directory/"owner-pilot-auto-ota-sign.py").write_bytes(Path("security/owner-pilot-auto-ota-sign.py").read_bytes())
    (directory/"candidate.sha256").write_text(sha(target.read_bytes())+"  "+target.name+"\n")
    (directory/"expected-revision.txt").write_text(revision+"\n")
    print("PASS: verified seq20 with pinned key; exactly three profile-only JS assets changed; unsigned candidate ready for owner signing")

def publish(directory):
    signer,old,assets,digests,revision,public=verified_snapshot()
    proof=json.loads(PROOF.read_text(),object_pairs_hook=no_dupes)
    assert set(proof)=={"nativeBuild","sequence","channel","expiresAt","revision","signature"}
    assert (proof["nativeBuild"],proof["sequence"],proof["channel"])==(150,21,"owner-pilot")
    now=int(time.time()*1000)
    assert type(proof["expiresAt"]) is int and now+300000<proof["expiresAt"]<now+15*86400000
    assert proof["revision"]==revision
    manifest={**proof,"files":digests}
    with tempfile.TemporaryDirectory(prefix="pilot21-verify-") as tmp:
        pem=Path(tmp)/"public.pem";pem.write_bytes(public)
        signer.verify_signature(manifest,pem)
    assert not directory.exists(),"Output exists"
    dest=directory/ROOT
    dest.mkdir(parents=True)
    (dest/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")))
    for name in CHANGED:
        path=dest/"files"/name
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(assets[name])
    print("PASS: seq21 ownerPilot signature verified; 88 assets preserved; exactly 3 approved JS paths and manifest")

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--candidate-dir",type=Path)
    p.add_argument("--verify-output",type=Path)
    args=p.parse_args()
    if bool(args.candidate_dir)==bool(args.verify_output):p.error("Select exactly one")
    candidate(args.candidate_dir) if args.candidate_dir else publish(args.verify_output)
