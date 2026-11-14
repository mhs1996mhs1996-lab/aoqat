#!/usr/bin/env python3
"""Cross-check Termux V2 preflight canonical payload with actual OTA signer."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parent


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


preflight = load(ROOT / "owner-v2-key-preflight.py", "owner_preflight")
signer = load(ROOT / "signed-update-manifest.py", "signed_update_manifest")


class OwnerPreflightCompatibilityTests(unittest.TestCase):
    def test_synthetic_payload_matches_native_manifest_canonical_format(self):
        manifest, raw = preflight.synthetic_manifest()
        self.assertEqual(raw, signer.payload(manifest))
        self.assertEqual(manifest["nativeBuild"], 146)
        self.assertEqual(set(manifest["files"]), {"index.html"})

    def test_pinned_public_key_matches_reviewed_git_file(self):
        public = ROOT / "aoqat-update-public-v2.pem"
        sha = preflight.hashlib.sha256(preflight.public_der(public)).hexdigest()
        self.assertEqual(sha, preflight.EXPECTED_V2_PUBLIC_SHA256)

    def test_disposable_encrypted_signing_and_tamper_tests_pass(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "owner-v2-key-preflight.py"), "--self-test"],
            capture_output=True, text=True, check=False, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("encrypted PKCS8", result.stdout)
        self.assertIn("NO PRIVATE KEY EXPORTED", result.stdout)

    def test_owner_private_key_file_is_never_part_of_git_checkout(self):
        self.assertFalse((ROOT / "aoqat-update-private-v2.pem").exists())
        self.assertFalse((ROOT / "aoqat-apk-production-v2.p12").exists())


if __name__ == "__main__":
    unittest.main()
