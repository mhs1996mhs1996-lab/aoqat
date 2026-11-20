#!/usr/bin/env python3
"""Sign ONLY an owner-pilot OTA candidate, entirely offline on the owner's device.

Input: ZIP of full, allowed overrides (index.html and js/*.js/css/*.css).
Output: public ZIP containing android-updates/owner-pilot/build-150/manifest.json
and files/*. No private signing key is written into the ZIP or GitHub.
Never auto-publish: inspect/approve the exact public ZIP before deploying bytes.
"""
from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import json
import os
import re
import stat
import subprocess
import tempfile
import time
import zipfile
from pathlib import Path

BUILD = 150
DOMAIN = "AOQAT-WEB-UPDATE-OWNER-PILOT-V1"
CHANNEL = "owner-pilot"
ROOT = "android-updates/owner-pilot/build-150/"
PINNED_PUBLIC_KEY_SPKI = "8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
DAY_MS = 86400 * 1000
MAX_FILE = 6 * 1024 * 1024
MAX_TOTAL = 24 * 1024 * 1024


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def allowed(name: str) -> bool:
    return (name == "index.html" or bool(re.fullmatch(
        r"(js|css)/[a-zA-Z0-9_./-]+\.(js|css)", name))) and not any(
        bad in name for bad in ("..", "%", "\\", "//", "/.", "./"))


def read_candidate(source: Path) -> dict[str, bytes]:
    if not source.is_file() or not zipfile.is_zipfile(source):
        raise ValueError("Expected an unsigned candidate ZIP")
    files: dict[str, bytes] = {}
    total = 0
    with zipfile.ZipFile(source) as archive:
        for entry in archive.infolist():
            if entry.is_dir() or not allowed(entry.filename) or entry.filename in files:
                raise ValueError("Duplicate, unsupported or directory ZIP entry")
            if (entry.external_attr >> 16) & 0o170000 == stat.S_IFLNK:
                raise ValueError("Symlink in candidate ZIP")
            if len(files) >= 250 or entry.file_size > MAX_FILE:
                raise ValueError("Candidate path count or file size exceeded")
            total += entry.file_size
            if total > MAX_TOTAL:
                raise ValueError("OTA payload exceeds 24 MiB")
            payload = archive.read(entry)
            if len(payload) != entry.file_size:
                raise ValueError("Corrupted ZIP entry")
            files[entry.filename] = payload
    if "index.html" not in files:
        raise ValueError("The full OTA snapshot requires index.html")
    return files


def unsigned_manifest(files: dict[str, bytes], seq: int, now: int) -> dict:
    if not 1 <= seq <= 2_147_483_647:
        raise ValueError("Invalid owner-pilot sequence")
    sums = {name: digest(files[name]) for name in sorted(files)}
    canonical = "\n".join(f"{name}:{sums[name]}" for name in sorted(sums))
    return {
        "nativeBuild": BUILD,
        "sequence": seq,
        "channel": CHANNEL,
        "expiresAt": now + 14 * DAY_MS,
        "revision": digest(canonical.encode()),
        "files": sums,
    }


def payload(m: dict) -> bytes:
    if (m.get("nativeBuild") != BUILD or m.get("channel") != CHANNEL or
            not isinstance(m.get("sequence"), int) or m["sequence"] <= 0 or
            not isinstance(m.get("expiresAt"), int) or m["expiresAt"] <= 0):
        raise ValueError("Wrong signed build or pilot channel")
    files = m.get("files")
    if not isinstance(files, dict) or not 1 <= len(files) <= 250 or "index.html" not in files:
        raise ValueError("Invalid file list")
    for name, sha in files.items():
        if not allowed(name) or not isinstance(sha, str) or not re.fullmatch("[0-9a-f]{64}", sha):
            raise ValueError("Unsupported path or hash")
    canonical = "\n".join(f"{name}:{files[name]}" for name in sorted(files))
    if m.get("revision") != digest(canonical.encode()):
        raise ValueError("Revision does not match files")
    return "\n".join((DOMAIN, str(BUILD), str(m["sequence"]), str(m["expiresAt"]),
                      m["revision"], canonical)).encode()


def openssl(*args: str, data: bytes | None = None, pass_fds: tuple[int, ...] = ()) -> bytes:
    process = subprocess.run(["openssl", *args], input=data, capture_output=True,
                             pass_fds=pass_fds, check=False)
    if process.returncode:
        raise ValueError("Local cryptographic verification failed")
    return process.stdout


def key_fingerprint(public: Path) -> str:
    return digest(openssl("pkey", "-pubin", "-in", str(public), "-outform", "DER"))


