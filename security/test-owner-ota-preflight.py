#!/usr/bin/env python3
"""Synthetic release-gate regression tests: NEVER use owner private key."""
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
import zipfile

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("preflight", ROOT / "owner-ota-preflight.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
signed = mod.load_verifier()


def run(*args, data=None):
    p = subprocess.run(args, input=data, capture_output=True, check=True)
    return p.stdout


class TestOwnerPreflight(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.private = self.root / "test.key"
        self.public = self.root / "test.pub"
        run("openssl", "ecparam", "-name", "prime256v1", "-genkey",
            "-noout", "-out", str(self.private))
        self.public.write_bytes(run("openssl", "pkey", "-in",
                                    str(self.private), "-pubout"))
        self.now = int(time.time() * 1000)
        self.base = self.make_zip("base", 3, {"index.html": b"<html>base</html>",
                                              "js/main.js": b"old"})
    def make_zip(self, name, sequence, data, wrong_hash=False, extras=None, build=150):
        hashes = {p: mod.sha(v) for p, v in data.items()}
        if wrong_hash:
            hashes["index.html"] = "f" * 64
        canonical = "\n".join(f"{p}:{hashes[p]}" for p in sorted(hashes))
        manifest = dict(nativeBuild=build, sequence=sequence,
                        expiresAt=self.now + 7 * 86400_000,
                        revision=mod.sha(canonical.encode()), files=hashes)
        sig = run("openssl", "dgst", "-sha256", "-sign", str(self.private),
                  data=signed.payload(manifest))
        manifest["signature"] = base64.b64encode(sig).decode()
        out = self.root / f"{name}.zip"
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr(f"android-updates/build-150/manifest.json", json.dumps(manifest))
            for p, content in data.items():
                z.writestr(f"android-updates/build-150/files/{p}", content)
            for k, content in (extras or {}).items():
                z.writestr(k, content)
        return out
    def check(self, candidate):
        return mod.compare(self.base, candidate, self.public, expected_build=150,
                           now_ms=self.now, enforce_pin=False)
    def test_add_and_modify_not_approved_automatically(self):
        c = self.make_zip("candidate", 4, {"index.html": b"<html>new</html>",
                                          "js/main.js": b"old",
                                          "css/new.css": b"a"})
        r = self.check(c)
        self.assertEqual(r["summary"], dict(added=1, modified=1, deleted=0))
        self.assertEqual(r["status"], "READY_FOR_OWNER_PHONE_TEST")
        self.assertFalse(r["deployment_allowed"])
        self.assertFalse(r["owner_approved"])
        self.assertFalse(r["owner_phone_tested"])
    def test_deleted_file_blocks_partial_ota(self):
        c = self.make_zip("candidate", 4, {"index.html": b"changed"})
        r = self.check(c)
        self.assertEqual(r["summary"]["deleted"], 1)
        self.assertEqual(r["status"], "BLOCKED")
    def test_replay_blocked(self):
        c = self.make_zip("candidate", 2, {"index.html": b"new"})
        with self.assertRaisesRegex(ValueError, "sequence"):
            self.check(c)
    def test_identical_revision_blocked(self):
        c = self.make_zip("candidate", 4, {"index.html": b"<html>base</html>",
                                           "js/main.js": b"old"})
        with self.assertRaisesRegex(ValueError, "identical"):
            self.check(c)
    def test_bad_content_checksum_blocked(self):
        c = self.make_zip("candidate", 4, {"index.html": b"new"}, wrong_hash=True)
        with self.assertRaisesRegex(ValueError, "mismatch"):
            self.check(c)
    def test_non_web_path_blocked(self):
        with self.assertRaises(ValueError):
            self.make_zip("candidate", 4, {"index.html": b"new",
                                            "data/prayer-times-offline.json": b"tamper"})
    def test_wrong_build_blocked(self):
        c = self.make_zip("candidate", 4, {"index.html": b"new"}, build=151)
        with self.assertRaisesRegex(ValueError, "another Android build"):
            self.check(c)
    def test_unexpected_extra_member_blocked(self):
        c = self.make_zip("candidate", 4, {"index.html": b"new"},
                          extras={"android-updates/build-150/secrets.txt": b"x"})
        with self.assertRaisesRegex(ValueError, "Unexpected"):
            self.check(c)
    def test_signature_mutation_blocked(self):
        c = self.make_zip("candidate", 4, {"index.html": b"new"})
        with zipfile.ZipFile(c) as a:
            members = {x.filename: a.read(x) for x in a.namelist()}
        key = "android-updates/build-150/manifest.json"
        m = json.loads(members[key])
        m["sequence"] = 5
        members[key] = json.dumps(m).encode()
        with zipfile.ZipFile(c, "w") as z:
            for p, data in members.items():
                z.writestr(p, data)
        with self.assertRaisesRegex(ValueError, "signature"):
            self.check(c)
    def test_pin_enforced_outside_disposable_tests(self):
        c = self.make_zip("candidate", 4, {"index.html": b"new"})
        with self.assertRaisesRegex(ValueError, "not the pinned"):
            mod.compare(self.base, c, self.public, expected_build=150, now_ms=self.now)

if __name__ == "__main__":
    unittest.main()
