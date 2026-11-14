#!/usr/bin/env python3
"""Ensure the isolated V2 security branch does not change unrelated project files.

Reference: immutable v2.10 release commit, not a moving remote branch.
Protects *both* shipped web files and unrelated Android/native files.
Approved scope is intentionally small and explicit. This gate is supplementary
to sacred-content/secret scanning and independent human review.
"""
from __future__ import annotations

import subprocess
import sys

BASELINE = "adbce560c254c8e142c60d5d2d5b3fde75c2b5a7"

# Exact old files that may be modified for secure OTA / external APK signing.
MAY_MODIFY = frozenset({
    ".github/workflows/build-android-apk.yml",
    ".github/workflows/build-v210-fast-partial-updates.yml",
    "android-native/app/build.gradle",
    "android-native/app/src/main/java/com/aoqat/calendar/MainActivity.kt",
    "android-native/app/src/main/java/com/aoqat/calendar/WebLocalContent.kt",
    "android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt",
    "android-native/app/src/main/res/xml/backup_rules.xml",
    "android-native/app/src/main/res/xml/data_extraction_rules.xml",
    "android-native/app/src/test/java/com/aoqat/calendar/WebUpdatesTest.kt",
})

# Only these new Android code/test files and CI guard assets may be created.
MAY_ADD = frozenset({
    ".github/CODEOWNERS",
    ".github/workflows/guard-sacred-content.yml",
    ".github/workflows/publish-signed-build146.yml",
    ".github/workflows/security-emulator-apk-rotation.yml",
    ".github/workflows/security-native-ci.yml",
    ".github/workflows/prepare-unsigned-v2-beta.yml",
    "android-native/app/src/main/java/com/aoqat/calendar/SignedWebUpdateManifest.kt",
    "android-native/app/src/test/java/com/aoqat/calendar/SignedWebUpdateManifestTest.kt",
    "android-native/app/src/test/java/com/aoqat/calendar/WebLocalContentMigrationTest.kt",
})

# The previously exposed keystore MUST disappear, not be renamed or modified.
MUST_DELETE = frozenset({
    "android-native/signing/aoqat-stable-debug.keystore.b64",
})


def violations(changes: list[tuple[str, str]]) -> list[str]:
    bad = []
    for status, path in changes:
        # New, isolated security documents/scripts/tests can be committed,
        # but cannot be used as a backdoor to change unrelated project files.
        if path.startswith("security/") and status in ("A", "M"):
            continue
        if (status == "M" and path in MAY_MODIFY or
                status == "A" and path in MAY_ADD or
                status == "D" and path in MUST_DELETE):
            continue
        bad.append(f"{status}\t{path}")
    return bad


def current_changes() -> list[tuple[str, str]]:
    output = subprocess.check_output(
        ["git", "diff", "--no-renames", "--name-status", BASELINE, "HEAD", "--"],
        stderr=subprocess.PIPE,
        text=True,
    )
    entries = []
    for line in output.splitlines():
        status, sep, path = line.partition("\t")
        if not sep or status not in ("A", "M", "D"):
            raise ValueError(f"Unrecognized git diff status: {line!r}")
        entries.append((status, path))
    return entries


def check() -> None:
    entries = current_changes()
    bad = violations(entries)
    deleted = {path for status, path in entries if status == "D"}
    if not MUST_DELETE.issubset(deleted):
        bad += [f"OLD_SIGNER_STILL_PRESENT\t{path}" for path in sorted(MUST_DELETE-deleted)]
    if bad:
        print("BLOCKED: security trial changed files outside the authorized scope:",
              file=sys.stderr)
        for item in bad:
            print("  " + item, file=sys.stderr)
        print("Never change web UI, Quran/prayer sources, native reminders, or APK "
              "features without a separate owner-reviewed request.", file=sys.stderr)
        raise SystemExit(1)
    print(f"PASS: {len(entries)} security-scope changes only; hosted web and "
          "unrelated APK content exactly match frozen v2.10 baseline.")


if __name__ == "__main__":
    try:
        check()
    except (subprocess.CalledProcessError, ValueError) as exc:
        print("FAIL: could not verify immutable project scope:", exc,
              file=sys.stderr)
        sys.exit(2)
