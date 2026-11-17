#!/usr/bin/env python3
"""Owner-local OFFLINE signed V2 OTA profile-button test for APK B150 (seq 2).

Changes ONLY index.html by appending a single isolated UI script. The script
adds 'الملف الشخصي' as the LAST row after WhatsApp in the existing main
settings drawer, and opens a small proof page. It does NOT modify the hosted
website, Quran, prayer data, APK binaries or user's saved settings.
Produces ONLY a public owner-signed review ZIP; never deploys or uploads.

--self-test: disposable EC keys only; for CI and local verification.
--owner-stage: verify signed B150 APK and encrypted *OTA* key, stage
               no-op update and sign it locally, then independently verify.
"""
from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import zipfile

BUILD = 150
DOMAIN = "AOQAT-WEB-UPDATE-SIGNATURE-V1"
APPROVED_APK_SHA256 = "eb3d615ed169819294d8e608a166883345be4b80a807a9d72bdff5cf70bf30b5"
APPROVED_APK_CERT_SHA256 = "9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765"
APPROVED_OTA_SPKI_SHA256 = "8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
MAX_INDEX = 6 * 1024 * 1024
EXPIRE_DAYS = 14
KEY_DIR = Path.home() / "aoqat-keys"
DOWNLOADS = Path.home() / "storage" / "downloads"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run(*command: str, data: bytes | None = None, pass_fds: tuple[int, ...] = ()) -> bytes:
    result = subprocess.run(command, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            pass_fds=pass_fds, check=False)
    if result.returncode != 0:
        raise ValueError("Local verification/signing command failed (no private material logged)")
    return result.stdout


def public_fingerprint(key: Path) -> str:
    value = key.read_text("ascii")
    lines = [s.strip() for s in value.splitlines() if s.strip()]
    if lines[0] != "-----BEGIN PUBLIC KEY-----" or lines[-1] != "-----END PUBLIC KEY-----":
        raise ValueError("Wrong OTA V2 PUBLIC KEY PEM")
    der = base64.b64decode("".join(lines[1:-1]), validate=True)
    return sha(der)


# Owner-approved profile tile is injected ONLY in the signed APK web update.
# The hosted website, its scripts and native APK remain byte-for-byte untouched.
ORIGINAL_B150_INDEX_SHA256 = "e9a045f8acf0fd6f66bfa6bbdd36dfb3a014a6474d700d840186f7fba682be1f"
PROFILE_INDEX_SHA256 = "86f2e701ba65a0cf2e0dcebe862ea15d77b64bfe08748136511798463936f75a"
PROFILE_JS = "/* AOQAT_OTA_PROFILE_PROOF_B150_SEQUENCE2: owner-requested isolated visual proof. */\n(function () {\n  'use strict';\n  if (!window.AndroidNative?.configureAdhan) return;\n  const TEST_ID = 'aoqatOtaB150ProfileProof';\n  function insertLast() {\n    const list = document.getElementById('webDrawerMain');\n    const nav = window.AoqatWebSettingsNavigation;\n    if (!list || !nav?.sub) return false;\n    if (document.getElementById(TEST_ID)) return true;\n    const button = document.createElement('button');\n    button.id = TEST_ID;\n    button.type = 'button';\n    button.className = 'web-drawer-row';\n    button.setAttribute('aria-label', 'الملف الشخصي — اختبار التحديث');\n    const icon = document.createElement('span');\n    icon.className = 'ico';\n    icon.setAttribute('aria-hidden', 'true');\n    icon.textContent = '👤';\n    const label = document.createElement('span');\n    label.className = 'txt';\n    label.textContent = 'الملف الشخصي';\n    button.append(icon, label);\n    button.addEventListener('click', function (event) {\n      event.preventDefault();\n      event.stopPropagation();\n      const panel = document.createElement('section');\n      panel.className = 'web-settings-list';\n      panel.dir = 'rtl';\n      const heading = document.createElement('h3');\n      heading.textContent = 'تم تفعيل تحديث OTA V2 التجريبي';\n      const description = document.createElement('p');\n      description.textContent = 'الإصدار 2.12 — البناء 150 — التحديث رقم 2. هذه صفحة اختبار فقط ولا تطلب بيانات شخصية.';\n      panel.append(heading, description);\n      nav.sub('الملف الشخصي', panel, 'main');\n    });\n    list.appendChild(button);\n    return true;\n  }\n  function start() {\n    if (insertLast()) return;\n    let attempts = 0;\n    const timer = setInterval(function () {\n      if (insertLast() || ++attempts >= 100) clearInterval(timer);\n    }, 150);\n  }\n  if (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', start, {once: true});\n  } else start();\n})();\n"

