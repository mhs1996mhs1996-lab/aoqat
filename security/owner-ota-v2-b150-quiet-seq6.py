#!/usr/bin/env python3
"""Owner-only B150 OTA seq6: responsive compact quiet controls.

Verify exactly the owner-signed seq5 baseline; sign ONLY on owner's Termux
with encrypted OTA V2 private PEM. Previous seq5 JS remains in the signed ZIP
for anti-deletion compatibility, but is no longer loaded by the new index.
Never upload private keys or owner passwords. No automatic publication.
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

BUILD, SEQUENCE = 150, 6
DOMAIN = "AOQAT-WEB-UPDATE-SIGNATURE-V1"
PUBLIC_SPKI_SHA256 = "8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
OLD_HTML_SHA256 = "c57ae34152d8c769a9b68d01925c4f1f5c1e8cce4a14a3abe7e620e7ab5e05d6"
OLD_JS_SHA256 = "5c226afe71d71166919d1e9761e4e3ea2a8bf095e29e22c9a7d256e932b1e0c3"
REVIEWED_JS_SHA256 = "2c619064b6a6128f08e3cd5212a1baf9b8a7dc9adcb2d34d5582f7ec4402d5e1"
REVIEWED_HTML_SHA256 = "1d22233ad0c81af44db47b5e48c7b6b69a78256336c98cee08d621038eef9506"
FOLDER = "android-updates/build-150/"
INDEX = "index.html"
OLD_JS = "js/owner-quiet-seq5.js"
NEW_JS = "js/owner-quiet-seq6.js"
MANIFEST_MEMBER = FOLDER + "manifest.json"
INDEX_MEMBER = FOLDER + "files/index.html"
OLD_JS_MEMBER = FOLDER + "files/" + OLD_JS
NEW_JS_MEMBER = FOLDER + "files/" + NEW_JS
OLD_TAG = b'<script src="js/owner-quiet-seq5.js"></script>\n'
NEW_TAG = b'<script src="js/owner-quiet-seq6.js"></script>\n'
DOWNLOADS = Path.home() / "storage" / "downloads"
KEYS = Path.home() / "aoqat-keys"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def command(*args: str, stdin: bytes | None = None, pass_fds: tuple[int, ...] = ()) -> bytes:
    result = subprocess.run(args, input=stdin, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, pass_fds=pass_fds, check=False)
    if result.returncode:
        raise ValueError("OpenSSL operation refused the key or signature")
    return result.stdout


def public_fp(public: Path) -> str:
    return sha(command("openssl", "pkey", "-pubin", "-in", str(public), "-outform", "DER"))


def canonical(manifest: dict) -> bytes:
    if not all(type(manifest.get(k)) is int and manifest[k] > 0
               for k in ("nativeBuild", "sequence", "expiresAt")):
        raise ValueError("Invalid native build, sequence, or expiry")
    if manifest["nativeBuild"] != BUILD:
        raise ValueError("Wrong native APK build")
    files = manifest.get("files")
    if not isinstance(files, dict) or set(files) not in (
            {INDEX, OLD_JS}, {INDEX, OLD_JS, NEW_JS}):
        raise ValueError("Unsafe or unexpected OTA file list")
    if any(not re.fullmatch("[a-f0-9]{64}", v) for v in files.values()):
        raise ValueError("Invalid file SHA256")
    lines = "\n".join(f"{name}:{files[name]}" for name in sorted(files))
    if manifest.get("revision") != sha(lines.encode("utf-8")):
        raise ValueError("Manifest revision does not match files")
    return "\n".join((DOMAIN, str(manifest["nativeBuild"]), str(manifest["sequence"]),
                       str(manifest["expiresAt"]), manifest["revision"], lines)).encode("utf-8")


def verify_signature(manifest: dict, public: Path) -> None:
    try:
        signature = base64.b64decode(manifest["signature"], validate=True)
    except (ValueError, KeyError) as err:
        raise ValueError("Owner OTA signature is missing or invalid") from err
    with tempfile.TemporaryDirectory(prefix="aoqat-owner-verify-") as tmp:
        root = Path(tmp)
        (root / "payload").write_bytes(canonical(manifest))
        (root / "signature").write_bytes(signature)
        command("openssl", "dgst", "-sha256", "-verify", str(public),
                "-signature", str(root / "signature"), str(root / "payload"))


def load_signed_seq5(source: Path, public: Path) -> tuple[bytes, bytes]:
    if public_fp(public) != PUBLIC_SPKI_SHA256:
        raise ValueError("Wrong OTA V2 public signing identity")
    if not source.is_file():
        raise ValueError("Owner-signed seq5 ZIP not found in Download")
    with zipfile.ZipFile(source) as archive:
        infos = archive.infolist()
        if (len(infos) != 3 or
                set(info.filename for info in infos) !=
                {MANIFEST_MEMBER, INDEX_MEMBER, OLD_JS_MEMBER}):
            raise ValueError("Seq5 signed ZIP must contain its exact 3 files")
        for info in infos:
            if (info.is_dir() or info.file_size > 6 * 1024 * 1024 or
                    (info.external_attr >> 16) & 0o170000 == stat.S_IFLNK):
                raise ValueError("Unsafe ZIP entry")
        manifest = json.loads(archive.read(MANIFEST_MEMBER))
        html, old_js = archive.read(INDEX_MEMBER), archive.read(OLD_JS_MEMBER)
    if (manifest.get("nativeBuild") != BUILD or manifest.get("sequence") != 5 or
            manifest.get("files") != {INDEX: OLD_HTML_SHA256, OLD_JS: OLD_JS_SHA256} or
            sha(html) != OLD_HTML_SHA256 or sha(old_js) != OLD_JS_SHA256):
        raise ValueError("Seq5 signed ZIP differs from the reviewed owner test")
    if manifest["expiresAt"] <= int(time.time() * 1000):
        raise ValueError("Seq5 source manifest has expired")
    verify_signature(manifest, public)
    return html, old_js


def candidate(html: bytes, old_js: bytes, new_js: bytes) -> tuple[bytes, bytes, bytes]:
    if sha(html) != OLD_HTML_SHA256 or sha(old_js) != OLD_JS_SHA256:
        raise ValueError("Seq5 starting files mismatch")
    if sha(new_js) != REVIEWED_JS_SHA256:
        raise ValueError("Seq6 JS does not match reviewed GitHub SHA256")
    if (html.count(OLD_TAG) != 1 or NEW_TAG in html or
            b"AOQAT_OWNER_PILOT_SEQ4_PROFILE_BUTTONS_V1" not in html or
            b"js/apk-startup-bundle.js" not in html):
        raise ValueError("Unable to safely replace only the seq5 JS reference")
    updated = html.replace(OLD_TAG, NEW_TAG, 1)
    if (sha(updated) != REVIEWED_HTML_SHA256 or updated.count(NEW_TAG) != 1 or
            OLD_TAG in updated or updated.replace(NEW_TAG, OLD_TAG, 1) != html or
            any(len(x) > 6 * 1024 * 1024 for x in (updated, old_js, new_js))):
        raise ValueError("Seq6 index differs from exact reviewed update")
    return updated, old_js, new_js


def new_manifest(html: bytes, old_js: bytes, new_js: bytes) -> dict:
    files = {INDEX: sha(html), OLD_JS: sha(old_js), NEW_JS: sha(new_js)}
    lines = "\n".join(f"{name}:{files[name]}" for name in sorted(files))
    return {"nativeBuild": BUILD, "sequence": SEQUENCE,
            "expiresAt": int(time.time() * 1000) + 14 * 86400 * 1000,
            "revision": sha(lines.encode("utf-8")), "files": files}


def sign_local(private: Path, payload: bytes, password: str) -> bytes:
    reader, writer = os.pipe()
    try:
        try:
            os.write(writer, password.encode("utf-8") + b"\n")
        finally:
            os.close(writer)
        return command("openssl", "dgst", "-sha256", "-passin",
                       "fd:" + str(reader), "-sign", str(private),
                       stdin=payload, pass_fds=(reader,))
    finally:
        os.close(reader)


def write_zip(dest: Path, manifest: dict, html: bytes, old_js: bytes, new_js: bytes) -> None:
    if dest.exists() or dest.is_symlink():
        raise ValueError("Refusing to overwrite an existing file")
    with zipfile.ZipFile(dest, "x", zipfile.ZIP_DEFLATED) as z:
        z.writestr(MANIFEST_MEMBER, json.dumps(manifest, ensure_ascii=False, separators=(",", ":")).encode())
        z.writestr(INDEX_MEMBER, html)
        z.writestr(OLD_JS_MEMBER, old_js)
        z.writestr(NEW_JS_MEMBER, new_js)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--owner-stage", action="store_true")
    modes.add_argument("--review", action="store_true")
    parser.add_argument("--source", type=Path, default=DOWNLOADS / "AOQAT-B150-OWNER-SEQ5-QUIET-FIX-SIGNED-TEST-ONLY.zip")
    parser.add_argument("--quiet-js", type=Path, default=DOWNLOADS / "owner-ota-b150-seq6-quiet-compact.js")
    parser.add_argument("--private-key", type=Path, default=KEYS / "aoqat-update-private-v2.pem")
    parser.add_argument("--public-key", type=Path, default=KEYS / "aoqat-update-public-v2.pem")
    parser.add_argument("--output", type=Path, default=DOWNLOADS / "AOQAT-B150-OWNER-SEQ6-QUIET-COMPACT-SIGNED-TEST-ONLY.zip")
    args = parser.parse_args()
    try:
        html, old_js = load_signed_seq5(args.source, args.public_key)
        updated, old_js, new_js = candidate(html, old_js, args.quiet_js.read_bytes())
        manifest = new_manifest(updated, old_js, new_js)
        if args.review:
            print("PASS: seq5 owner-signed baseline verified")
            print("PASS: exactly reviewed seq6 script/index, no dropped files")
            print("SEQ6-INDEX-SHA256", sha(updated))
            print("SEQ6-QUIET-JS-SHA256", sha(new_js))
            return 0
        if os.environ.get("GITHUB_ACTIONS", "").lower() == "true":
            raise ValueError("Private signing in GitHub Actions forbidden")
        if not args.private_key.is_file():
            raise ValueError("Owner OTA V2 private PEM missing")
        print("Use AOQAT-OTA-V2 password, NOT APK/Admin P12 passwords.")
        password = getpass.getpass("OTA V2 key password (hidden): ")
        try:
            if not password:
                raise ValueError("Empty signing password is not accepted")
            signature = sign_local(args.private_key, canonical(manifest), password)
        finally:
            password = ""
        manifest["signature"] = base64.b64encode(signature).decode("ascii")
        verify_signature(manifest, args.public_key)
        if manifest["sequence"] != SEQUENCE:
            raise ValueError("Unexpected signed sequence")
        write_zip(args.output, manifest, updated, old_js, new_js)
        print("PASS: owner-signed B150 OTA sequence 6 verified locally")
        print("FILE:", args.output)
        print("SHA256:", sha(args.output.read_bytes()))
        print("OWNER TEST ONLY — no publication or user device updates")
        return 0
    except (OSError, ValueError, TypeError, KeyError, zipfile.BadZipFile,
            subprocess.SubprocessError, json.JSONDecodeError) as err:
        print("STOP:", str(err), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
