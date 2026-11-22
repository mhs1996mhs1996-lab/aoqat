#!/usr/bin/env python3
"""Build and verify an ORIGINAL-KEY signed, owner-pilot ONLY OTA seq19.
Strictly reorganizes existing profile nodes, preserving native/UI/backup handlers.
"""
import base64,hashlib,importlib.util,json,re,subprocess,tempfile,time,zipfile
from pathlib import Path
HERE=Path(__file__).resolve().parent.parent
ROOT="android-updates/owner-pilot/build-150/"
PIN="a0acf8f0464bad18392073c47166937e68f72b732efa3e1299331d0bc43307ea"
CHANGED={"js/web-menu-order.js","js/apk-startup-bundle.js"}
PROOF=HERE/"security/owner-pilot-profile-four-menus-seq19-signed-public.json"

def sha(data):return hashlib.sha256(data).hexdigest()
def show(name):return subprocess.check_output(["git","show","origin/owner-pilot-ota:"+ROOT+name])
def no_dupes(pairs):
    result={}
    for key,value in pairs:
        if key in result:raise ValueError("Duplicate key: "+key)
        result[key]=value
    return result
def signer():
    spec=importlib.util.spec_from_file_location("aoqat_pilot_signer",HERE/"security/owner-pilot-auto-ota-sign.py")
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m

PROFILE_START='  function profileView(){'
PROFILE_END='  // Read-only pilot OTA availability UI.'
STYLES_BEFORE='background:var(--wt-surface,#f7fafb)!important;box-shadow:none!important;text-align:right!important;line-height:1.25!important;text-shadow:none!important'
STYLES_AFTER='background:linear-gradient(90deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9))!important;color:var(--wt-text,#173c50)!important;box-shadow:none!important;text-align:right!important;line-height:1.3!important;text-shadow:none!important'
TAIL_BEFORE='    panel.append(note);\n    openSub("الملف الشخصي",panel,"main");\n'
TAIL_AFTER='    const originalRows=[\n'
REQUIRED_IDS=[
    "aoqatProfileCard","aoqatProfileEditPanel","aoqatProfileEditRow","aoqatProfileDelete",
    "aoqatProfileBackupExport","aoqatProfileBackupActions","aoqatProfileBackupOptionalSettings",
    "aoqatProfileBackupRestore","aoqatProfileRestorePanel","aoqatProfilePrivacy",
    "aoqatProfileContact","aoqatProfileAbout","aoqatProfileQuranBookmarks",
    "aoqatProfileQuranLastPage"
]

def prepare():
    prior=json.loads(show("manifest.json"),object_pairs_hook=no_dupes)
    assert (prior["nativeBuild"],prior["sequence"],prior["channel"])==(150,18,"owner-pilot")
    assert len(prior["files"])==88
    assets={name:show("files/"+name) for name in sorted(prior["files"])}
    assert {name:sha(data) for name,data in assets.items()}==prior["files"]
    for name in sorted(CHANGED):
        old=assets[name].decode("utf-8")
        new=(HERE/ROOT/"files"/name).read_text(encoding="utf-8")
        assert old.count(PROFILE_START)==1 and old.count(PROFILE_END)==1
        assert new.count(PROFILE_START)==1 and new.count(PROFILE_END)==1
        start=old.index(PROFILE_START);end=old.index(PROFILE_END,start)
        new_start=new.index(PROFILE_START);new_end=new.index(PROFILE_END,new_start)
        before,after=old[start:end],new[new_start:new_end]
        assert old[:start]==new[:new_start] and old[end:]==new[new_end:],"Unexpected change outside profileView"
        assert before.count(TAIL_BEFORE)==1 and after.count(TAIL_AFTER)==1
        assert before.count(STYLES_BEFORE)==1 and after.count(STYLES_AFTER)==1
        assert all(after.count('"'+id+'"')>=1 for id in REQUIRED_IDS),"Missing original profile row"
        assert after.count('openSub("الملف الشخصي",hub,"main");')==1
        assert after.count('openSub(label.replace(/^[^ ]+ /,""),group,"profile");')==1
        assert 'group.append(note);' in after and 'missing.length' in after
        assert 'localStorage.removeItem(PROFILE_DISPLAY_NAME_KEY)' in after
        assert 'profileBackupRestore(' in after
        assert 'profileBackupSave("manual",false)' in after
        assert 'privacyView()' in after and 'aoqatQuranReaderV1' in after
        assert 'cardsAndLockBackButton(sub,true); sub.classList.add("open");' in new
        assert 'future views.sub.classList.add("open");' not in new
        assert new.count("function profileView(){")==1
        assets[name]=new.encode("utf-8")
    hashes={name:sha(value) for name,value in assets.items()}
    assert set(hashes)==set(prior["files"])
    assert {name for name in hashes if hashes[name]!=prior["files"][name]}==CHANGED
    mod=signer()
    assert all(mod.allowed(name) and len(value)<=mod.MAX_FILE for name,value in assets.items())
    assert sum(map(len,assets.values()))<=mod.MAX_TOTAL
    return prior,assets,hashes

