#!/usr/bin/env python3
"""Owner-local B150 OTA V2 seq5: quiet UI fast controls; NEVER publish.

Use Termux to sign using existing encrypted aoqat-update-private-v2.pem.
This tool accepts ONLY the exact owner-signed seq4 baseline and the exact
CI-reviewed standalone native quiet JS, and emits a signed ownerPilot ZIP.
Never share the owner's signing key/password or put them in GitHub.
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

BUILD, SEQ = 150, 5
DOMAIN = "AOQAT-WEB-UPDATE-SIGNATURE-V1"
PUBLIC_SPKI_SHA256 = "8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
OLD_SEQ4_INDEX_SHA256 = "d3afaa4d5410f8f1cd958ee7cb710fc4105add27f810d5e779aca54d98977eb5"
REVIEWED_QUIET_JS_SHA256 = "5c226afe71d71166919d1e9761e4e3ea2a8bf095e29e22c9a7d256e932b1e0c3"
REVIEWED_SEQ5_INDEX_SHA256 = "c57ae34152d8c769a9b68d01925c4f1f5c1e8cce4a14a3abe7e620e7ab5e05d6"
ROOT = "android-updates/build-150/"
INDEX = "index.html"
QUIET_JS = "js/owner-quiet-seq5.js"
MANIFEST_MEMBER = ROOT + "manifest.json"
INDEX_MEMBER = ROOT + "files/index.html"
QUIET_MEMBER = ROOT + "files/" + QUIET_JS
MARKER = 'src="js/owner-quiet-seq5.js"'
TRAILER = b"</body></html>"
DOWNLOADS = Path.home() / "storage" / "downloads"
KEYS = Path.home() / "aoqat-keys"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def cmd(*parts: str, data: bytes | None = None,
        pass_fds: tuple[int, ...] = ()) -> bytes:
    p = subprocess.run(parts, input=data, stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, pass_fds=pass_fds, check=False)
    if p.returncode:
        raise ValueError("Cryptographic operation or local file verification failed")
    return p.stdout


def public_fingerprint(key: Path) -> str:
    return sha(cmd("openssl", "pkey", "-pubin", "-in", str(key), "-outform", "DER"))


def canonical(m: dict) -> bytes:
    if not all(type(m.get(k)) is int and m[k] > 0 for k in
               ("nativeBuild", "sequence", "expiresAt")):
        raise ValueError("Invalid build, sequence or expiry")
    if m["nativeBuild"] != BUILD:
        raise ValueError("Wrong native build number; no cross-build updates")
    files = m.get("files")
    if (not isinstance(files, dict) or not 1 <= len(files) <= 2 or
            INDEX not in files or
            not set(files).issubset({INDEX, QUIET_JS})):
        raise ValueError("Unexpected OTA content paths")
    if any(re.fullmatch("[0-9a-f]{64}", x) is None for x in files.values()):
        raise ValueError("Invalid SHA256 in manifest")
    lines = "\n".join(f"{key}:{files[key]}" for key in sorted(files))
    if m.get("revision") != sha(lines.encode("utf-8")):
        raise ValueError("Manifest revision differs from file list")
    return "\n".join([DOMAIN, str(m["nativeBuild"]), str(m["sequence"]),
                     str(m["expiresAt"]), m["revision"], lines]).encode("utf-8")


def verify_sig(m: dict, pub: Path) -> None:
    try:
        sig = base64.b64decode(m["signature"], validate=True)
    except (KeyError, ValueError) as exc:
        raise ValueError("Missing or invalid OTA signature") from exc
    with tempfile.TemporaryDirectory(prefix="aoqat-owner-verify-") as tmp:
        folder = Path(tmp)
        (folder / "canonical").write_bytes(canonical(m))
        (folder / "signature").write_bytes(sig)
        cmd("openssl", "dgst", "-sha256", "-verify", str(pub),
            "-signature", str(folder / "signature"), str(folder / "canonical"))


def read_exact_signed_seq4(source: Path, public: Path) -> bytes:
    if public_fingerprint(public) != PUBLIC_SPKI_SHA256:
        raise ValueError("Wrong OTA V2 publisher public key")
    if not source.is_file():
        raise ValueError("Signed seq4 ZIP missing from Downloads")
    with zipfile.ZipFile(source, "r") as archive:
        items = archive.infolist()
        names = [i.filename for i in items]
        if len(items) != 2 or set(names) != {MANIFEST_MEMBER, INDEX_MEMBER}:
            raise ValueError("Expected exact signed seq4 ZIP with 2 entries")
        for i in items:
            if i.is_dir() or i.file_size > 6 * 1024 * 1024 or (
                    (i.external_attr >> 16) & 0o170000) == stat.S_IFLNK:
                raise ValueError("Unsafe ZIP entry")
        m = json.loads(archive.read(MANIFEST_MEMBER))
        html = archive.read(INDEX_MEMBER)
    if (m.get("nativeBuild") != BUILD or m.get("sequence") != 4 or
            m.get("files") != {INDEX: OLD_SEQ4_INDEX_SHA256} or
            sha(html) != OLD_SEQ4_INDEX_SHA256):
        raise ValueError("Seq4 source differs from already tested owner baseline")
    if m["expiresAt"] <= int(time.time() * 1000):
        raise ValueError("Old seq4 signed manifest expired")
    verify_sig(m, public)
    return html


def candidate(base: bytes, script: bytes) -> tuple[bytes, bytes]:
    if sha(base) != OLD_SEQ4_INDEX_SHA256:
        raise ValueError("Unexpected seq4 index; refusing patch")
    if sha(script) != REVIEWED_QUIET_JS_SHA256:
        raise ValueError("Quiet JS differs from reviewed GitHub candidate")
    if (base.count(TRAILER) != 1 or MARKER.encode("utf-8") in base or
            b"AOQAT_OWNER_PILOT_SEQ4_PROFILE_BUTTONS_V1" not in base or
            b"js/apk-startup-bundle.js" not in base):
        raise ValueError("Cannot safely insert scoped quiet override")
    html = base.replace(
        TRAILER,
        b'<script src="js/owner-quiet-seq5.js"></script>\n' + TRAILER,
        1
    )
    if (sha(html) != REVIEWED_SEQ5_INDEX_SHA256 or
            html.count(MARKER.encode("utf-8")) != 1 or
            html.replace(b'<script src="js/owner-quiet-seq5.js"></script>\n',
                         b"", 1) != base or
            len(html) > 6 * 1024 * 1024 or
            len(script) > 6 * 1024 * 1024):
        raise ValueError("New signed snapshot differs from reviewed OTA content")
    return html, script


def manifest(html: bytes, script: bytes) -> dict:
    files = {INDEX: sha(html), QUIET_JS: sha(script)}
    lines = "\n".join(f"{key}:{files[key]}" for key in sorted(files))
    return {
        "nativeBuild": BUILD, "sequence": SEQ,
        "expiresAt": int(time.time() * 1000) + 14 * 86400 * 1000,
        "revision": sha(lines.encode("utf-8")),
        "files": files
    }


def owner_sign(private: Path, message: bytes, passwd: str) -> bytes:
    fd, w = os.pipe()
    try:
        try:
            os.write(w, passwd.encode("utf-8") + b"\n")
        finally:
            os.close(w)
        return cmd("openssl", "dgst", "-sha256",
                   "-passin", "fd:" + str(fd), "-sign", str(private),
                   data=message, pass_fds=(fd,))
    finally:
        os.close(fd)


def write_zip(file: Path, m: dict, html: bytes, script: bytes) -> None:
    if file.exists() or file.is_symlink():
        raise ValueError("Output already exists; refusing to overwrite")
    with zipfile.ZipFile(file, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(MANIFEST_MEMBER, json.dumps(m, separators=(",", ":"), ensure_ascii=False).encode())
        archive.writestr(INDEX_MEMBER, html)
        archive.writestr(QUIET_MEMBER, script)


def stage(args: argparse.Namespace) -> None:
    base = read_exact_signed_seq4(args.source, args.public_key)
    quiet = args.quiet_js.read_bytes()
    html, quiet = candidate(base, quiet)
    m = manifest(html, quiet)
    if args.review:
        print("PASS: exact signed owner-tested seq4 source checked")
        print("PASS: reviewed seq5 index and quiet JS; 2 authorized files only")
        print("SEQ5-INDEX-SHA256", sha(html))
        print("SEQ5-QUIET-JS-SHA256", sha(quiet))
        print("REVIEW ONLY: not signed, nothing installed")
        return
    if os.getenv("GITHUB_ACTIONS", "").lower() == "true":
        raise ValueError("Owner signing must never run in GitHub Actions")
    if not args.private_key.is_file():
        raise ValueError("Encrypted owner OTA V2 private key missing")
    print("Enter the AOQAT-OTA-V2 private PEM password, NOT an APK/Admin P12.")
    password = getpass.getpass("OTA V2 key password (hidden): ")
    try:
        if not password:
            raise ValueError("OTA password is required")
        signature = owner_sign(args.private_key, canonical(m), password)
    finally:
        password = ""
    m["signature"] = base64.b64encode(signature).decode("ascii")
    verify_sig(m, args.public_key)
    if m["sequence"] != 5:
        raise ValueError("Wrong sequence after signing")
    destination = args.output
    write_zip(destination, m, html, quiet)
    print("PASS: signed owner-only B150 OTA sequence 5 verified with OTA V2")
    print("FILE:", destination)
    print("SHA256:", sha(destination.read_bytes()))
    print("NO PUBLICATION. Import only into separate أوقات الصلاة — تجريبي.")


def main() -> int:
    cli = argparse.ArgumentParser(description=__doc__)
    mode = cli.add_mutually_exclusive_group(required=True)
    mode.add_argument("--owner-stage", action="store_true")
    mode.add_argument("--review", action="store_true")
    cli.add_argument("--source", type=Path,
                     default=DOWNLOADS / "AOQAT-B150-OWNER-SEQ4-SIGNED-TEST-ONLY.zip")
    cli.add_argument("--quiet-js", type=Path,
                     default=DOWNLOADS / "owner-ota-b150-seq5-quiet-ui.js")
    cli.add_argument("--public-key", type=Path,
                     default=KEYS / "aoqat-update-public-v2.pem")
    cli.add_argument("--private-key", type=Path,
                     default=KEYS / "aoqat-update-private-v2.pem")
    cli.add_argument("--output", type=Path,
                     default=DOWNLOADS / "AOQAT-B150-OWNER-SEQ5-QUIET-FIX-SIGNED-TEST-ONLY.zip")
    a = cli.parse_args()
    try:
        stage(a)
        return 0
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile,
            subprocess.SubprocessError, json.JSONDecodeError) as exc:
        print("STOP:", str(exc), file=sys.stderr)
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
