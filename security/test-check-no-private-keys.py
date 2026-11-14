#!/usr/bin/env python3
"""Regression tests: never allow APK/OTA signing secrets to be committed."""
import importlib.util
from pathlib import Path
import unittest

tool = Path(__file__).resolve().parent / "check-no-private-keys.py"
spec = importlib.util.spec_from_file_location("no_private_signers", tool)
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class KeyMaterialTests(unittest.TestCase):
    def test_exact_public_owner_files_are_allowed(self):
        for name in ("security/aoqat-update-public-v2.pem",
                     "security/aoqat-apk-public-v2.crt"):
            self.assertIsNone(checker.violation(name), name)

    def test_private_pkcs12_jks_and_encrypted_files_rejected(self):
        for name in ("android-native/keys/release.p12",
                     "android-native/keys/release.jks",
                     "security/aoqat-update-private-v2.pem",
                     "android-native/signing/debug.keystore.b64",
                     "assets/fake-public-rotation.pem",
                     "android-native/app/src/main/other.pfx",
                     "my-backup.p12.b64"):
            self.assertIsNotNone(checker.violation(name), name)

    def test_unrelated_sources_are_not_blocked(self):
        for name in ("js/prayer-countdown.js", "assets/quran.json",
                     "security/APK-SIGNING-ROTATION.md",
                     "android-native/app/src/main/java/com/aoqat/calendar/MainActivity.kt"):
            self.assertIsNone(checker.violation(name), name)

    def test_environment_credentials_are_rejected(self):
        for name in (".env", "android-native/.env.production",
                     "security/credentials.json"):
            self.assertIsNotNone(checker.violation(name), name)


if __name__ == "__main__":
    unittest.main()
