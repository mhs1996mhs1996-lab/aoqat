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
APIS = (26, 27, 28, 32, 33, 35, 36)
FINGERPRINT = re.compile(
    r"(?im)^(?:Signer #\d+|V\d+(?:\.\d+)? Signer:)\s+certificate SHA-256 digest:\s*([0-9A-Fa-f:]+)\s*$"
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
    parser.add_argument("--clean-install-beta", action="store_true",
                        help="Audit a fresh V2-signed beta installation, not an in-place legacy upgrade")
    args = parser.parse_args()
    if args.clean_install_beta and args.original_apk:
        parser.error("--clean-install-beta cannot be combined with --original-apk; no in-place migration is claimed")
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
        if args.clean_install_beta:
            # A consent-based CLEAN install does not need old-signer lineage.
            # It still MUST use the one approved owner V2 identity on every API.
            if observed != "OWNER_V2":
                print("  SECURITY HOLD: clean-install beta requires the approved V2 signer")
                error = True
            elif api < 28:
                print("  CLEAN INSTALL ONLY: old trial must be removed with prior user consent;"
                      " Android 8/8.1 cannot update over the different old signer")
            else:
                print("  CLEAN INSTALL ONLY: signature matches, not a claim of old->V2 upgrade")
            continue
        if observed not in ("OWNER_V2", "EXPOSED_OLD"):
            error = True
        if api < 28:
            print("  HOLD: Android 8/8.1 cannot migrate old->V2 through v3 lineage;"
                  " keep user data and design consent-based export/import.")
            # A single universal APK cannot provide an approved in-place
            # signer migration for the existing Android 8/8.1 installs.
            error = True
        elif observed == "EXPOSED_OLD":
            print("  SECURITY HOLD: still using exposed old signer on this Android version.")
            error = True
        elif observed == "OWNER_V2":
            print("  PENDING DEVICE TEST: correct new certificate alone does NOT prove"
                  " that an installed old-signer APK can upgrade via valid lineage.")

        if args.original_apk:
            old, old_fp = inspect(args.apksigner, args.original_apk, api)
            print(f"  ORIGINAL APK: {old}; cert={old_fp}")
            if old != "EXPOSED_OLD":
                print("  ERROR: original installed APK's signer does not match recorded v2.10 identity")
                error = True
    if error:
        print("SECURITY HOLD: signature audit has blocking findings.")
    elif args.clean_install_beta:
        print("PASS: every inspected Android API accepts the exact owner V2 signing certificate.")
        print("PENDING: real-device checks, Quran/prayer integrity, owner approval, and informed beta consent.")
    print("STOP: this audit never authorizes installation, migration or publishing.")
    return 1 if error else 0


if __name__ == "__main__":
    sys.exit(main())
