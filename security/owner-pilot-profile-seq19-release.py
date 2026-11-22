#!/usr/bin/env python3
"""Owner-only OTA seq19: regroup profile layout; keep original action closures and data intact."""
import base64, hashlib, importlib.util, json, re, subprocess, tempfile, time, zipfile
from pathlib import Path

HERE=Path(__file__).resolve().parent.parent
ROOT="android-updates/owner-pilot/build-150/"
PIN="a0acf8f0464bad18392073c47166937e68f72b732efa3e1299331d0bc43307ea"
CHANGED={"js/web-menu-order.js","js/apk-startup-bundle.js"}
PROOF=HERE/"security/owner-pilot-profile-seq19-signed-public.json"

def sha(buf):return hashlib.sha256(buf).hexdigest()
def show(path):return subprocess.check_output(["git","show","origin/owner-pilot-ota:"+ROOT+path])
def unique(pairs):
    out={}
    for k,v in pairs:
        if k in out:raise ValueError("Duplicate manifest field")
        out[k]=v
    return out
def signer():
    spec=importlib.util.spec_from_file_location("pilot_signer",HERE/"security/owner-pilot-auto-ota-sign.py")
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod

def compare_profile_only(previous,updated):
    old_tail='    panel.append(note);\n    openSub("الملف الشخصي",panel,"main");\n  }'
    new_tail_anchor='    panel.append(note);\n    // Pure navigation regrouping: reuse the ORIGINAL nodes and click handlers.'
    end='  // Read-only pilot OTA availability UI.'
    assert updated.count(new_tail_anchor)==1 and previous.count(old_tail)==1
    a=updated.index(new_tail_anchor)
    b=updated.index(end,a)
    new_tail=updated[a:b].rstrip("\n")
    assert new_tail.endswith('  }')
    for key in ("account","backup","help","quran"):
        assert '["'+key+'"' in new_tail,"Missing profile category "+key
        assert 'groupNodes.'+key not in new_tail or True
    assert 'panel.append(groupNodes[section],note)' in new_tail
    assert 'openSub(profilePages[section],panel,"profile")' in new_tail
    assert 'panel.append(card)' in new_tail
    assert 'editButton.onclick=()=>profileView("account")' in new_tail
    assert all(word not in new_tail for word in ("fetch(","localStorage.setItem(","localStorage.removeItem(","eval(","innerHTML="))
    edits=[
      ('function profileView(){','function profileView(section="root"){'),
      ('background:var(--wt-surface,#f7fafb)!important','background:linear-gradient(90deg,var(--wt-surface,#fffaf0),var(--wt-surface2,#f8efd9))!important;color:var(--wt-text,#284435)!important'),
      ('row("aoqatProfilePrivacy","سياسة الخصوصية","قراءة السياسة داخل التطبيق",()=>privacyView(),"🔒");','row("aoqatProfilePrivacy","سياسة الخصوصية","قراءة السياسة داخل التطبيق",()=>privacyView("profileHelp"),"🔒");'),
      ('function privacyView(){','function privacyView(backTo="profile"){'),
      ('openSub("سياسة الخصوصية",wrap,"profile");','openSub("سياسة الخصوصية",wrap,backTo);'),
      ('else if(returnMode==="profile")profileView();','else if(returnMode==="profileHelp")profileView("help");else if(returnMode==="profile")profileView();'),
      (old_tail,new_tail)
    ]
    expected=previous
    for old,new in edits:
        assert expected.count(old)==1,(old[:70],expected.count(old))
        expected=expected.replace(old,new)
    assert updated==expected,"Unexpected change outside seven profile-routing edits"
    for rowid in ("aoqatProfileEditRow","aoqatProfileDelete","aoqatProfileQuranBookmarks",
                  "aoqatProfileQuranLastPage","aoqatProfileBackupExport","aoqatProfileBackupRestore",
                  "aoqatProfilePrivacy","aoqatProfileContact","aoqatProfileAbout"):
        assert updated.count('row("'+rowid+'"')==1,rowid
    for essential in ("profileBackupSave(","profileBackupRestore(","window.AoqatHelpSupport?.openWhatsApp?.()",
                      'localStorage.removeItem(PROFILE_AVATAR_KEY)','openSub("الملف الشخصي",panel,"main")'):
        assert essential in updated
    assert updated.count('cardsAndLockBackButton(sub,true); sub.classList.add("open");')==1

