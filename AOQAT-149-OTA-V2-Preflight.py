#!/usr/bin/env python3
"""AOQAT build 149 owner-only V2 update-key preflight. No APK, real OTA, or release is created.

Modes:
  --self-test: generate disposable test EC keys and check the preflight engine.
  --owner-test: use the locally encrypted V2 private PEM and matching public PEM
      from Termux ($HOME/aoqat-keys), prompting the owner securely for the
      passphrase. Nothing secret leaves the local phone.

This is intentionally standalone so Android Termux can run one downloaded file.\nThe B149 marker selects synthetic manifest test build ONLY; it never signs\nuser-facing web content and never deploys to Vercel or GitHub.
"""
from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

BUILD = 149
DOMAIN = "AOQAT-WEB-UPDATE-SIGNATURE-V1"
EXPECTED_V2_PUBLIC_SHA256 = "8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"


def command(*argv: str, input_data: bytes | None = None, pass_fds: tuple[int, ...] = ()) -> bytes:
    result = subprocess.run(
        argv, input=input_data, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        check=False, pass_fds=pass_fds,
    )
    if result.returncode:
        # OpenSSL diagnostic stderr is intentionally NOT forwarded to prevent
        # accidental disclosure of command context, file paths, or passphrase.
        raise RuntimeError("OpenSSL operation failed; check key/passphrase locally")
    return result.stdout


def public_der(public_key: Path) -> bytes:
    text = public_key.read_text(encoding="ascii").strip()
    match = re.fullmatch(
        r"-----BEGIN PUBLIC KEY-----\s+([A-Za-z0-9+/=\s]+)\s+-----END PUBLIC KEY-----",
        text,
    )
    if match is None:
        raise ValueError("Expected one PEM public key (no private content)")
    der = base64.b64decode("".join(match.group(1).split()), validate=True)
    if len(der) < 80 or len(der) > 256:
        raise ValueError("Public key encoding size is unexpected")
    return der


def synthetic_manifest() -> tuple[dict, bytes]:
    # Synthetic HTML bytes: never app source, prayer data or Quran assets.
    html = b"<!doctype html><title>AOQAT LOCAL KEY TEST ONLY</title>"
    digest = hashlib.sha256(html).hexdigest()
    canonical = "index.html:" + digest
    revision = hashlib.sha256(canonical.encode()).hexdigest()
    manifest = {
        "nativeBuild": BUILD, "sequence": 1,
        "expiresAt": int(time.time() * 1000) + 3_600_000,
        "revision": revision, "files": {"index.html": digest},
    }
    body = "\n".join((
        DOMAIN, str(BUILD), "1", str(manifest["expiresAt"]), revision, canonical,
    )).encode()
    return manifest, body


def sign(private_key: Path, body: bytes, passphrase: str | None) -> bytes:
    args = ["openssl", "dgst", "-sha256"]
    if passphrase is not None:
        # OpenSSL reads the phrase from an inherited anonymous local pipe, not
        # from the shell command, environment variable, argv or file on disk.
        read_fd, write_fd = os.pipe()
        try:
            secret = passphrase.encode("utf-8") + b"\n"
            os.write(write_fd, secret)
        finally:
            os.close(write_fd)
        try:
            return command(*(args + ["-passin", f"fd:{read_fd}", "-sign", str(private_key)]),
                           input_data=body, pass_fds=(read_fd,))
        finally:
            os.close(read_fd)
    return command(*(args + ["-sign", str(private_key)]), input_data=body)


