#!/usr/bin/env python3
"""AOQAT owner-only OTA V2 build 150 / sequence 4: isolated profile buttons.

Only the owner's Termux signs, using existing encrypted OTA V2 private PEM.
Never use this on a build pipeline to sign, never deploy to users.
--preview: produces NON-INSTALLABLE unsigned review ZIP; no private key.
--owner-stage: verifies old signed seq3 and writes owner-signed ZIP for local
              ownerPilot PHONE test. No upload, no network, no publishing.
--self-test: uses disposable generated P-256 keys only.
"""
from __future__ import annotations
import argparse
import base64
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import time
import zipfile

BUILD = 150
SEQUENCE = 4
DOMAIN = "AOQAT-WEB-UPDATE-SIGNATURE-V1"
OLD_REVISION = "98554724ebce6ab736e7c5309a136201eb2e6e52fc78085aec6585993e191d8a"
OLD_INDEX_SHA256 = "9cc9ba4313ad9df1ece2142b1a19dafb5bb81591483b3d0aa51b077351e65658"
PUBLIC_SPKI_SHA256 = "8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
ROOT = "android-updates/build-150/"
MANIFEST_NAME = ROOT + "manifest.json"
INDEX_NAME = ROOT + "files/index.html"
DOWNLOADS = Path.home() / "storage" / "downloads"
KEYS = Path.home() / "aoqat-keys"
DEFAULT_SOURCE = DOWNLOADS / "owner-b150-approved-seq3-signed-smoke-test.zip"
MARKER = "AOQAT_OWNER_PILOT_SEQ4_PROFILE_BUTTONS_V1"

# A single exact, scoped modification to the pre-existing profile handler.
# It does not touch prayer-data, Quran, notification services or settings.
OLD = """      panel.dir = 'rtl';
      nav.sub('الملف الشخصي', panel, 'main');"""
NEW = """      panel.dir = 'rtl';
      /* AOQAT_OWNER_PILOT_SEQ4_PROFILE_BUTTONS_V1: local visual test only. */
      const group = document.createElement('div');
      group.id = 'aoqatOwnerSeq4Buttons';
      group.setAttribute('aria-label', 'أزرار الاختبار المؤقتة');
      group.style.cssText = 'display:grid;gap:8px;padding:12px 0;max-width:460px';
      const note = document.createElement('p');
      note.textContent = 'اختبار وصول OTA رقم 4 — للمالك فقط؛ لا يجمع بيانات.';
      note.style.cssText = 'font-size:15px;margin:2px 0;color:inherit';
      const result = document.createElement('p');
      result.id = 'aoqatOwnerSeq4Result';
      result.textContent = 'لم تضغط أي زر اختبار بعد.';
      result.setAttribute('role', 'status');
      result.style.cssText = 'padding:9px;border-radius:8px;border:1px solid #8ca6a0;font-size:15px';
      let count = 0;
      function addButton(label, action) {
        const control = document.createElement('button');
        control.type = 'button';
        control.textContent = label;
        control.style.cssText = 'min-height:39px;max-width:100%;padding:7px 12px;border-radius:9px;border:1px solid #779f96;background:#e7f4ef;color:#174536;font-size:15px';
        control.addEventListener('click', action);
        group.append(control);
      }
      addButton('✓ فحص وصول التحديث رقم 4', function () {
        result.textContent = 'نجح ظهور تحديث الاختبار رقم 4 على هذا الهاتف.';
      });
      addButton('+ زيادة عداد الاختبار', function () {
        count += 1;
        result.textContent = 'عداد الاختبار فقط: ' + count;
      });
      addButton('↺ تصفير عداد الاختبار', function () {
        count = 0;
        result.textContent = 'عداد الاختبار فقط: 0';
      });
      panel.append(note, group, result);
      nav.sub('الملف الشخصي', panel, 'main');"""

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def run(*args: str, input_bytes: bytes | None = None,
        pass_fds: tuple[int, ...] = ()) -> bytes:
    p = subprocess.run(args, input=input_bytes, stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, check=False, pass_fds=pass_fds)
    if p.returncode:
        raise ValueError("OpenSSL verification or signing refused the material")
    return p.stdout

def public_fingerprint(pub: Path) -> str:
    return sha(run("openssl", "pkey", "-pubin", "-in", str(pub), "-outform", "DER"))

