#!/usr/bin/env python3
"""Adversarial tests for V2 branch-only project scope guard."""
import importlib.util
from pathlib import Path
from unittest import TestCase, main

script = Path(__file__).with_name("check-project-scope.py")
spec = importlib.util.spec_from_file_location("scope_check", script)
scope = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scope)


class ProjectScopeTests(TestCase):
    def test_allowed_security_updates(self):
        self.assertEqual(scope.violations([
            ("M", "android-native/app/build.gradle"),
            ("M", "android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt"),
            ("A", "android-native/app/src/main/java/com/aoqat/calendar/SignedWebUpdateManifest.kt"),
            ("A", "security/owner-v2-key-preflight.py"),
            ("M", "security/check-project-scope.py"),
            ("D", "android-native/signing/aoqat-stable-debug.keystore.b64"),
        ]), [])

    def test_web_site_and_data_must_remain_untouched(self):
        modified = [
            "index.html", "sw.js", "manifest.webmanifest",
            "css/style.css", "js/web-menu-order.js", "js/quran-reader.js",
            "js/adhan-core.js", "data/prayer-times-offline.json",
            "assets/quran.json", "assets/qcf-v2-page-fonts/p001.woff2",
            "android-updates/files/js/exact-export.js",
            "android-updates/build-145/manifest.json",
        ]
        self.assertEqual(len(scope.violations([("M", p) for p in modified])),
                         len(modified))

    def test_unrelated_apk_settings_notifications_audio_blocked(self):
        candidates = [
            "android-native/app/src/main/java/com/aoqat/calendar/AdhanSchedule.kt",
            "android-native/app/src/main/java/com/aoqat/calendar/PrayerAlarm.kt",
            "android-native/app/src/main/java/com/aoqat/calendar/AdhanPlaybackService.kt",
            "android-native/app/src/main/AndroidManifest.xml",
            "android-native/app/src/main/assets/www/index.html",
            "android-native/app/src/main/res/layout/main.xml",
        ]
        self.assertEqual(len(scope.violations([("M", p) for p in candidates])),
                         len(candidates))

    def test_non_security_file_added_or_deleted_is_blocked(self):
        self.assertEqual(len(scope.violations([
            ("A", "js/experimental.js"),
            ("D", "assets/quran.json"),
            ("D", "android-native/app/build.gradle"),
            ("A", ".github/workflows/publish-app.yml"),
            ("D", "security/KEY-CUSTODY.md"),
        ])), 5)

    def test_previous_exposed_signer_cannot_be_restored(self):
        self.assertTrue(scope.violations([
            ("A", "android-native/signing/aoqat-stable-debug.keystore.b64")
        ]))
        self.assertTrue(scope.violations([
            ("M", "android-native/signing/aoqat-stable-debug.keystore.b64")
        ]))


if __name__ == "__main__":
    main()
