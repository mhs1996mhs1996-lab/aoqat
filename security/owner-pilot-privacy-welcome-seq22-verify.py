#!/usr/bin/env python3
"""Strict verifier for B150 owner-pilot first-run privacy introduction, seq22."""
import argparse,base64,hashlib,importlib.util,json,re,subprocess,tempfile,time,zipfile
from pathlib import Path

ROOT=Path("android-updates/owner-pilot/build-150")
PREV="origin/owner-pilot-ota"
PIN="a0acf8f0464bad18392073c47166937e68f72b732efa3e1299331d0bc43307ea"
CHANGED={"js/web-menu-order.js","js/apk-startup-bundle.js"}
OLD_START='  function start(){let n=0;const t=setInterval(()=>{if(install()||++n>80)clearInterval(t)},150);install();window.addEventListener("aoqatModulesReady",install);}'
NEW_START='  function start(){let n=0;const t=setInterval(()=>{if(install()||++n>80)clearInterval(t)},150);install();window.addEventListener("aoqatModulesReady",install);schedulePilotPrivacyWelcome();}'
MARKER="  // Owner-pilot first-launch privacy introduction."
PROOF=Path("security/owner-pilot-privacy-welcome-seq22-signed-public.json")

def sha(data):return hashlib.sha256(data).hexdigest()
def show(name):return subprocess.check_output(["git","show",f"{PREV}:{name}"])
def unique(pairs):
    d={}
    for k,v in pairs:
        if k in d:raise ValueError("duplicate signed manifest key")
        d[k]=v
    return d

def prepare():
    spec=importlib.util.spec_from_file_location("pilot",Path("security/owner-pilot-auto-ota-sign.py"))
    signer=importlib.util.module_from_spec(spec);spec.loader.exec_module(signer)
    assert signer.PINNED_PUBLIC_KEY_SPKI==PIN
    previous=json.loads(show(str(ROOT/"manifest.json")),object_pairs_hook=unique)
    assert (previous["nativeBuild"],previous["channel"],previous["sequence"])==(150,"owner-pilot",21)
    assert len(previous["files"])==88
    native=Path("android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    match=re.search(r'PILOT_SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"',native)
    assert match
    der=base64.b64decode(match.group(1),validate=True)
    assert sha(der)==PIN
    public=subprocess.check_output(["openssl","pkey","-pubin","-inform","DER","-outform","PEM"],input=der)
    for name in (
       "android-native/app/src/main/java/com/aoqat/calendar/MainActivity.kt",
       "android-native/app/src/main/java/com/aoqat/calendar/StartupScreen.kt",
       "android-updates/owner-pilot/build-150/files/index.html",
       "android-updates/owner-pilot/build-150/files/js/startup-stabilizer.js"):
        assert Path(name).read_bytes()==show(name),("splash or startup code touched",name)
    assets={}
    block=None
    for name,digest in sorted(previous["files"].items()):
        before=show(str(ROOT/"files"/name))
        assert sha(before)==digest,("previous signed byte mismatch",name)
        after=(ROOT/"files"/name).read_bytes()
        if name in CHANGED:
            old=before.decode("utf-8");new=after.decode("utf-8")
            assert old.count(OLD_START)==1 and new.count(NEW_START)==1
            assert old.count(MARKER)==0 and new.count(MARKER)==1
            extracted=new[new.index(MARKER):new.index(NEW_START)]
            assert "window.aoqatUIReady" in extracted and 'classList.contains("aoqat-ready")' in extracted
            assert 'PILOT_PRIVACY_WELCOME_KEY="pilotPrivacyWelcomeSeenV1"' in extracted
            assert "PRIVACY_SECTIONS" in extracted
            assert "read.onclick" in extracted and "continueBtn.onclick=finish" in extracted
            assert "localStorage.setItem(PILOT_PRIVACY_WELCOME_KEY" in extracted
            assert "window.AndroidNative?.readOwnerPilotOtaState" in extracted
            assert "fetch(" not in extracted and "location.href" not in extracted
            assert "startupScreen" not in extracted and "startupContainer" not in extracted
            assert new==old.replace(OLD_START,extracted+NEW_START),("unexpected JS change",name)
            if block is None:block=extracted
            else:assert block==extracted,("menu and APK bundle differ",name)
        else:assert before==after,("unapproved asset change",name)
        assets[name]=after
    digests={k:sha(v) for k,v in assets.items()}
    assert {k for k in digests if digests[k]!=previous["files"][k]}==CHANGED
    assert all(signer.allowed(k) and len(v)<=signer.MAX_FILE for k,v in assets.items())
    assert sum(map(len,assets.values()))<=signer.MAX_TOTAL
    with tempfile.TemporaryDirectory(prefix="aoqat-pilot-public-") as tmp:
        pem=Path(tmp)/"pilot-public.pem";pem.write_bytes(public)
        signer.verify_signature(previous,pem)
    canonical="\n".join(f"{k}:{digests[k]}" for k in sorted(digests))
    return signer,assets,digests,sha(canonical.encode()),public

def candidate(out):
    signer,assets,digests,revision,public=prepare()
    out.mkdir(parents=True,exist_ok=False)
    zipfile_path=out/"AOQAT-OWNER-PILOT-SEQ22-FIRST-RUN-PRIVACY-UNSIGNED.zip"
    with zipfile.ZipFile(zipfile_path,"w",zipfile.ZIP_DEFLATED) as archive:
        for k,v in sorted(assets.items()):archive.writestr(k,v)
    assert signer.read_candidate(zipfile_path)==assets
    (out/"pilot-public.pem").write_bytes(public)
    (out/"owner-pilot-auto-ota-sign.py").write_bytes(Path("security/owner-pilot-auto-ota-sign.py").read_bytes())
    (out/"expected-revision.txt").write_text(revision+"\n")
    (out/"candidate.sha256").write_text(sha(zipfile_path.read_bytes())+"  "+zipfile_path.name+"\n")
    print("PASS: pilot seq21 signed manifest verified, 88 web assets preserved, only 2 privacy-onboarding JS files changed")
    print("PASS: existing native splash image and dismissal, index.html and startup stabilizer byte-identical")

def publish(out):
    signer,assets,digests,revision,public=prepare()
    proof=json.loads(PROOF.read_text(),object_pairs_hook=unique)
    assert set(proof)=={"nativeBuild","sequence","channel","expiresAt","revision","signature"}
    assert (proof["nativeBuild"],proof["sequence"],proof["channel"])==(150,22,"owner-pilot")
    now=int(time.time()*1000)
    assert type(proof["expiresAt"]) is int and now+300000<proof["expiresAt"]<now+15*86400000
    assert proof["revision"]==revision
    manifest={**proof,"files":digests}
    with tempfile.TemporaryDirectory(prefix="aoqat22-verify-") as tmp:
        pem=Path(tmp)/"pilot-public.pem";pem.write_bytes(public)
        signer.verify_signature(manifest,pem)
    assert not out.exists()
    folder=out/ROOT;folder.mkdir(parents=True)
    (folder/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")))
    for name in CHANGED:
        target=folder/"files"/name;target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(assets[name])
    print("PASS: pinned signature, sequence 22, exactly 2 JS files and signed manifest; no splash or production changes")

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--candidate-dir",type=Path)
    p.add_argument("--verify-output",type=Path)
    a=p.parse_args()
    if bool(a.candidate_dir)==bool(a.verify_output):p.error("Choose exactly one mode")
    candidate(a.candidate_dir) if a.candidate_dir else publish(a.verify_output)