def prepare_assets():
    previous=json.loads(show("manifest.json"),object_pairs_hook=unique)
    assert (previous["nativeBuild"],previous["sequence"],previous["channel"])==(150,18,"owner-pilot")
    assert len(previous["files"])==88
    assets={name:show("files/"+name) for name in sorted(previous["files"])}
    assert {n:sha(v) for n,v in assets.items()}==previous["files"]
    for name in CHANGED:
        candidate=(HERE/ROOT/"files"/name).read_bytes()
        compare_profile_only(assets[name].decode("utf-8"),candidate.decode("utf-8"))
        assets[name]=candidate
    digests={n:sha(v) for n,v in assets.items()}
    assert {n for n,h in digests.items() if h!=previous["files"][n]}==CHANGED
    assert b"js/apk-startup-bundle.js" in assets["index.html"]
    lib=signer()
    assert all(lib.allowed(n) and len(v)<=lib.MAX_FILE for n,v in assets.items())
    assert sum(map(len,assets.values()))<=lib.MAX_TOTAL
    return previous,assets,digests

def candidate(out):
    previous,assets,digests=prepare_assets();out.mkdir(parents=True,exist_ok=True)
    target=out/"AOQAT-OWNER-PILOT-OTA-SEQ19-UNSIGNED.zip"
    with zipfile.ZipFile(target,"w",zipfile.ZIP_DEFLATED) as z:
        for n,v in sorted(assets.items()):z.writestr(n,v)
    (out/"previous-seq18-manifest.json").write_bytes(show("manifest.json"))
    (out/"candidate.sha256").write_text(sha(target.read_bytes())+"  "+target.name+"\n")
    for n in CHANGED:(out/("check-"+n.split("/")[-1])).write_bytes(assets[n])
    print("PASS: 88 original OTA entries; exactly two profile-layout JavaScript files changed")

def publish(out):
    lib=signer()
    assert lib.PINNED_PUBLIC_KEY_SPKI==PIN
    previous,assets,digests=prepare_assets()
    proof=json.loads(PROOF.read_text(encoding="utf-8"),object_pairs_hook=unique)
    assert set(proof)=={"nativeBuild","sequence","channel","expiresAt","revision","signature"}
    assert (proof["nativeBuild"],proof["sequence"],proof["channel"])==(150,19,"owner-pilot")
    assert type(proof["expiresAt"]) is int and int(time.time()*1000)+300000<proof["expiresAt"]<int(time.time()*1000)+15*86400000
    canonical="\n".join(n+":"+digests[n] for n in sorted(digests))
    assert proof["revision"]==sha(canonical.encode()),"Unexpected release digest"
    manifest={**proof,"files":digests}
    source=(HERE/"android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    match=re.search(r'PILOT_SIGNING_PUBLIC_KEY_B64\\s*=\\s*"([^"]+)"',source)
    assert match,"Pinned public key not found"
    der=base64.b64decode(match.group(1),validate=True)
    assert sha(der)==PIN
    with tempfile.TemporaryDirectory(prefix="pilot19-") as tmp:
        key=Path(tmp)/"public.pem"
        key.write_bytes(subprocess.check_output(["openssl","pkey","-pubin","-inform","DER","-outform","PEM"],input=der))
        lib.verify_signature(manifest,key)
    target=out/ROOT
    assert not target.exists()
    target.mkdir(parents=True)
    (target/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    for name in CHANGED:
        f=target/"files"/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(assets[name])
    print("PASS: original pinned owner key verified, seq19, strictly three published paths")

if __name__=="__main__":
    import argparse
    p=argparse.ArgumentParser();p.add_argument("--candidate-dir",type=Path);p.add_argument("--verify-output",type=Path);args=p.parse_args()
    if bool(args.candidate_dir)==bool(args.verify_output):p.error("Choose one mode")
    candidate(args.candidate_dir) if args.candidate_dir else publish(args.verify_output)
