#!/usr/bin/env python3
"""Prepare an OWNER-SIGNED, NO-CHANGE, BUILD-149 OTA canary entirely offline.

This is NOT a publishing tool. It cannot deploy, update, install, or change
the Android application, GitHub repository, Vercel, prayer data or Quran.
The only payload is the same index.html already inside the owner's tested
V2-signed B149 APK. The owner keeps the encrypted update private key here.
"""
from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
from zipfile import ZipFile, ZIP_DEFLATED

APP_APK = "aoqat-b149-v2-qcf-uniform-signed.apk"
APP_SHA256 = "59581c9e229e69d36a7d4a71210af1951b647d5c3834c5ca1d64a4f89a2487f6"
APP_CERT = "9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765"
PUBLIC_SPKI = "8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
PRE_FLIGHT = "AOQAT-149-OTA-V2-Preflight.py"
CANARY = "AOQAT-149-OTA-V2-CANARY-PUBLIC-REVIEW"
TARGET_BUILD = 149
DOMAIN = "AOQAT-WEB-UPDATE-SIGNATURE-V1"

def fail(msg):
    raise ValueError(msg)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def canonical(manifest):
    files = manifest["files"]
    if sorted(files) != ["index.html"]:
        fail("Only original index.html is allowed in this no-change test")
    if manifest["nativeBuild"] != TARGET_BUILD or manifest["sequence"] != 1:
        fail("Canary build/sequence must be exactly 149/1")
    body = "\n".join(f"{name}:{files[name]}" for name in sorted(files))
    if manifest["revision"] != sha(body.encode("utf-8")):
        fail("Invalid canonical revision")
    return "\n".join([
        DOMAIN, str(TARGET_BUILD), str(manifest["sequence"]),
        str(manifest["expiresAt"]), manifest["revision"], body,
    ]).encode("utf-8")

def load_preflight(folder):
    target = folder / PRE_FLIGHT
    if not target.is_file():
        fail(f"Download the reviewed {PRE_FLIGHT} helper into Downloads")
    spec = importlib.util.spec_from_file_location("owner_preflight", target)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    if mod.BUILD != TARGET_BUILD or mod.EXPECTED_V2_PUBLIC_SHA256 != PUBLIC_SPKI:
        fail("OTA preflight build or pinned V2 publisher changed")
    return mod

def verify_apk(apk):
    if not apk.is_file() or sha(apk.read_bytes()) != APP_SHA256:
        fail("The EXACT owner-signed B149 APK is required; no other APK will be signed for")
    process = subprocess.run(
        ["apksigner","verify","--min-sdk-version","26",
         "--verbose","--print-certs",str(apk)],
        capture_output=True,text=True,check=False,
    )
    if process.returncode:
        fail("Owner APK signature is not valid for Android 8+")
    certs = set(x.replace(":","").lower() for x in re.findall(
        r"certificate SHA-256 digest:\s*([a-fA-F0-9:]+)",process.stdout))
    if certs != {APP_CERT}:
        fail("APK signing certificate is not exactly the owner's approved V2")
    with ZipFile(apk) as z:
        index = z.read("assets/www/index.html")
    if not index or len(index) > 6*1024*1024:
        fail("Bundled index.html is empty or oversized")
    return index

def self_test():
    sample=b"<!doctype html><title>LOCAL TEST</title>"
    digest=sha(sample)
    manifest={"nativeBuild":149,"sequence":1,"expiresAt":int(time.time()*1000)+86_400_000,
              "files":{"index.html":digest},
              "revision":sha(("index.html:"+digest).encode())}
    data=canonical(manifest)
    assert data.startswith((DOMAIN+"\n149\n1\n").encode())
    altered=dict(manifest,sequence=2)
    try:
        canonical(altered)
    except ValueError:
        pass
    else:
        fail("Build/sequence guard missing")
    with tempfile.TemporaryDirectory() as folder:
        root=Path(folder)
        private=root/"private.pem"
        public=root/"public.pem"
        subprocess.run(["openssl","genpkey","-algorithm","EC","-pkeyopt",
                        "ec_paramgen_curve:P-256","-out",str(private)],
                       check=True,capture_output=True)
        subprocess.run(["openssl","pkey","-in",str(private),"-pubout",
                        "-out",str(public)],check=True,capture_output=True)
        signature=subprocess.run(["openssl","dgst","-sha256",
                                  "-sign",str(private)],
                                 input=data,check=True,capture_output=True).stdout
        payload=root/"body"; sig=root/"signature"
        payload.write_bytes(data); sig.write_bytes(signature)
        checked=subprocess.run(["openssl","dgst","-sha256",
                                "-verify",str(public),
                                "-signature",str(sig),str(payload)],
                               capture_output=True,check=False)
        if checked.returncode or b"Verified OK" not in checked.stdout:
            fail("Synthetic signed canary verification failed")
    print("PASS: synthetic B149 OTA no-change canary, signature and scope")
    print("NO OWNER KEY READ; NO UPDATE PUBLISHED")