def candidate(destination):
    prior,assets,hashes=prepare()
    destination.mkdir(parents=True,exist_ok=True)
    target=destination/"AOQAT-OWNER-PILOT-OTA-SEQ19-UNSIGNED.zip"
    with zipfile.ZipFile(target,"w",zipfile.ZIP_DEFLATED) as z:
        for name,content in sorted(assets.items()):z.writestr(name,content)
    (destination/"previous-seq18-manifest.json").write_bytes(show("manifest.json"))
    (destination/"candidate.sha256").write_text(sha(target.read_bytes())+"  "+target.name+"\n")
    for name in CHANGED:(destination/("check-"+name.split("/")[-1])).write_bytes(assets[name])
    print("PASS: 88 paths intact, profile-only DOM grouping, exactly two JS assets changed; UNSIGNED")

def publish(destination):
    mod=signer()
    assert mod.PINNED_PUBLIC_KEY_SPKI==PIN
    _,assets,hashes=prepare()
    proof=json.loads(PROOF.read_text(encoding="utf-8"),object_pairs_hook=no_dupes)
    assert set(proof)=={"nativeBuild","sequence","channel","expiresAt","revision","signature"}
    assert (proof["nativeBuild"],proof["sequence"],proof["channel"])==(150,19,"owner-pilot")
    assert type(proof["expiresAt"]) is int and int(time.time()*1000)+300000<proof["expiresAt"]<int(time.time()*1000)+15*86400000
    manifest={**proof,"files":hashes}
    canonical="\n".join(name+":"+hashes[name] for name in sorted(hashes))
    assert manifest["revision"]==sha(canonical.encode()),"Candidate differs from signed proof"
    source=(HERE/"android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    match=re.search(r'PILOT_SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"',source)
    assert match
    der=base64.b64decode(match.group(1),validate=True)
    assert sha(der)==PIN
    with tempfile.TemporaryDirectory(prefix="aoqat-profile19-") as tmp:
        pub=Path(tmp)/"pilot-public.pem"
        pub.write_bytes(subprocess.check_output(["openssl","pkey","-pubin","-inform","DER","-outform","PEM"],input=der))
        mod.verify_signature(manifest,pub)
    dst=destination/ROOT
    assert not dst.exists()
    dst.mkdir(parents=True)
    (dst/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    for name in CHANGED:
        p=dst/"files"/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(assets[name])
        assert sha(p.read_bytes())==hashes[name]
    print("PASS: original pilot signing certificate; only manifest and two profile JS assets staged")
    print("PASS: production, APK, Quran pages, prayer schedule, and admin unchanged")

if __name__=="__main__":
    import argparse
    parser=argparse.ArgumentParser()
    parser.add_argument("--candidate-dir",type=Path)
    parser.add_argument("--verify-output",type=Path)
    args=parser.parse_args()
    if bool(args.candidate_dir)==bool(args.verify_output):parser.error("Choose exactly one mode")
    if args.candidate_dir:candidate(args.candidate_dir)
    else:publish(args.verify_output)