def payload(m: dict) -> bytes:
    if not all(type(m.get(k)) is int and m[k] > 0 for k in
               ("nativeBuild", "sequence", "expiresAt")):
        raise ValueError("Invalid native build / sequence / expiry fields")
    if m["nativeBuild"] != BUILD:
        raise ValueError("Wrong Android APK build")
    files = m.get("files")
    if not isinstance(files, dict) or set(files) != {"index.html"}:
        raise ValueError("Only index.html may change in this visual test")
    if not re.fullmatch("[0-9a-f]{64}", files["index.html"]):
        raise ValueError("Bad index checksum")
    canonical = "index.html:" + files["index.html"]
    if m.get("revision") != sha(canonical.encode("utf-8")):
        raise ValueError("Manifest revision does not match content")
    return "\n".join([DOMAIN, str(m["nativeBuild"]), str(m["sequence"]),
                      str(m["expiresAt"]), m["revision"], canonical]).encode("utf-8")

def verify_signature(m: dict, pub: Path) -> None:
    try:
        signature = base64.b64decode(m["signature"], validate=True)
    except (KeyError, ValueError) as err:
        raise ValueError("Missing or invalid publisher signature") from err
    with tempfile.TemporaryDirectory(prefix="aoqat-ota-verify-") as folder:
        root = Path(folder)
        (root / "payload").write_bytes(payload(m))
        (root / "signature").write_bytes(signature)
        run("openssl", "dgst", "-sha256", "-verify", str(pub),
            "-signature", str(root / "signature"), str(root / "payload"))

def read_exact_seq3(source: Path, pub: Path) -> bytes:
    if not source.is_file():
        raise ValueError("Signed sequence-3 source ZIP was not found in Downloads")
    if public_fingerprint(pub) != PUBLIC_SPKI_SHA256:
        raise ValueError("This is not the pinned AOQAT OTA V2 PUBLIC key")
    with zipfile.ZipFile(source) as archive:
        items = archive.infolist()
        names = [entry.filename for entry in items]
        if len(items) != 2 or set(names) != {MANIFEST_NAME, INDEX_NAME}:
            raise ValueError("Expected exactly one signed manifest and one index.html")
        for entry in items:
            if entry.is_dir() or entry.file_size > 6 * 1024 * 1024 or (
                (entry.external_attr >> 16) & 0o170000
            ) == stat.S_IFLNK:
                raise ValueError("Unsafe or oversized archive member")
        old_json = archive.read(MANIFEST_NAME)
        old_html = archive.read(INDEX_NAME)
    old = json.loads(old_json)
    if (old.get("sequence") != 3 or old.get("revision") != OLD_REVISION or
            old.get("files") != {"index.html": OLD_INDEX_SHA256} or
            sha(old_html) != OLD_INDEX_SHA256):
        raise ValueError("Old sequence-3 signed content is not the reviewed baseline")
    if old["expiresAt"] <= int(time.time() * 1000):
        raise ValueError("Previous signed update has expired")
    verify_signature(old, pub)
    return old_html

def patch_profile(previous: bytes) -> bytes:
    if sha(previous) != OLD_INDEX_SHA256:
        raise ValueError("Wrong sequence-3 index.html")
    old, new = OLD.encode("utf-8"), NEW.encode("utf-8")
    if previous.count(old) != 1 or MARKER.encode("utf-8") in previous:
        raise ValueError("Profile anchor missing, duplicated or already modified")
    updated = previous.replace(old, new, 1)
    if (updated.count(MARKER.encode("utf-8")) != 1 or
            updated.replace(new, old, 1) != previous or
            len(updated) > 6 * 1024 * 1024):
        raise ValueError("Patch exceeded the reviewed profile-only scope")
    return updated

def manifest(index: bytes, now: int) -> dict:
    files = {"index.html": sha(index)}
    return {"nativeBuild": BUILD, "sequence": SEQUENCE,
            "expiresAt": now + 14 * 86400 * 1000,
            "revision": sha(("index.html:" + files["index.html"]).encode()),
            "files": files}

def sign(private: Path, body: bytes, password: str) -> bytes:
    # Private inherited FD: NOT command-line argument, env or stored file.
    reader, writer = os.pipe()
    try:
        try:
            os.write(writer, password.encode("utf-8") + b"\n")
        finally:
            os.close(writer)
        return run("openssl", "dgst", "-sha256", "-passin",
                   "fd:" + str(reader), "-sign", str(private),
                   input_bytes=body, pass_fds=(reader,))
    finally:
        os.close(reader)

