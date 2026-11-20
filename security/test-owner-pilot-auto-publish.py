#!/usr/bin/env python3
"""Smoke test the exact owner-pilot publication packager using disposable keys.

NO real key, network, repository write, production endpoint or release request.
It verifies the public APK pin, pilot signature, all output hashes and no
private files escaping into the candidate.
"""
import base64
import hashlib
import importlib.util
import json
import re
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    signer = load("pilot_signer_test", ROOT / "security/owner-pilot-auto-ota-sign.py")
    publisher = load("pilot_publisher_test", ROOT / "security/owner-pilot-ota-publish.py")

    source = (ROOT / "android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt").read_text()
    match = re.search(r'const val PILOT_SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"', source)
    assert match, "Pilot signature pin must exist in the native APK source"
    native_pub = base64.b64decode(match.group(1), validate=True)
    actual = hashlib.sha256(native_pub).hexdigest()
    assert actual == signer.PINNED_PUBLIC_KEY_SPKI, "APK pilot key must match publisher pin"
    prod_pub = re.search(r'const val SIGNING_PUBLIC_KEY_B64\s*=\s*"([^"]+)"', source)
    assert prod_pub and native_pub != base64.b64decode(prod_pub.group(1), validate=True)
    print("PASS: pilot pin matches APK; production key is different")

    # Regression guard: never silently disable the pilot's automatic polling.
    begin = source.index("    fun check() {")
    end = source.index("    internal fun checkNow()", begin)
    check_body = source[begin:end]
    assert "if (BuildConfig.OWNER_PILOT_ENABLED) return" not in check_body, (
        "Owner-pilot auto OTA was disabled in WebUpdates.check()"
    )
    assert "Thread {" in check_body and "checkNow()" in check_body
    assert 'if (BuildConfig.OWNER_PILOT_ENABLED) "owner-pilot" else "production"' in source
    assert "raw.githubusercontent.com/mhs1996mhs1996-lab/aoqat/owner-pilot-ota/" in source
    assert 'else if (build >= 145) "https://aoqat.vercel.app/android-updates/build-$build/"' in source
    main = (ROOT / "android-native/app/src/main/java/com/aoqat/calendar/MainActivity.kt").read_text()
    assert "if (::webUpdates.isInitialized) webUpdates.check()" in main
    assert "ownerPilotOtaHandler.postDelayed(ownerPilotOtaPoll, WebUpdates.MIN_CHECK_INTERVAL_MS)" in main
    assert "if (::webUpdates.isInitialized) webUpdates.check()" in main[
        main.index("private val ownerPilotOtaPoll"):main.index("private lateinit var webView")
    ]
    assert "webUpdates.check()" in main[
        main.index("private fun configureWebView()"):main.index("webView.webViewClient")
    ]
    print("PASS: owner pilot checks on startup/resume and repeatedly in foreground; production URL unchanged")

    with tempfile.TemporaryDirectory(prefix="pilot-ota-e2e-no-secret-") as folder:
        tmp = Path(folder)
        private = tmp / "DISPOSABLE-private.pem"
        public = tmp / "DISPOSABLE-public.pem"
        signer.openssl("ecparam", "-name", "prime256v1", "-genkey", "-noout",
                       "-out", str(private))
        public.write_bytes(signer.openssl("pkey", "-in", str(private), "-pubout"))
        fake_pin = signer.key_fingerprint(public)
        try:
            signer.sign_candidate(tmp / "missing.zip", private, public, 1,
                                  tmp / "not-allowed.zip")
        except ValueError:
            pass
        else:
            raise AssertionError("Signing must reject missing candidate")

        # Override only test runtime's expected fingerprint; repo stays unchanged.
        signer.PINNED_PUBLIC_KEY_SPKI = fake_pin
        publisher.load_signer = lambda: signer
        output = tmp / "feed"
        publisher.prepare(private, output, 1)

        root = output / "android-updates/owner-pilot/build-150"
        manifest_path = root / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        assert manifest["channel"] == "owner-pilot"
        assert manifest["nativeBuild"] == 150
        assert manifest["sequence"] == 1
        assert "index.html" in manifest["files"]
        assert all(signer.allowed(p) for p in manifest["files"])
        signer.verify_signature(manifest, public)

        total = 0
        for name, digest in manifest["files"].items():
            content = (root / "files" / name).read_bytes()
            assert signer.digest(content) == digest, name
            assert len(content) <= signer.MAX_FILE
            total += len(content)
        assert total <= signer.MAX_TOTAL
        # The generated signing payload must EXACTLY match the APK-specific
        # staged bytes. A raw web file would remove Android's startup bundle.
        stage = publisher.APK_WEB_ASSETS
        assert (stage / "index.html").read_bytes() == (root / "files/index.html").read_bytes()
        assert b'js/apk-startup-bundle.js' in (root / "files/index.html").read_bytes()
        assert b'privacyPolicy' in (root / "files/js/apk-startup-bundle.js").read_bytes()
        assert b'aoqatPersonalProfile' in (root / "files/js/apk-startup-bundle.js").read_bytes(), "Local profile content missing"
        assert b'aoqatOwnerSeq4Buttons' not in (root / "files/js/apk-startup-bundle.js").read_bytes(), "Obsolete test buttons retained"
        for name in manifest["files"]:
            assert (stage / name).read_bytes() == (root / "files" / name).read_bytes(), name
        # In the build job, check the very same bytes inside the unsigned
        # ownerPilot APK artifact, not only an intermediate folder.
        apks = list((ROOT / "android-native/app/build/outputs/apk/ownerPilot").glob("*unsigned.apk"))
        if apks:
            with zipfile.ZipFile(apks[0]) as apk:
                for name in manifest["files"]:
                    assert apk.read("assets/www/" + name) == (root / "files" / name).read_bytes(), name
            print("PASS: signed payload matches every packaged ownerPilot APK override")
        assert set(p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()) == {
            "manifest.json", *(f"files/{p}" for p in manifest["files"])
        }
        assert not list(output.rglob("*.pem"))
        assert not list(output.rglob("*.p12"))
        assert not list(output.rglob("*.apk"))
        print(f"PASS: signed isolated feed {len(manifest['files'])} permitted files, "
              f"{total} bytes, no secrets or native data")
        forged = dict(manifest)
        forged["sequence"] += 1
        try:
            signer.verify_signature(forged, public)
        except ValueError:
            pass
        else:
            raise AssertionError("Manifest forgery was accepted")
        print("PASS: forged signed pilot sequence rejected")


if __name__ == "__main__":
    main()
