#!/usr/bin/env python3
"""Owner-local OFFLINE V2 OTA pilot for already installed AOQAT APK build 150.

No web page, Quran word, prayer time, user setting or application code is
modified. Produces only a PUBLIC, owner-signed review ZIP with the exact same
index.html already packed into the owner's signed B150 APK. Does NOT publish
or upload any update.

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


def make_manifest(content: bytes, sequence: int, at_ms: int) -> dict:
    if sequence < 1 or sequence > 2**31 - 1:
        raise ValueError("Sequence must be between 1 and 2147483647")
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
        index = archive.read("assets/www/index.html")
    now = int(time.time() * 1000)
    unsigned = make_manifest(index, sequence, now)

    print("PASS: exact V2-signed build 150; original offline HTML extracted")
    print("PASS: independent APK and OTA signing public identities")
    print("This test signs ONLY the SAME index.html packaged in build 150.")
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

    print("PASS: self-verifying signed OTA manifest and unmodified APK web index")
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
        now = int(time.time()*1000)
        m = make_manifest(raw, 1, now)
        sig = sign_bytes(private, payload(m), None)
        m["signature"] = base64.b64encode(sig).decode("ascii")
        verify_signed(m, raw, public, now)
        for bad in (dict(m, nativeBuild=148), dict(m, sequence=2),
                    dict(m, expiresAt=m["expiresAt"]+1000),
                    dict(m, files={"index.html":"0"*64})):
            try:
                if verify_bytes(public, payload(bad), sig):
                    raise ValueError("Tampering accepted")
            except ValueError as exc:
                if "Tampering accepted" in str(exc):
                    raise
        try:
            verify_signed(m, raw + b"modified", public, now)
        except ValueError:
            pass
        else:
            raise ValueError("Altered web HTML accepted")
    print("PASS: disposable P-256 signer and canonical build-150 OTA manifest")
    print("PASS: tamper/build/sequence/expiry rejected; NO OWNER KEYS USED")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--self-test", action="store_true")
    modes.add_argument("--owner-stage", action="store_true")
    parser.add_argument("--sequence", type=int, default=1)
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
            destination = args.output or DOWNLOADS / f"AOQAT-150-OTA-V2-OWNER-REVIEW-seq{args.sequence}.zip"
            stage(KEY_DIR / "aoqat-update-private-v2.pem",
                  KEY_DIR / "aoqat-update-public-v2.pem",
                  args.apk, args.sequence, destination)
        return 0
    except (OSError, ValueError, KeyError, zipfile.BadZipFile, subprocess.SubprocessError) as exc:
        print("STOP:", str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