def write_zip(destination: Path, m: dict, index: bytes) -> None:
    if destination.exists() or destination.is_symlink():
        raise ValueError("Output already exists; refusing to overwrite")
    # Exclusive create. No production channel path and no auto-deploy.
    with zipfile.ZipFile(destination, "x", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr(MANIFEST_NAME, json.dumps(m, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        z.writestr(INDEX_NAME, index)

def synthetic_self_test() -> None:
    # Test our diff/payload with disposable key. Never owner secrets in CI.
    sample = OLD_INDEX_SHA256
    assert len(sample) == 64 and "nav.sub('الملف الشخصي'" in NEW
    assert NEW.count("addButton(") == 4
    with tempfile.TemporaryDirectory(prefix="aoqat-ota-test-") as d:
        base = Path(d)
        private, pub = base / "fake.pem", base / "fake-public.pem"
        run("openssl", "ecparam", "-name", "prime256v1", "-genkey",
            "-noout", "-out", str(private))
        pub.write_bytes(run("openssl", "pkey", "-in", str(private), "-pubout"))
        m = manifest(b"synthetic", int(time.time() * 1000))
        m["signature"] = base64.b64encode(sign(private, payload(m), "")).decode("ascii")
        verify_signature(m, pub)
        for forged in (dict(m, sequence=5), dict(m, nativeBuild=149),
                       dict(m, revision="0"*64)):
            try:
                verify_signature(forged, pub)
            except ValueError:
                pass
            else:
                raise ValueError("An altered manifest passed signature testing")
    print("PASS: disposable-key signed manifest verifies; altered fields blocked")
    print("PASS: only locally created visual-test controls, no owner credentials")

def main() -> int:
    cli = argparse.ArgumentParser(description=__doc__)
    actions = cli.add_mutually_exclusive_group(required=True)
    actions.add_argument("--self-test", action="store_true")
    actions.add_argument("--preview", action="store_true")
    actions.add_argument("--owner-stage", action="store_true")
    cli.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    cli.add_argument("--public-key", type=Path, default=KEYS / "aoqat-update-public-v2.pem")
    cli.add_argument("--private-key", type=Path, default=KEYS / "aoqat-update-private-v2.pem")
    cli.add_argument("--output", type=Path)
    a = cli.parse_args()
    try:
        if a.self_test:
            synthetic_self_test()
            return 0
        old = read_exact_seq3(a.source, a.public_key)
        index = patch_profile(old)
        m = manifest(index, int(time.time() * 1000))
        print("PASS: previous owner-signed sequence 3 and publisher verified")
        print("PASS: profile-only 3-button patch; old index SHA256:", sha(old))
        print("REVIEW new index SHA256:", sha(index))
        if a.preview:
            destination = a.output or Path("AOQAT-B150-SEQ4-UNSIGNED-NOT-INSTALLABLE.zip")
            write_zip(destination, m, index)
            print("Unsigned review only; Android MUST reject this package:", destination)
            return 0
        if os.getenv("GITHUB_ACTIONS", "").lower() == "true":
            raise ValueError("Owner-only signing is forbidden in GitHub Actions")
        if not a.private_key.is_file():
            raise ValueError("Your existing encrypted OTA V2 private PEM is missing")
        print("Use OTA key password AOQAT-OTA-V2, NOT APK P12 or ADMIN P12.")
        pwd = getpass.getpass("OTA V2 key password (hidden): ")
        try:
            if not pwd:
                raise ValueError("OTA password cannot be empty")
            signature = sign(a.private_key, payload(m), pwd)
        finally:
            pwd = ""
        m["signature"] = base64.b64encode(signature).decode("ascii")
        verify_signature(m, a.public_key)
        if m["sequence"] != SEQUENCE or sha(index) != m["files"]["index.html"]:
            raise ValueError("Signed output not equal to local reviewed content")
        destination = a.output or DOWNLOADS / "AOQAT-B150-OWNER-SEQ4-SIGNED-TEST-ONLY.zip"
        write_zip(destination, m, index)
        print("PASS: owner-signed sequence 4 ZIP verified locally")
        print("FILE:", destination)
        print("SHA256:", sha(destination.read_bytes()))
        print("For isolated ownerPilot import ONLY. NO PUBLISH; no phones updated.")
        return 0
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile,
            subprocess.SubprocessError, json.JSONDecodeError) as err:
        print("BLOCKED:", str(err), file=sys.stderr)
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