def profile_index(original: bytes, *, verify_base: bool = True) -> bytes:
    if verify_base and sha(original) != ORIGINAL_B150_INDEX_SHA256:
        raise ValueError("Original packaged B150 index is NOT the verified owner version")
    anchor = b"</body></html>"
    if original.count(anchor) != 1 or b"AOQAT_OTA_PROFILE_PROOF_B150_SEQUENCE2" in original:
        raise ValueError("Unsafe or duplicate profile patch refused")
    patched = original.replace(anchor, b"<script>\n" + PROFILE_JS.encode("utf-8") + b"</script>\n" + anchor)
    if verify_base and sha(patched) != PROFILE_INDEX_SHA256:
        raise ValueError("Modified profile HTML is not exact reviewed version")
    return patched


def make_manifest(content: bytes, sequence: int, at_ms: int) -> dict:
    if sequence != 2:
        raise ValueError("This isolated B150 profile pilot must use sequence 2 only")
    if not content or len(content) > MAX_INDEX or b"<head>" not in content:
        raise ValueError("Invalid/oversized offline APK index.html")
    files = {"index.html": sha(content)}
    canonical = "index.html:" + files["index.html"]
    return {
        "nativeBuild": BUILD,
        "sequence": sequence,
        "expiresAt": at_ms + EXPIRE_DAYS * 86400 * 1000,
        "revision": sha(canonical.encode("utf-8")),
        "files": files,
    }


def payload(m: dict) -> bytes:
    files = m["files"]
    if m["nativeBuild"] != BUILD or not (1 <= m["sequence"] <= 2**31-1):
        raise ValueError("Wrong build/sequence")
    if set(files) != {"index.html"} or not re.fullmatch(r"[0-9a-f]{64}", files["index.html"]):
        raise ValueError("Only the packaged original index.html is allowed")
    canonical = "index.html:" + files["index.html"]
    if m["revision"] != sha(canonical.encode("utf-8")):
        raise ValueError("Revision mismatch")
    return "\n".join((
        DOMAIN, str(BUILD), str(m["sequence"]), str(m["expiresAt"]),
        m["revision"], canonical
    )).encode("utf-8")


def sign_bytes(private: Path, body: bytes, passphrase: str | None) -> bytes:
    args = ["openssl", "dgst", "-sha256"]
    if passphrase is None:
        return run(*(args + ["-sign", str(private)]), data=body)
    read_fd, write_fd = os.pipe()
    try:
        try:
            # OpenSSL reads via a PRIVATE, inherited FD. No passphrase in
            # argv, shell history, environment variables, files or GitHub.
            os.write(write_fd, passphrase.encode("utf-8") + b"\n")
        finally:
            os.close(write_fd)
        return run(*(args + ["-passin", "fd:" + str(read_fd), "-sign", str(private)]),
                   data=body, pass_fds=(read_fd,))
    finally:
        os.close(read_fd)


def verify_bytes(public: Path, body: bytes, signature: bytes) -> bool:
    with tempfile.TemporaryDirectory(prefix="aoqat-ota-test-") as temp:
        root = Path(temp)
        raw, sig = root / "data", root / "signature"
        raw.write_bytes(body)
        sig.write_bytes(signature)
        try:
            result = run("openssl", "dgst", "-sha256", "-verify", str(public),
                         "-signature", str(sig), str(raw))
            return b"Verified OK" in result
        except ValueError:
            return False


def verify_signed(manifest: dict, content: bytes, pub: Path, now: int) -> None:
    if not (now < manifest["expiresAt"] <= now + 31 * 86400 * 1000):
        raise ValueError("Update expiry outside permitted window")
    if sha(content) != manifest["files"]["index.html"]:
        raise ValueError("Payload file altered after signing")
    if not verify_bytes(pub, payload(manifest), base64.b64decode(manifest["signature"], validate=True)):
        raise ValueError("Wrong OTA V2 signature")


