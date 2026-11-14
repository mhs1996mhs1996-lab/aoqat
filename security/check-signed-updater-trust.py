#!/usr/bin/env python3
"""Fail-closed static guard against accidental publisher-key/trust-chain downgrade."""
from pathlib import Path
import base64
import hashlib
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
EXPECTED_SPKI_SHA256 = "4f1b6cbdc46bc70647d3947a98e742f87037e6bcb80fc7f5846060b4896d9069"

def main():
    updates = (ROOT / "android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    native = (ROOT / "android-native/app/src/main/java/com/aoqat/calendar/MainActivity.kt").read_text()
    gradle = (ROOT / "android-native/app/build.gradle").read_text()
    match = re.search(r'const val SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"', updates)
    assert match, "Missing pinned publisher public key"
    actual = hashlib.sha256(base64.b64decode(match.group(1), validate=True)).hexdigest()
    assert actual == EXPECTED_SPKI_SHA256, "Publisher identity changed without key rotation review"
    assert "SignedWebUpdateManifest.verify(" in updates
    assert updates.index("SignedWebUpdateManifest.verify(") < updates.index('fetch("files/$path"'), "Files downloaded before signature verification"
    assert "web-updates-v2-signed" in updates and "web_updates_v2_signed" in updates
    assert "webUpdates.confirmStartup()" in native
    assert "allowUniversalAccessFromFileURLs = false" in native
    assert "allowFileAccessFromFileURLs = false" in native
    assert "versionCode 146" in gradle, "Only the isolated security build 146 can use this key"
    assert "storePassword 'android'" not in gradle, "Old APK signing secret still hard-coded"
    assert not (ROOT/"android-native/signing/aoqat-stable-debug.keystore.b64").exists(), "Exposed old signing key still tracked"
    for file in (ROOT/"android-native/app/src/main/res/xml/backup_rules.xml", ROOT/"android-native/app/src/main/res/xml/data_extraction_rules.xml"):
        assert 'web_updates_v2_signed.xml' in file.read_text(), "Updater anti-replay state backed up"
    print("PASS: pinned OTA publisher, signed-before-download, rollback confirmation, restricted WebView and external-only APK signing")

if __name__ == "__main__":
    try:
        main()
    except (AssertionError, ValueError, OSError) as e:
        print("FAIL:", str(e), file=sys.stderr)
        sys.exit(1)
