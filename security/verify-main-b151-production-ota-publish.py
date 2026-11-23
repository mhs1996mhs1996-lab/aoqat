#!/usr/bin/env python3
"""Fail-closed AOQAT 2.13/B151 production OTA release gate.

This ONLY accepts an owner-signed PUBLIC manifest verified with the original
production pinned key, and EXACTLY the approved B151 web files produced from
the signed owner-pilot sequence 22 source. Never handles signing secrets.
Never changes native code, Quran, prayer source files, profile or backups.
It emits a staging folder only; the CI workflow publishes after verification.
"""
from __future__ import annotations
import base64,hashlib,importlib.util,json,sys,time
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
PUBLISH_PROOF=ROOT/"security/main-b151-production-ota-signed-public.json"
SOURCE=ROOT/"android-native/prepare-production-b151.py"
PUBLIC=ROOT/"security/aoqat-update-public-v2.pem"
EXPECTED_PUB_SPKI_SHA256="8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
ALLOW_KEYS={"nativeBuild","sequence","expiresAt","revision","files","signature"}

def no_duplicate(pairs):
    out={}
    for k,v in pairs:
        if k in out:raise ValueError("Duplicate signed manifest key")
        out[k]=v
    return out

def sha(bytes_):
    return hashlib.sha256(bytes_).hexdigest()

def main(dest:Path):
    if dest.exists():raise RuntimeError("Release output directory must not exist")
    if not PUBLISH_PROOF.is_file():raise RuntimeError("Missing owner's signed public approval")
    manifest=json.loads(PUBLISH_PROOF.read_text(),object_pairs_hook=no_duplicate)
    if set(manifest)!=ALLOW_KEYS:raise RuntimeError("Production manifest schema differs from native")
    if (type(manifest["nativeBuild"])!=int or manifest["nativeBuild"]!=151 or
        type(manifest["sequence"])!=int or manifest["sequence"]!=1):
        raise RuntimeError("Wrong main APK build or OTA sequence")
    exp=manifest["expiresAt"]
    now=int(time.time()*1000)
    if type(exp)!=int or not (now+300000<exp<now+10*86400000):
        raise RuntimeError("Signed manifest expired or not within approved window")
    sp=importlib.util.spec_from_file_location("production_b151",SOURCE)
    production=importlib.util.module_from_spec(sp)
    sp.loader.exec_module(production)
    original=production.verify_approved_pilot()
    approved={}
    for name,data in original.items():
        approved[name]=production.produce_release_ui(data) if name in (
            "js/web-menu-order.js","js/apk-startup-bundle.js") else data
    digests={name:sha(data) for name,data in approved.items()}
    if len(digests)!=88 or manifest["files"]!=digests:
        raise RuntimeError("Owner signature does not match approved 88-file main B151 snapshot")
    rev=sha("\n".join(f"{k}:{digests[k]}" for k in sorted(digests)).encode())
    if manifest["revision"]!=rev:raise RuntimeError("Signed revision mismatch")
    index=approved["index.html"]
    if "manifest.json" in digests or "channel" in manifest:raise RuntimeError("Untrusted channel schema")
    for name in ("js/web-menu-order.js","js/apk-startup-bundle.js"):
        b=approved[name]
        for value in (b"const PILOT_OTA_APK=false;",b"aoqatPrivacyWelcomeSeenV1",
                      b"aoqatProfileBackupDownload",b"aoqatLockScreenNotificationTextStyle"):
            if value not in b:raise RuntimeError("Incomplete production baseline")
        for old in (production.PILOT_ABOUT.encode(),production.PILOT_ABOUT_ACTION.encode()):
            if old in b:raise RuntimeError("Pilot label or behavior leaked into production")
    signing=ROOT/"security/signed-update-manifest.py"
    signedSpec=importlib.util.spec_from_file_location("main_sig",signing)
    signer=importlib.util.module_from_spec(signedSpec)
    signedSpec.loader.exec_module(signer)
    import subprocess,tempfile
    der=subprocess.check_output(["openssl","pkey","-pubin","-in",str(PUBLIC),"-outform","DER"])
    if sha(der)!=EXPECTED_PUB_SPKI_SHA256:raise RuntimeError("Wrong production verification key")
    signer.verify(manifest,PUBLIC,expected_build=151,min_sequence=0,now_ms=now)
    base=dest/"android-updates/production/build-151"
    for name,data in sorted(approved.items()):
        out=base/"files"/name
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_bytes(data)
    (base/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")))
    assert {p.relative_to(base/"files").as_posix() for p in (base/"files").rglob("*") if p.is_file()}==set(digests)
    print("PASS: production signature and expiry, pinned B151 build, exact 88 checked files")
    print("PASS: original splash/Quran/prayer data unchanged; no pilot controls or secrets")
    print("STAGED: owner-reviewed B151 manifest and web-only assets for isolated production feed")

if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("Usage: verify-main-b151-production-ota-publish.py OUTPUT_DIR")
    main(Path(sys.argv[1]))