def stage(private: Path, public: Path, apk: Path, sequence: int, dest: Path) -> None:
    if dest.exists() or dest.is_symlink():
        raise ValueError("Output already exists; refusing to overwrite")
    if not apk.is_file() or not private.is_file() or not public.is_file():
        raise ValueError("Signed B150 APK or owner V2 key file missing")
    if public_fingerprint(public) != APPROVED_OTA_SPKI_SHA256:
        raise ValueError("OTA public key does not match pinned APK V2 publisher")

    # Check exact OWNER-SIGNED B150, not an arbitrary file of the same name.
    digest = hashlib.sha256()
    with apk.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    if digest.hexdigest() != APPROVED_APK_SHA256:
        raise ValueError("Signed B150 APK hash differs from phone-verified APK")
    output = run("apksigner", "verify", "--verbose", "--print-certs",
                 "--min-sdk-version", "26", str(apk)).decode("utf-8", "replace")
    signers = {v.replace(":", "").lower() for v in re.findall(
        r"certificate SHA-256 digest:\s*([0-9a-fA-F:]+)", output)}
    if signers != {APPROVED_APK_CERT_SHA256}:
        raise ValueError("APK signer is NOT the approved V2 certificate")

    with zipfile.ZipFile(apk) as archive:
        index = profile_index(archive.read("assets/www/index.html"))
    now = int(time.time() * 1000)
    unsigned = make_manifest(index, sequence, now)

    print("PASS: exact V2-signed build 150; original offline HTML extracted")
    print("PASS: independent APK and OTA signing public identities")
    print("PASS: exactly one owner-reviewed profile button appended to original index")
    print("This test signs ONLY a restricted profile UI overlay for build 150.")
    print("Use the UPDATE V2 PEM passphrase, NOT the APK P12 password.")
    password = getpass.getpass("OTA update V2 private PEM passphrase (hidden): ")
    try:
        if not password:
            raise ValueError("Empty OTA update key passphrase")
        signature = sign_bytes(private, payload(unsigned), password)
    finally:
        password = None
    unsigned["signature"] = base64.b64encode(signature).decode("ascii")
    verify_signed(unsigned, index, public, now)
    bad = dict(unsigned, sequence=unsigned["sequence"] + 1)
    if verify_bytes(public, payload(bad), signature):
        raise ValueError("Tampered OTA sequence was accepted")
    signed_json = json.dumps(unsigned, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    # Public files only. This archive MUST NOT include private signing keys.
    with zipfile.ZipFile(dest, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("android-updates/build-150/manifest.json", signed_json)
        archive.writestr("android-updates/build-150/files/index.html", index)

    print("PASS: self-verifying signed OTA sequence 2 with restricted UI-only index")
    print("PASS: forged sequence rejected; no key/password exported")
    print("PUBLIC REVIEW ARCHIVE:", dest)
    print("PUBLIC REVIEW SHA-256:", sha(dest.read_bytes()))
    print("SIGNED MANIFEST SHA-256:", sha(signed_json))
    print("NO NETWORK, NO DEPLOYMENT, NO AUTOMATIC UPDATE YET.")


def self_test() -> None:
    with tempfile.TemporaryDirectory(prefix="aoqat-disposable-ota-") as temp:
        root = Path(temp)
        private, public = root / "test-private.pem", root / "test-public.pem"
        run("openssl", "ecparam", "-name", "prime256v1", "-genkey",
            "-noout", "-out", str(private))
        public.write_bytes(run("openssl", "pkey", "-in", str(private), "-pubout"))
        raw = b"<!doctype html><html><head></head><body>DISPOSABLE OTA TEST</body></html>"
        updated = profile_index(raw, verify_base=False)
        assert b"AOQAT_OTA_PROFILE_PROOF_B150_SEQUENCE2" in updated
        assert b"index.html" not in PROFILE_JS.encode("utf-8")
        now = int(time.time()*1000)
        m = make_manifest(updated, 2, now)
        sig = sign_bytes(private, payload(m), None)
        m["signature"] = base64.b64encode(sig).decode("ascii")
        verify_signed(m, updated, public, now)
        for bad in (dict(m, nativeBuild=148), dict(m, sequence=3),
                    dict(m, expiresAt=m["expiresAt"]+1000),
                    dict(m, files={"index.html":"0"*64})):
            try:
                if verify_bytes(public, payload(bad), sig):
                    raise ValueError("Tampering accepted")
            except ValueError as exc:
                if "Tampering accepted" in str(exc):
                    raise
        try:
            verify_signed(m, updated + b"modified", public, now)
        except ValueError:
            pass
        else:
            raise ValueError("Altered web HTML accepted")
    print("PASS: disposable P-256 signer and isolated profile button build-150 sequence 2")
    print("PASS: tamper/build/sequence/expiry rejected; NO OWNER KEYS USED")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--self-test", action="store_true")
    modes.add_argument("--owner-stage", action="store_true")
    parser.add_argument("--sequence", type=int, default=2)
    parser.add_argument("--apk", type=Path,
                        default=DOWNLOADS / "aoqat-b150-v2-2.12-signed.apk")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            if os.environ.get("GITHUB_ACTIONS", "").lower() == "true":
                raise ValueError("Owner signing must NEVER run in GitHub Actions")
            destination = args.output or DOWNLOADS / f"AOQAT-150-OTA-V2-PROFILE-REVIEW-seq{args.sequence}.zip"
            stage(KEY_DIR / "aoqat-update-private-v2.pem",
                  KEY_DIR / "aoqat-update-public-v2.pem",
                  args.apk, args.sequence, destination)
        return 0
    except (OSError, ValueError, KeyError, zipfile.BadZipFile, subprocess.SubprocessError) as exc:
        print("STOP:", str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
