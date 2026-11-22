#!/usr/bin/env python3
"""Verify existing-key ownerPilot seq20 signed proof; export ONLY approved public paths."""
import base64, hashlib, importlib.util, json, re, subprocess, tempfile, time
from pathlib import Path
import argparse

ROOT=Path("android-updates/owner-pilot/build-150")
PREV="origin/owner-pilot-ota"
PIN="a0acf8f0464bad18392073c47166937e68f72b732efa3e1299331d0bc43307ea"
CHANGED={"js/web-menu-order.js","js/apk-startup-bundle.js"}
PROOF=Path("security/owner-pilot-light-buttons-seq20-signed-public.json")
OLD="box-sizing:border-box!important;display:flex!important;align-items:center!important;gap:7px!important;min-height:42px!important;height:auto!important;padding:6px 9px!important;margin:3px 0!important;border-radius:8px!important;border:1px solid var(--wt-border,#c7d8df)!important;background:linear-gradient(90deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9))!important;color:var(--wt-text,#284435)!important;box-shadow:none!important;text-align:right!important;line-height:1.25!important;text-shadow:none!important"
NEW="box-sizing:border-box!important;display:flex!important;align-items:center!important;gap:7px!important;min-height:48px!important;height:auto!important;padding:9px 12px!important;margin:4px 0!important;border-radius:9px!important;border:1px solid #d1b981!important;background:linear-gradient(90deg,#fffdf7 0%,#f7ebce 100%)!important;color:#4b3924!important;box-shadow:none!important;text-align:right!important;line-height:1.35!important;text-shadow:none!important"

def sha(data):
    return hashlib.sha256(data).hexdigest()

def show(rel):
    return subprocess.check_output(["git","show",PREV+":"+str(ROOT/rel)])

def unique(pairs):
    obj={}
    for name,val in pairs:
        if name in obj:
            raise ValueError("duplicate signed manifest entry")
        obj[name]=val
    return obj

def prepare(out):
    spec=importlib.util.spec_from_file_location("pilot_signer",Path("security/owner-pilot-auto-ota-sign.py"))
    lib=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(lib)
    assert lib.PINNED_PUBLIC_KEY_SPKI==PIN
    previous=json.loads(show("manifest.json"),object_pairs_hook=unique)
    assert (previous["nativeBuild"],previous["channel"],previous["sequence"])==(150,"owner-pilot",19)
    assert len(previous["files"])==88
    src=Path("android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    match=re.search(r'PILOT_SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"',src)
    assert match, "pilot native pinned key missing"
    der=base64.b64decode(match.group(1),validate=True)
    assert sha(der)==PIN, "pilot pinned key mismatch"
    with tempfile.TemporaryDirectory(prefix="aoqat-public-key-") as temp:
        public=Path(temp)/"pilot-public.pem"
        public.write_bytes(subprocess.check_output(["openssl","pkey","-pubin","-inform","DER","-outform","PEM"],input=der))
        lib.verify_signature(previous,public)
        hashes={}
        for name in sorted(previous["files"]):
            old=show("files/"+name)
            assert sha(old)==previous["files"][name], ("previous signed asset changed",name)
            current=(ROOT/"files"/name).read_bytes()
            if name in CHANGED:
                original=old.decode("utf-8")
                assert original.count(OLD)==1 and original.count("aoqatPilotProfileCompactV6")==2,name
                expected=original.replace(OLD,NEW).replace("aoqatPilotProfileCompactV6","aoqatPilotProfileLightV7")
                assert current==expected.encode("utf-8"), ("unapproved difference",name)
                assert current.count(b"aoqatProfileGroup-")>=1
            else:
                assert current==old, ("unapproved asset difference",name)
            hashes[name]=sha(current)
        assert {name for name,d in hashes.items() if d!=previous["files"][name]}==CHANGED
        assert len(hashes)==len(previous["files"])
        assert all(lib.allowed(name) for name in hashes)
        canonical="\n".join(name+":"+hashes[name] for name in sorted(hashes))
        proof=json.loads(PROOF.read_text(),object_pairs_hook=unique)
        assert set(proof)=={"nativeBuild","sequence","channel","expiresAt","revision","signature"}
        assert (proof["nativeBuild"],proof["sequence"],proof["channel"])==(150,20,"owner-pilot")
        now=int(time.time()*1000)
        assert type(proof["expiresAt"]) is int and now+5*60000<proof["expiresAt"]<=now+15*86400000
        assert proof["revision"]==sha(canonical.encode()),"signed revision did not match code"
        result={**proof,"files":hashes}
        lib.verify_signature(result,public)
    assert not out.exists(),"refuse overwrite"
    target=out/ROOT
    target.mkdir(parents=True)
    (target/"manifest.json").write_text(json.dumps(result,ensure_ascii=False,separators=(",",":")))
    for name in CHANGED:
        dest=target/"files"/name
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_bytes((ROOT/"files"/name).read_bytes())
    print("PASS: old seq19 signature verified; seq20 proof verified with pinned P-256 key; exactly 2 owner-pilot JS changed, no native or main content")

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--verify-output",required=True,type=Path)
    a=p.parse_args()
    prepare(a.verify_output)