def prepare():
    home=Path.home()
    downloads=home/"storage/downloads"
    keydir=home/"aoqat-keys"
    apk=downloads/APP_APK
    output=downloads/CANARY
    private=keydir/"aoqat-update-private-v2.pem"
    public=keydir/"aoqat-update-public-v2.pem"
    if output.exists():
        fail("Review folder already exists, refusing overwrite: "+str(output))
    if not private.is_file() or not public.is_file():
        fail("Encrypted V2 update keypair is not present on this phone")
    mod=load_preflight(downloads)
    if sha(mod.public_der(public)) != PUBLIC_SPKI:
        fail("V2 public key does not match the one pinned in Android")
    index=verify_apk(apk)
    sequence=1
    expiration=int(time.time()*1000)+14*86400*1000
    content_hash=sha(index)
    files={"index.html":content_hash}
    revision=sha(("index.html:"+content_hash).encode("utf-8"))
    manifest={"nativeBuild":TARGET_BUILD,"sequence":sequence,
              "expiresAt":expiration,"revision":revision,"files":files}
    body=canonical(manifest)
    phrase=getpass.getpass("V2 UPDATE PEM passphrase (hidden; NOT APK P12): ")
    try:
        if not phrase: fail("Empty update key password")
        signature=mod.sign(private,body,phrase)
    finally:
        phrase=None
    if not mod.cryptographically_valid(public,body,signature):
        fail("Signature did not verify against owner V2 public key")
    manifest["signature"]=base64.b64encode(signature).decode("ascii")
    # Verify after serializing, to catch encoding/canonical drift.
    normalized=json.loads(json.dumps(manifest,ensure_ascii=False))
    if canonical(normalized)!=body:
        fail("Canonical signing manifest changed on serialization")
    for field in ("nativeBuild","sequence","expiresAt","files"):
        bad=dict(normalized)
        bad[field] = 150 if field=="nativeBuild" else 2 if field=="sequence" else 1 if field=="expiresAt" else {"index.html":"0"*64}
        try:
            bad_body=canonical(bad)
        except ValueError:
            continue
        if mod.cryptographically_valid(public,bad_body,signature):
            fail("Tampered "+field+" accepted")
    output.mkdir(mode=0o700)
    try:
        files_dir=output/"files"
        files_dir.mkdir()
        (files_dir/"index.html").write_bytes(index)
        (output/"manifest.json").write_text(json.dumps(normalized,separators=(",",":")),encoding="utf-8")
        (output/"README.txt").write_text(
            "PUBLIC REVIEW CANARY ONLY; DO NOT DEPLOY.\n"
            "Native build 149; signed with owner V2 ECDSA key.\n"
            "The index.html payload is byte-for-byte identical to owner-signed APK.\n"
            "Quran, prayer data, and all other application files are absent.\n"
            "Owner private signing keys and passwords are NOT included.\n"
            "Release gate: owner review, independent CI, explicit publish authorization.\n",
            encoding="utf-8")
        archive=downloads/(CANARY+".zip")
        if archive.exists(): fail("Review ZIP already exists; not overwriting")
        with ZipFile(archive,"w",ZIP_DEFLATED) as z:
            for name in ("manifest.json","files/index.html","README.txt"):
                z.write(output/name,arcname=name)
        print("PASS: signed V2 OTA manifest; build 149, sequence 1, 14-day validity")
        print("PASS: EXACT packaged index.html, no Quran/prayer files, no APK changes")
        print("PASS: public-key signature, tamper and package checks")
        print("PUBLIC-ONLY REVIEW ZIP:",archive)
        print("NO UPDATE DEPLOYED. DO NOT SEND PRIVATE PEM, PASSWORD OR P12.")
    except Exception:
        # Prevent partial output from being mistaken for a completed manifest.
        import shutil
        shutil.rmtree(output,ignore_errors=True)
        raise

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    options=parser.add_mutually_exclusive_group(required=True)
    options.add_argument("--self-test",action="store_true")
    options.add_argument("--owner-prepare",action="store_true")
    args=parser.parse_args()
    try:
        self_test() if args.self_test else prepare()
        return 0
    except (KeyError,OSError,ValueError,RuntimeError,subprocess.SubprocessError) as error:
        print("STOP:",str(error),file=sys.stderr)
        return 1

if __name__=="__main__":
    raise SystemExit(main())
