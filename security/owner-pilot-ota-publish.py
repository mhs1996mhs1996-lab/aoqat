#!/usr/bin/env python3
"""Prepare signed pilot-only web OTA bytes from reviewed source; no network writes.

Called only on explicit owner request with a GitHub environment secret.
Signs APK-INTEGRATED staged assets; never signs unmodified hosted web sources.
This script never reads the production OTA private key or production feed.
"""
import argparse
import hashlib
import importlib.util
import json
import os
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# The web repository files are NOT the same bytes as the offline Android APK.
# prepare-web-assets.py changes the menu and Quran scripts, and packs the
# JavaScript into an APK-specific startup bundle. The OTA MUST preserve it.
APK_WEB_ASSETS = ROOT / "android-native/app/src/main/assets/www"
SIGNER = ROOT / "security/owner-pilot-auto-ota-sign.py"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def load_signer():
    spec = importlib.util.spec_from_file_location("aoqat_pilot_signer", SIGNER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def prepare(secret_key, output_dir, sequence):
    signer = load_signer()
    if not APK_WEB_ASSETS.is_dir():
        raise ValueError("APK-specific web assets missing. Run Gradle syncWebAssets first.")
    html = (APK_WEB_ASSETS / "index.html").read_bytes()
    # These markers prove we are signing the *APK integrated* web view, not
    # the separately hosted web source (whose menu and Quran differ).
    if (b'js/apk-startup-bundle.js' not in html or
            b'js/android-back-navigation.js' not in html or
            not (APK_WEB_ASSETS / "js/apk-startup-bundle.js").is_file()):
        raise ValueError("APK-specific startup bundle not generated")
    files = {"index.html": html}
    for kind, suffix in (("js", ".js"), ("css", ".css")):
        for path in sorted((APK_WEB_ASSETS / kind).rglob("*")):
            if not path.is_file() or path.suffix != suffix:
                continue
            rel = path.relative_to(APK_WEB_ASSETS).as_posix()
            if not signer.allowed(rel):
                raise ValueError("Disallowed staged APK JS/CSS path: " + rel)
            files[rel] = path.read_bytes()
    if b'privacyPolicy' not in files["js/apk-startup-bundle.js"]:
        raise ValueError("Required approved privacy entry absent from staged APK bundle")
    assert len(files) <= 250
    assert all(len(data) <= signer.MAX_FILE for data in files.values())
    assert sum(map(len, files.values())) <= signer.MAX_TOTAL
    if len(files) < 2:
        raise ValueError("No web content to release")
    output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="pilot-ota-prepare-") as scratch:
        candidate = Path(scratch) / "candidate.zip"
        signed = Path(scratch) / "signed.zip"
        with zipfile.ZipFile(candidate, "w", zipfile.ZIP_DEFLATED) as z:
            for name, body in sorted(files.items()):
                z.writestr(name, body)
        # Derive the pilot public certificate from the *ephemeral* signing
        # key and require its exact pinned fingerprint; never track PEM files.
        public = Path(scratch) / "pilot-public.pem"
        public.write_bytes(signer.openssl("pkey", "-in", str(secret_key), "-pubout"))
        proof = signer.sign_candidate(candidate, secret_key, public, sequence,
                                      signed, password=None, require_pinned_key=True)
        with zipfile.ZipFile(signed) as z:
            manifest = json.loads(z.read(signer.ROOT + "manifest.json"))
            signed_names = {"manifest.json"} | {"files/" + n for n in files}
            archive_names = {n.removeprefix(signer.ROOT) for n in z.namelist()}
            assert archive_names == signed_names
            assert manifest["channel"] == "owner-pilot"
            assert manifest["sequence"] == sequence
            assert manifest["nativeBuild"] == signer.BUILD
            for name, body in files.items():
                assert manifest["files"][name] == digest(body)
                assert z.read(signer.ROOT + "files/" + name) == body
            signer.verify_signature(manifest, public)
        # Export the *same* verified public bytes that were signed, never the key.
        payload_root = output_dir / signer.ROOT
        payload_root.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(signed) as z:
            for item in z.namelist():
                dest = output_dir / item
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(z.read(item))
    print("PASS: owner pilot only; signed bundle verified, no production path")
    print("PILOT-MANIFEST-SHA256:", proof["manifest_sha256"])
    print("PILOT-REVISION:", manifest["revision"])
    print("PILOT-SIGNED-FILE-COUNT:", len(files))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--secret-key", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--sequence", required=True, type=int)
    args = parser.parse_args()
    prepare(args.secret_key, args.output_dir, args.sequence)
