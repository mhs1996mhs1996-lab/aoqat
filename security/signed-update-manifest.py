#!/usr/bin/env python3
"""Offline signing utility for future AOQAT partial updates; never commit a private key.

This is a staging tool: existing 2.10 APKs do NOT verify signatures.
Signatures must be enforced by the native verifier in a future security APK.
Compatible with Android SHA256withECDSA using OpenSSL P-256 EC keys.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

DOMAIN = "AOQAT-WEB-UPDATE-SIGNATURE-V1"
HASH_RE = re.compile(r"[a-f0-9]{64}\Z")
WEB_PATH_RE = re.compile(r"(?:js|css)/[a-zA-Z0-9_./-]+\.(?:js|css)\Z")

def payload(manifest: dict) -> bytes:
    build, sequence, expires = (
        manifest.get("nativeBuild"), manifest.get("sequence"), manifest.get("expiresAt")
    )
    for k, value in (("nativeBuild", build), ("sequence", sequence), ("expiresAt", expires)):
        if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
            raise ValueError(f"{k} must be a positive integer")
    files = manifest.get("files")
    if not isinstance(files, dict) or not (1 <= len(files) <= 250) or "index.html" not in files:
        raise ValueError("Expected 1-250 files including index.html")
    for path, checksum in files.items():
        if path != "index.html" and (not isinstance(path, str) or not WEB_PATH_RE.fullmatch(path)):
            raise ValueError(f"Unsupported path: {path!r}")
        if ".." in path or "%" in path or "\\" in path:
            raise ValueError(f"Unsafe path: {path!r}")
        if not isinstance(checksum, str) or not HASH_RE.fullmatch(checksum):
            raise ValueError(f"Invalid SHA256 for {path!r}")
    canonical = "\n".join(f"{p}:{files[p]}" for p in sorted(files))
    revision = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    if manifest.get("revision") != revision:
        raise ValueError("Revision does not match file-list checksums")
    return "\n".join((DOMAIN, str(build), str(sequence), str(expires), revision, canonical)).encode("utf-8")

def verify(manifest: dict, key: Path, *, expected_build: int | None = None, min_sequence: int = 0, now_ms: int | None = None) -> None:
    body = payload(manifest)
    if expected_build is not None and manifest["nativeBuild"] != expected_build:
        raise ValueError("Manifest is signed for another Android build")
    if manifest["sequence"] <= min_sequence:
        raise ValueError("Replayed or downgraded update sequence")
    if (int(time.time() * 1000) if now_ms is None else now_ms) >= manifest["expiresAt"]:
        raise ValueError("Expired update")
    try:
        signature = base64.b64decode(manifest["signature"], validate=True)
    except (KeyError, ValueError) as e:
        raise ValueError("Missing or invalid signature") from e
    with tempfile.TemporaryDirectory() as tmp:
        data_path, signature_path = Path(tmp) / "payload", Path(tmp) / "signature"
        data_path.write_bytes(body)
        signature_path.write_bytes(signature)
        result = subprocess.run(
            ["openssl", "dgst", "-sha256", "-verify", str(key), "-signature", str(signature_path), str(data_path)],
            capture_output=True, text=True, check=False,
        )
    if result.returncode != 0:
        raise ValueError("ECDSA signature verification failed")

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="action", required=True)
    sign = commands.add_parser("sign", help="Sign manifest offline with private key outside Git")
    sign.add_argument("manifest", type=Path)
    sign.add_argument("output", type=Path)
    sign.add_argument("--private-key", required=True, type=Path)
    sign.add_argument("--public-key", required=True, type=Path)
    check = commands.add_parser("verify", help="Check signature and anti-replay policy")
    check.add_argument("manifest", type=Path)
    check.add_argument("--public-key", required=True, type=Path)
    check.add_argument("--build", type=int)
    check.add_argument("--last-sequence", type=int, default=0)
    args = parser.parse_args(argv)
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        if args.action == "sign":
            if args.manifest.resolve() == args.output.resolve():
                raise ValueError("Save signed manifest to a separate path")
            body = payload(manifest)
            # Only public-key bytes may ever be committed. Never print the private key.
            command = ["openssl", "dgst", "-sha256"]
            # Private key can stay encrypted at rest. Passphrase must be supplied
            # via the process environment, never command-line plaintext.
            if os.environ.get("AOQAT_UPDATE_KEY_PASSPHRASE"):
                command += ["-passin", "env:AOQAT_UPDATE_KEY_PASSPHRASE"]
            command += ["-sign", str(args.private_key)]
            result = subprocess.run(
                command, input=body, capture_output=True, check=True
            )
            manifest["signature"] = base64.b64encode(result.stdout).decode("ascii")
            verify(manifest, args.public_key, expected_build=manifest["nativeBuild"],
                   min_sequence=manifest["sequence"]-1)
            args.output.write_text(json.dumps(manifest, separators=(",", ":")), encoding="utf-8")
            print("PASS: signed manifest validated using public key; private key not logged")
        else:
            verify(manifest, args.public_key, expected_build=args.build,
                   min_sequence=args.last_sequence)
            print("PASS: signature, build, expiry and anti-replay verified")
    except (KeyError, OSError, ValueError, subprocess.CalledProcessError) as exc:
        print("FAIL:", str(exc), file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
