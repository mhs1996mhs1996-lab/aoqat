#!/usr/bin/env python3
"""Strict B150/2.12 production profile-test OTA publisher.

No changes to APKs, prayer services or non-profile source; signs exactly
the reviewed index.html. A private OTA V2 PEM is only supplied at release time
via a locked GitHub environment, NEVER stored in Git or requested per update.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import subprocess
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAIN_ROOT = Path("android-updates/build-150")
CURRENT_MANIFEST = ROOT / MAIN_ROOT / "manifest.json"
CURRENT_HTML = ROOT / MAIN_ROOT / "files/index.html"
REVIEW_HTML = ROOT / "security/review-b150-main-profile-seq4-index.html"
ANDROID_SOURCE = ROOT / "android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt"
PUBLIC_SPKI_PIN = "8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
CURRENT_REVISION = "98554724ebce6ab736e7c5309a136201eb2e6e52fc78085aec6585993e191d8a"
CURRENT_INDEX_HASH = "9cc9ba4313ad9df1ece2142b1a19dafb5bb81591483b3d0aa51b077351e65658"
REVIEW_INDEX_HASH = "1545777320117e542c280321e7013ef7db8359367124b04661b155f5d667429d"
DOMAIN = "AOQAT-WEB-UPDATE-SIGNATURE-V1"
BUILD = 150
SEQUENCE = 4
THIRTEEN_DAYS_MS = 13 * 86400 * 1000


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def checked_public_key() -> bytes:
    kotlin = ANDROID_SOURCE.read_text(encoding="utf-8")
    match = re.search(r'const val SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"', kotlin)
    if not match:
        raise ValueError("Production app OTA signing public key missing")
    der = base64.b64decode(match.group(1), validate=True)
    if sha(der) != PUBLIC_SPKI_PIN:
        raise ValueError("Production OTA signing public key was rotated unexpectedly")
    return der


def content() -> tuple[dict, bytes, bytes]:
    previous = json.loads(CURRENT_MANIFEST.read_text(encoding="utf-8"))
    old = CURRENT_HTML.read_bytes()
    reviewed = REVIEW_HTML.read_bytes()
    if previous.get("nativeBuild") != BUILD or previous.get("sequence") != 3:
        raise ValueError("Production manifest no longer on signed build 150 sequence 3")
    if previous.get("revision") != CURRENT_REVISION:
        raise ValueError("Production revision changed unexpectedly")
    if previous.get("files") != {"index.html": CURRENT_INDEX_HASH}:
        raise ValueError("Production signed index file list changed unexpectedly")
    if sha(old) != CURRENT_INDEX_HASH or sha(reviewed) != REVIEW_INDEX_HASH:
        raise ValueError("Reviewed HTML bytes do not match independently tested hashes")
    original = ("      panel.dir = 'rtl';\n"
                "      nav.sub('الملف الشخصي', panel, 'main');").encode("utf-8")
    # Verify the test is inside exactly one existing profile handler, byte-for-byte.
    if old.count(original) != 1 or reviewed.count(b"AOQAT_MAIN_PROFILE_OTA_SEQ4_TEST") != 1:
        raise ValueError("Not the single approved profile test")
    if not reviewed.startswith(old[:old.index(original)]):
        raise ValueError("Unexpected prefix outside the owner profile test")
    if not reviewed.endswith(old[old.index(original) + len(original):]):
        raise ValueError("Unexpected suffix outside the owner profile test")
    if len(reviewed) > 6 * 1024 * 1024:
        raise ValueError("HTML exceeds OTA file limit")
    return previous, old, reviewed


def signed_payload(m: dict) -> bytes:
    files = m.get("files")
    if files is None or set(files) != {"index.html"}:
        raise ValueError("Only signed index.html may be updated")
    expected_hash = files["index.html"]
    if not re.fullmatch("[0-9a-f]{64}", expected_hash):
        raise ValueError("Invalid file digest")
    canonical = "index.html:" + expected_hash
    if m.get("revision") != sha(canonical.encode()):
        raise ValueError("Manifest revision does not match signed file")
    if type(m.get("nativeBuild")) is not int or type(m.get("sequence")) is not int:
        raise ValueError("Invalid build or sequence")
    if type(m.get("expiresAt")) is not int:
        raise ValueError("Invalid expiry")
    return "\n".join([DOMAIN, str(m["nativeBuild"]), str(m["sequence"]),
                       str(m["expiresAt"]), m["revision"], canonical]).encode()


def openssl(*args: str, data: bytes | None = None) -> bytes:
    result = subprocess.run(["openssl", *args], input=data, capture_output=True, check=False)
    if result.returncode:
        raise ValueError("Cryptographic operation rejected material")
    return result.stdout


def verify(m: dict, public_der: bytes) -> None:
    with tempfile.TemporaryDirectory(prefix="aoqat-ota-cert-") as tmp:
        root = Path(tmp)
        (root / "pub.der").write_bytes(public_der)
        (root / "pub.pem").write_bytes(openssl(
            "pkey", "-pubin", "-inform", "DER", "-in", str(root / "pub.der"), "-pubout"))
        (root / "message").write_bytes(signed_payload(m))
        (root / "sig").write_bytes(base64.b64decode(m["signature"], validate=True))
        result = openssl("dgst", "-sha256", "-verify", str(root / "pub.pem"),
                         "-signature", str(root / "sig"), str(root / "message"))
        if b"Verified OK" not in result:
            raise ValueError("Signature check did not succeed")


def sign_stage(private_key: Path, output: Path) -> None:
    pub = checked_public_key()
    previous, unused, reviewed = content()
    verify(previous, pub)
    if not private_key.is_file():
        raise ValueError("Production V2 signing secret was not configured")
    public_from_private = openssl("pkey", "-in", str(private_key), "-pubout",
                                  "-outform", "DER",
                                  *(["-passin", "env:AOQAT_V2_OTA_PASSPHRASE"]
                                    if os.environ.get("AOQAT_V2_OTA_PASSPHRASE") else []))
    if sha(public_from_private) != PUBLIC_SPKI_PIN:
        raise ValueError("Wrong OTA private key; will not produce production signature")
    index_hash = sha(reviewed)
    m = {"nativeBuild": BUILD, "sequence": SEQUENCE,
         "expiresAt": int(time.time() * 1000) + THIRTEEN_DAYS_MS,
         "revision": sha(("index.html:" + index_hash).encode()),
         "files": {"index.html": index_hash}}
    password_args = (["-passin", "env:AOQAT_V2_OTA_PASSPHRASE"]
                     if os.environ.get("AOQAT_V2_OTA_PASSPHRASE") else [])
    m["signature"] = base64.b64encode(openssl(
        "dgst", "-sha256", *password_args, "-sign", str(private_key),
        data=signed_payload(m))).decode()
    verify(m, pub)
    if output.exists():
        raise ValueError("Refuse to overwrite existing signed release")
    (output / MAIN_ROOT / "files").mkdir(parents=True)
    (output / MAIN_ROOT / "manifest.json").write_text(
        json.dumps(m, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (output / MAIN_ROOT / "files/index.html").write_bytes(reviewed)
    assert sha((output / MAIN_ROOT / "files/index.html").read_bytes()) == REVIEW_INDEX_HASH
    print("PASS: original OTA V2 key and signed seq3 verified; main profile seq4 signed.")
    print("RELEASE_FILES=2")
    print("INDEX_SHA256="+index_hash)


def self_test() -> None:
    checked_public_key()
    old, base, reviewed = content()
    assert old["sequence"] == 3 and base != reviewed
    verify(old, checked_public_key())
    with tempfile.TemporaryDirectory() as folder:
        root = Path(folder)
        openssl("ecparam", "-name", "prime256v1", "-genkey",
                "-noout", "-out", str(root / "disposable.pem"))
        der = openssl("pkey", "-in", str(root / "disposable.pem"), "-pubout", "-outform", "DER")
        dummy = {"nativeBuild": BUILD, "sequence": SEQUENCE,
                 "expiresAt": int(time.time() * 1000) + 86400000,
                 "files": {"index.html": REVIEW_INDEX_HASH},
                 "revision": sha(("index.html:" + REVIEW_INDEX_HASH).encode())}
        dummy["signature"] = base64.b64encode(openssl(
            "dgst", "-sha256", "-sign", str(root / "disposable.pem"),
            data=signed_payload(dummy))).decode()
        verify(dummy, der)
        for tamper in (dict(dummy, sequence=5),
                       dict(dummy, revision="0" * 64),
                       dict(dummy, files={"index.html": CURRENT_INDEX_HASH})):
            try:
                verify(tamper, der)
            except (ValueError, KeyError):
                pass
            else:
                raise AssertionError("Forged ECDSA manifest accepted")
    print("PASS: verified actual production seq3, reviewed profile-only diff; disposable-key signing checks.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--private-key", type=Path)
    parser.add_argument("--output", type=Path)
    options = parser.parse_args()
    if options.self_test:
        self_test()
    elif options.private_key is not None and options.output is not None:
        sign_stage(options.private_key, options.output)
    else:
        parser.error("Choose --self-test OR --private-key ... --output ...")
