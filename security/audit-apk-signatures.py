#!/usr/bin/env python3
"""Read-only APK signing audit for a FUTURE owner-signed migration candidate.

No private key/keystore/password is used. This audit is NOT sufficient to
approve an install-over upgrade; test on real Android devices with user data.
Official syntax: https://developer.android.com/tools/apksigner
"""
from __future__ import annotations

import argparse
from pathlib import Path
import re
import shutil
import subprocess
import sys

# Known certificate identities: inspect real signer, not its filename.
OWNER_V2 = "9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765"
EXPOSED_OLD = "aa72af7eb8b22501686b77e86f6c0bf1c6a1b61378cf67ca705076282357b496"
APIS = (26, 27, 28, 32, 33, 35)
FINGERPRINT = re.compile(
    r"(?im)^Signer #\d+ certificate SHA-256 digest:\s*([0-9A-Fa-f:]+)\s*$"
)


def parse_signer_digests(apksigner_output: str) -> set[str]:
    return {candidate.replace(":", "").lower()
            for candidate in FINGERPRINT.findall(apksigner_output)}


def classify(digests: set[str]) -> str:
    if digests == {OWNER_V2}:
        return "OWNER_V2"
    if digests == {EXPOSED_OLD}:
        return "EXPOSED_OLD"
    return "UNKNOWN_OR_MULTIPLE"


def inspect(apksigner: str, apk: Path, api: int) -> tuple[str, str]:
    command = [
        apksigner, "verify", "--verbose", "--print-certs",
        "--min-sdk-version", str(api), "--max-sdk-version", str(api), str(apk)
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    combined = result.stdout + "\n" + result.stderr
    if result.returncode:
        return "VERIFICATION_FAILED", combined.strip()[-1200:]
    digests = parse_signer_digests(combined)
    return classify(digests), ", ".join(sorted(digests))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path, help="APK that was already signed OFFLINE by its owner")
    parser.add_argument("--apksigner", default="apksigner", help="Path to the Android SDK apksigner binary")
    parser.add_argument("--original-apk", type=Path,
                        help="Optional actual installed v2.10 APK for certificate comparison")
    args = parser.parse_args()
    if not args.apk.is_file():
        parser.error("No signed candidate APK at the supplied path")
    if args.original_apk and not args.original_apk.is_file():
        parser.error("No original installed APK at the supplied path")
    if not shutil.which(args.apksigner) and not Path(args.apksigner).is_file():
        parser.error("Android SDK apksigner not available (install Android SDK build-tools)")
    error = False
    print("READ-ONLY SIGNATURE AUDIT; no keys or passwords needed")
    for api in APIS:
        observed, fingerprint = inspect(args.apksigner, args.apk, api)
        print(f"Android API {api}: {observed}; cert={fingerprint}")
        if observed not in ("OWNER_V2", "EXPOSED_OLD"):
            error = True
        if api < 28:
            print("  HOLD: Android 8/8.1 cannot migrate old->V2 through v3 lineage;"
                  " keep user data and design consent-based export/import.")
        elif observed == "EXPOSED_OLD":
            print("  SECURITY HOLD: still using exposed old signer on this Android version.")
        elif observed == "OWNER_V2":
            print("  PENDING DEVICE TEST: correct new certificate alone does NOT prove"
                  " that an installed old-signer APK can upgrade via valid lineage.")

        if args.original_apk:
            old, old_fp = inspect(args.apksigner, args.original_apk, api)
            print(f"  ORIGINAL APK: {old}; cert={old_fp}")
            if old != "EXPOSED_OLD":
                print("  ERROR: original installed APK's signer does not match recorded v2.10 identity")
                error = True
    print("STOP: this audit never authorizes installation, migration or publishing.")
    return 1 if error else 0


if __name__ == "__main__":
    sys.exit(main())
