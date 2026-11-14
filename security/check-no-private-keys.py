#!/usr/bin/env python3
"""Reject tracked private signing material before any CI build.

A public P-256 PEM and a public X.509 certificate are the *only* key material
allowed in Git. Do not attempt to identify private signing files by content
alone; reject dangerous filename extensions and signing-directory files too.
"""
from __future__ import annotations

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_CERTS = {
    "security/aoqat-update-public-v2.pem",
    "security/aoqat-apk-public-v2.crt",
}
PRIVATE_SUFFIXES = (
    ".p12", ".pfx", ".jks", ".keystore", ".pk8", ".pkcs8",
    ".key", ".secret", ".keystore.b64", ".p12.b64", ".jks.b64",
)
SCAN_SUFFIXES = {".txt", ".md", ".py", ".sh", ".kt", ".java",
                 ".yml", ".yaml", ".gradle", ".properties", ".json"}


def violation(name: str) -> str | None:
    lower = name.lower()
    if name in PUBLIC_CERTS:
        return None
    leaf = Path(lower).name
    if lower.endswith(PRIVATE_SUFFIXES):
        return "potential private signing key or keystore"
    if lower.endswith((".pem", ".crt", ".cer", ".der")):
        return "new unreviewed certificate or PEM key file"
    if lower.startswith("android-native/signing/") and not leaf.endswith((".md", ".txt")):
        return "signing directory must not contain key material"
    if leaf in {".env", ".env.production", ".env.local", "credentials.json"}:
        return "unreviewed credential configuration"
    return None


def main() -> int:
    result = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, check=True
    )
    names = [x.decode("utf-8") for x in result.stdout.split(b"\0") if x]
    failures: list[str] = []
    for name in names:
        problem = violation(name)
        if problem:
            failures.append(f"{name}: {problem}")
            continue
        path = ROOT / name
        if path.suffix.lower() not in SCAN_SUFFIXES or not path.is_file() or path.stat().st_size > 2_000_000:
            continue
        # Build markers dynamically so this guard doesn't falsely flag itself.
        markers = ["-----BEGIN " + prefix + " PRIVATE KEY-----"
                   for prefix in ("", "ENCRYPTED", "RSA", "EC", "DSA", "OPENSSH")]
        try:
            contents = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if any(marker in contents for marker in markers):
            failures.append(f"{name}: embedded private key PEM block")

    if failures:
        print("BLOCK: potential private signing material in tracked repository files:")
        print("\n".join(failures))
        return 1
    print(f"PASS: no tracked private signer artifacts detected ({len(names)} tracked files)")
    print("Only the owner-controlled public update PEM and public APK certificate are allowed")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"FAIL: unable to inspect tracked repository files: {exc}", file=sys.stderr)
        sys.exit(1)
