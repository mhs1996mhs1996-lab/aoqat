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
