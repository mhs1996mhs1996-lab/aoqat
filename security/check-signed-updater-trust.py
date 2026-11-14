#!/usr/bin/env python3
"""Fail-closed static guard against accidental publisher-key/trust-chain downgrade."""
from pathlib import Path
import base64
import hashlib
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
EXPECTED_SPKI_SHA256 = "8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"

def main():
    updates = (ROOT / "android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    native = (ROOT / "android-native/app/src/main/java/com/aoqat/calendar/MainActivity.kt").read_text()
    gradle = (ROOT / "android-native/app/build.gradle").read_text()
    match = re.search(r'const val SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"', updates)
    assert match, "Missing pinned publisher public key"
    actual = hashlib.sha256(base64.b64decode(match.group(1), validate=True)).hexdigest()
    assert actual == EXPECTED_SPKI_SHA256, "Publisher identity changed without key rotation review"
    # Keep the owner-supplied public PEM, the Kotlin pin and the reviewed
    # public fingerprint identical. This file contains NO private key.
    pem_lines = [line.strip() for line in
                 (ROOT / "security/aoqat-update-public-v2.pem").read_text().splitlines()
                 if line.strip()]
    assert len(pem_lines) >= 3 and pem_lines[0] == "-----BEGIN PUBLIC KEY-----" and \
        pem_lines[-1] == "-----END PUBLIC KEY-----", "Invalid V2 public PEM"
    public_der = base64.b64decode("".join(pem_lines[1:-1]), validate=True)
    assert hashlib.sha256(public_der).hexdigest() == EXPECTED_SPKI_SHA256, "V2 public PEM fingerprint mismatch"
    assert base64.b64decode(match.group(1), validate=True) == public_der, "Kotlin pin differs from reviewed V2 public PEM"
    check_now = updates.split("internal fun checkNow()", 1)[1].split("companion object", 1)[0]
    assert "SignedWebUpdateManifest.verify(" in check_now, "No publisher check in update download path"
    assert check_now.index("SignedWebUpdateManifest.verify(") < check_now.index('fetch("files/$path"'), "Files downloaded before signature verification"
    assert "web-updates-v2-signed" in updates and "web_updates_v2_signed" in updates
    assert "webUpdates.confirmStartup()" in native
    assert "allowUniversalAccessFromFileURLs = false" in native
    assert "allowFileAccessFromFileURLs = false" in native
    assert "shouldOverrideUrlLoading(" in native
    local = (ROOT / "android-native/app/src/main/java/com/aoqat/calendar/WebLocalContent.kt").read_text()
    assert "frame-src 'none'; object-src 'none'; base-uri 'self'" in local
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
