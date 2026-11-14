#!/usr/bin/env python3
"""Fail-closed static guard against accidental publisher-key/trust-chain downgrade."""
from pathlib import Path
import base64
import hashlib
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
EXPECTED_SPKI_SHA256 = "8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
EXPECTED_APK_CERT_SHA256 = "9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765"

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
    # Independent public APK certificate. The private .p12 is NEVER available
    # to CI. Reject any unreviewed replacement of the owner's new certificate.
    apk_certificate = ROOT / "security/aoqat-apk-public-v2.crt"
    cert_lines = [line.strip() for line in apk_certificate.read_text().splitlines()
                  if line.strip()]
    assert len(cert_lines) >= 3 and cert_lines[0] == "-----BEGIN CERTIFICATE-----" and \\
        cert_lines[-1] == "-----END CERTIFICATE-----", "Invalid V2 APK public certificate PEM"
    cert_der = base64.b64decode("".join(cert_lines[1:-1]), validate=True)
    assert hashlib.sha256(cert_der).hexdigest() == EXPECTED_APK_CERT_SHA256, "APK V2 public certificate changed"

    check_now = updates.split("internal fun checkNow()", 1)[1].split("companion object", 1)[0]
    assert "SignedWebUpdateManifest.verify(" in check_now, "No publisher check in update download path"
    assert check_now.index("SignedWebUpdateManifest.verify(") < check_now.index('fetch("files/$path"'), "Files downloaded before signature verification"
    assert 'if (path !in signedActivePaths) return null' in updates, "Unsigned local snapshot file could be served"
    assert 'getJSONObject("files").keys().asSequence().toSet()' in updates, "Snapshot allowlist not derived from signed manifest"
    assert "web-updates-v2-signed" in updates and "web_updates_v2_signed" in updates
    assert "webUpdates.confirmStartup()" in native
    assert "allowUniversalAccessFromFileURLs = false" in native
    assert "allowFileAccessFromFileURLs = false" in native
    assert "shouldOverrideUrlLoading(" in native
    local = (ROOT / "android-native/app/src/main/java/com/aoqat/calendar/WebLocalContent.kt").read_text()
    assert "frame-src 'none'; object-src 'none'; base-uri 'self'" in local
    assert "versionCode 146" in gradle, "Only the isolated security build 146 can use this key"
    assert "storePassword 'android'" not in gradle, "Old APK signing secret still hard-coded"
    debug_section = gradle.split("debug {", 1)[1].split("release {", 1)[0]
    assert "signingConfig signingConfigs.debug" in debug_section, "Debug signing no longer isolated"
    assert "signingConfigs.secureUpgrade" not in debug_section, "Production key must never sign a debug APK"
    assert not (ROOT/"android-native/signing/aoqat-stable-debug.keystore.b64").exists(), "Exposed old signing key still tracked"
    for file in (ROOT/"android-native/app/src/main/res/xml/backup_rules.xml", ROOT/"android-native/app/src/main/res/xml/data_extraction_rules.xml"):
        assert 'web_updates_v2_signed.xml' in file.read_text(), "Updater anti-replay state backed up"
    publishing = (ROOT / ".github/workflows/publish-signed-build146.yml").read_text()
    for prohibited in ("AOQAT_UPDATE_KEY_ENCRYPTED_B64", "AOQAT_UPDATE_KEY_PASSPHRASE",
                       "git push origin HEAD:main", "Sign with encrypted private key"):
        assert prohibited not in publishing, "GitHub workflow must NEVER access private signing keys or publish"
    assert "contents: read" in publishing, "Signed update validator needs no repository write access"
    assert "security/aoqat-update-public-v2.pem" in publishing, "Offline-signed updates must validate using V2 publisher"
    print("PASS: pinned OTA publisher, signed-before-download, rollback confirmation, restricted WebView and external-only APK signing")

if __name__ == "__main__":
    try:
        main()
    except (AssertionError, ValueError, OSError) as e:
        print("FAIL:", str(e), file=sys.stderr)
        sys.exit(1)
