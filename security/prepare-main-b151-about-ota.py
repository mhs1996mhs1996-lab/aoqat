#!/usr/bin/env python3
"""Stage a production-only, UNSIGNED B151 OTA snapshot for owner signing.

Do not publish unsigned manifest. This stages the exact approved B151 UI and
verifies it does not expose the owner-pilot controls, labels or private keys.
Production signing is separate from the pilot signing and must be owner-authorized.
"""
import hashlib, importlib.util, json, re, sys, time, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILDER = ROOT / "android-native/prepare-production-b151.py"
MANIFEST_TOOL = ROOT / "security/signed-update-manifest.py"
PINNED_PROD_PUB = ROOT / "security/aoqat-update-public-v2.pem"
STATE = Path("android-updates/production/build-151")
SEQ = 1

def sha(b): return hashlib.sha256(b).hexdigest()

def main():
    if len(sys.argv)!=2: raise SystemExit("usage: prepare-main-b151-about-ota.py OUTPUT_DIR")
    target=Path(sys.argv[1]).resolve()
    assert not target.exists(), "Choose a fresh output directory"
    import subprocess
    pub_pin="8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
    der=subprocess.run(["openssl","pkey","-pubin","-in",str(PINNED_PROD_PUB),"-outform","DER"],capture_output=True,check=True).stdout
    assert sha(der)==pub_pin,"Wrong production public signing key"
    check=importlib.util.spec_from_file_location("release",BUILDER)
    release=importlib.util.module_from_spec(check);check.loader.exec_module(release)
    approved=release.verify_approved_pilot()
    contents={}
    for name,data in sorted(approved.items()):
        contents[name]=(release.produce_release_ui(data)
                        if name in ("js/web-menu-order.js","js/apk-startup-bundle.js")
                        else data)
    assert len(contents)==88 and "index.html" in contents
    for name in ("js/web-menu-order.js","js/apk-startup-bundle.js"):
        ui=contents[name].decode("utf-8")
        assert "النسخة الرئيسية 2.13 (بناء 151)" in ui
        assert "النسخة الرئيسية تستقبل تحديثات OTA الآمنة" in ui
        assert "التجريبي 2.12 (بناء 150)" not in ui
        assert "النسخة التجريبية تستقبل تحديثات OTA الموقّعة" not in ui
        assert "const PILOT_OTA_APK=false;" in ui
        assert "aoqatProfileBackupDownload" in ui
        assert "aoqatLockScreenNotificationTextStyle" in ui
    native=(ROOT/"android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    assert 'build >= 151' in native and 'production-ota' in native
    assert "SIGNING_PUBLIC_KEY_B64" in native and "PILOT_SIGNING_PUBLIC_KEY_B64" in native
    hashes={n:sha(data) for n,data in contents.items()}
    canonical="\n".join(f"{n}:{hashes[n]}" for n in sorted(hashes))
    revision=sha(canonical.encode())
    manifest={
        "nativeBuild":151, "sequence":SEQ,
        "expiresAt":int(time.time()*1000)+10*86400000,
        "revision":revision, "files":hashes
    }
    signed_tool=importlib.util.spec_from_file_location("manifest_signer",MANIFEST_TOOL)
    signer=importlib.util.module_from_spec(signed_tool);signed_tool.loader.exec_module(signer)
    assert signer.payload(manifest)
    assert "channel" not in manifest and "signature" not in manifest
    target.mkdir()
    feed=target/STATE
    (feed/"files").mkdir(parents=True)
    for name,data in contents.items():
        p=feed/"files"/name
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_bytes(data)
    unsigned=feed/"manifest-UNSIGNED.json"
    unsigned.write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    (target/"revision.sha256").write_text(revision+"\n")
    (target/"PRODUCTION-OTA-HOLD.txt").write_text(
        "STOP: UNSIGNED B151 OWNER REVIEW CANDIDATE ONLY\n"
        "Do NOT publish the feed or install this as APK.\n"
        "1. Verify signed 2.13 (151) APK and original main APK certificate on phone.\n"
        "2. With the owner's encrypted V2 production OTA PEM and private passphrase,\n"
        "   sign manifest-UNSIGNED.json using security/signed-update-manifest.py.\n"
        "3. Verify signed manifest against security/aoqat-update-public-v2.pem,\n"
        "   require nativeBuild=151, sequence=1, all 88 file hashes and revision.\n"
        "4. Publish ONLY after the owner accepts the exact signed digest.\n"
        "5. Never use owner-pilot private key, expose passwords, or modify app data.\n")
    with zipfile.ZipFile(target/"AOQAT-PRODUCTION-151-ABOUT-UNSIGNED-OTA.zip","w",zipfile.ZIP_DEFLATED) as archive:
        for p in sorted(feed.rglob("*")):
            if p.is_file():archive.write(p,p.relative_to(target))
    print("PASS: isolated 88-file production 151 OTA candidate; main About + privacy + backup + lock features checked")
    print("PASS: production public-key pin; no pilot label; signing required; not published")

if __name__=="__main__":
    main()