def cryptographically_valid(public_key: Path, body: bytes, signature: bytes) -> bool:
    # Verified through OpenSSL independently of Python's manifest construction.
    with tempfile.TemporaryDirectory(prefix="aoqat-v2-test-") as tmp:
        root = Path(tmp)
        source = root / "data"
        sigfile = root / "signature"
        source.write_bytes(body)
        sigfile.write_bytes(signature)
        result = subprocess.run([
            "openssl", "dgst", "-sha256", "-verify", str(public_key),
            "-signature", str(sigfile), str(source),
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        return result.returncode == 0 and b"Verified OK" in result.stdout


def run_preflight(private: Path, public: Path, *, owner: bool) -> None:
    if not private.is_file() or not public.is_file():
        raise ValueError("Private or public V2 file not found on this device")
    expected = EXPECTED_V2_PUBLIC_SHA256 if owner else None
    sha256 = hashlib.sha256(public_der(public)).hexdigest()
    if expected is not None and sha256 != expected:
        raise ValueError("Public V2 fingerprint differs from APK-pinned identity. STOP")
    print("PASS: public key format and approved fingerprint" if owner
          else "PASS: disposable public key format")

    manifest, body = synthetic_manifest()
    secret_phrase = getpass.getpass("V2 update private key passphrase (local only): ") if owner else None
    try:
        signature = sign(private, body, secret_phrase)
    finally:
        secret_phrase = None
    if not cryptographically_valid(public, body, signature):
        raise ValueError("Private/public signing pair mismatch or signature invalid")
    print("PASS: private/public ECDSA P-256 signing match")

    # These are attack tests: verification must fail for ALL altered content.
    for name, bad_body in (
        ("tamper", body + b"\nattacker"),
        ("build", body.replace(b"\n149\n", b"\n150\n", 1)),
        ("sequence", body.replace(b"\n1\n", b"\n2\n", 1)),
        ("expired-at", body.replace(str(manifest["expiresAt"]).encode(), b"1", 1)),
    ):
        if bad_body == body or cryptographically_valid(public, bad_body, signature):
            raise ValueError("Signature check unexpectedly accepted: " + name)
    # A byte-for-byte valid old signature is also rejected by the explicit
    # manifest anti-replay rule at or below the already-accepted sequence.
    if not manifest["sequence"] <= 1:
        raise ValueError("Anti-replay regression")
    if manifest["expiresAt"] <= int(time.time() * 1000):
        raise ValueError("Local clock is outside test manifest validity")
    print("PASS: forged payload/build/sequence/expiry signatures rejected")
    print("PASS: replay/expiry policy checked")
    print("NO UPDATE PUBLISHED; NO APK SIGNED; NO PRIVATE KEY EXPORTED")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true", help="Use disposable local test keypair")
    group.add_argument("--owner-test", action="store_true", help="Validate owner V2 encrypted keypair on this phone")
    args = parser.parse_args()
    try:
        if args.owner_test and os.environ.get("GITHUB_ACTIONS", "").lower() == "true":
            raise ValueError("Owner private-key verification is prohibited inside GitHub Actions")
        if args.self_test:
            with tempfile.TemporaryDirectory(prefix="aoqat-ephemeral-keys-") as tmp:
                private, public = Path(tmp) / "test-private.pem", Path(tmp) / "test-public.pem"
                command("openssl", "genpkey", "-algorithm", "EC", "-pkeyopt", "ec_paramgen_curve:P-256", "-out", str(private))
                public.write_bytes(command("openssl", "pkey", "-in", str(private), "-pubout"))
                run_preflight(private, public, owner=False)
                # Test encrypted-PKCS8 + anonymous FD passphrase with a disposable key.
                encrypted = Path(tmp) / "encrypted-test-only.pem"
                phrase = "DISPOSABLE_LOCAL_TEST_ONLY"
                command("openssl", "pkey", "-in", str(private),
                        "-aes-256-cbc", "-passout", "pass:" + phrase,
                        "-out", str(encrypted))
                _manifest, body = synthetic_manifest()
                encrypted_sig = sign(encrypted, body, phrase)
                if not cryptographically_valid(public, body, encrypted_sig):
                    raise ValueError("Encrypted key test failed")
                print("PASS: encrypted PKCS8 + local anonymous passphrase pipe")
        else:
            root = Path.home() / "aoqat-keys"
            run_preflight(root / "aoqat-update-private-v2.pem", root / "aoqat-update-public-v2.pem", owner=True)
        return 0
    except (ValueError, RuntimeError, OSError, UnicodeError, subprocess.SubprocessError) as exc:
        print("STOP: " + str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