def signature(private: Path, data: bytes, password: str | None) -> bytes:
    if password is None:
        return openssl("dgst", "-sha256", "-sign", str(private), data=data)
    read_fd, write_fd = os.pipe()
    try:
        os.write(write_fd, (password + "\n").encode())
        os.close(write_fd)
        write_fd = -1
        return openssl("dgst", "-sha256", "-passin", "fd:" + str(read_fd),
                       "-sign", str(private), data=data, pass_fds=(read_fd,))
    finally:
        os.close(read_fd)
        if write_fd != -1:
            os.close(write_fd)


def verify_signature(m: dict, public: Path) -> None:
    with tempfile.TemporaryDirectory(prefix="aoqat-qa-sign-check-") as folder:
        root = Path(folder)
        (root / "payload").write_bytes(payload(m))
        (root / "signature").write_bytes(base64.b64decode(m["signature"], validate=True))
        openssl("dgst", "-sha256", "-verify", str(public), "-signature",
                str(root / "signature"), str(root / "payload"))


def sign_candidate(source: Path, private: Path, public: Path, seq: int, output: Path,
                   password: str | None = None, require_pinned_key: bool = True) -> dict:
    if output.exists():
        raise ValueError("Output exists, will not overwrite signed files")
    if not private.is_file() or not public.is_file():
        raise ValueError("Owner private and public OTA keys are required locally")
    if require_pinned_key and key_fingerprint(public) != PINNED_PUBLIC_KEY_SPKI:
        raise ValueError("Wrong owner OTA V2 signing certificate")
    files = read_candidate(source)
    m = unsigned_manifest(files, seq, int(time.time() * 1000))
    m["signature"] = base64.b64encode(signature(private, payload(m), password)).decode("ascii")
    verify_signature(m, public)
    data = json.dumps(m, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "x", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(ROOT + "manifest.json", data)
        for name, content in sorted(files.items()):
            archive.writestr(ROOT + "files/" + name, content)
    return {"manifest_sha256": digest(data), "files": len(files), "bytes": sum(map(len, files.values()))}


def self_test() -> None:
    with tempfile.TemporaryDirectory(prefix="aoqat-owner-qa-test-") as folder:
        root = Path(folder)
        openssl("ecparam", "-name", "prime256v1", "-genkey", "-noout",
                "-out", str(root / "test-private.pem"))
        public = root / "test-public.pem"
        public.write_bytes(openssl("pkey", "-in", str(root / "test-private.pem"), "-pubout"))
        candidate = root / "candidate.zip"
        with zipfile.ZipFile(candidate, "w") as archive:
            archive.writestr("index.html", "<html lang='ar'>TEST</html>")
            archive.writestr("js/web-menu-order.js", "window.pilotTest=true;")
        result = root / "signed.zip"
        signed = sign_candidate(candidate, root / "test-private.pem", public, 1,
                                result, None, require_pinned_key=False)
        with zipfile.ZipFile(result) as archive:
            m = json.loads(archive.read(ROOT + "manifest.json"))
            assert len(archive.namelist()) == 3
            assert m["channel"] == CHANNEL and m["nativeBuild"] == BUILD
            verify_signature(m, public)
            for altered in ({**m, "channel": "production"},
                            {**m, "sequence": 2},
                            {**m, "files": {**m["files"], "index.html": "0" * 64}}):
                try:
                    verify_signature(altered, public)
                except (ValueError, KeyError):
                    pass
                else:
                    raise AssertionError("Forged OTA accepted")
        assert signed["files"] == 2
        print("PASS: isolated pilot domain, small signed OTA, forged data rejected")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--candidate", type=Path, help="ZIP with index.html and all active JS/CSS overrides")
    parser.add_argument("--sequence", type=int)
    parser.add_argument("--private-key", type=Path,
                        default=Path.home() / "aoqat-keys/aoqat-update-private-v2.pem")
    parser.add_argument("--public-key", type=Path,
                        default=Path.home() / "aoqat-keys/aoqat-update-public-v2.pem")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if args.candidate is None or args.sequence is None or args.output is None:
        parser.error("--candidate, --sequence and --output are required")
    if args.output.resolve() == args.candidate.resolve():
        parser.error("Input and output paths must differ")
    password = getpass.getpass("Owner OTA V2 key password (hidden): ")
    report = sign_candidate(args.candidate, args.private_key, args.public_key,
                            args.sequence, args.output, password)
    print("PASS: owner-pilot signed ZIP verified, NOT PUBLISHED")
    print("Public manifest SHA256:", report["manifest_sha256"])
    print("Signed file count:", report["files"], "payload bytes:", report["bytes"])
    print("Save this public ZIP for review; NEVER upload your private PEM or password.")


if __name__ == "__main__":
    main()
