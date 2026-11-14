#!/usr/bin/env python3
"""Host-side adversarial tests; generated demo private keys never leave tempdir."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

TOOL = Path(__file__).resolve().parent / "signed-update-manifest.py"
spec = importlib.util.spec_from_file_location("signed_update_manifest", TOOL)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SigningSecurityTests(unittest.TestCase):
    def test_offline_sign_and_reject_tampering_and_replay(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            private, public = root/"private-key-never-publish.pem", root/"public.pem"
            subprocess.run(["openssl","ecparam","-name","prime256v1","-genkey","-noout","-out",str(private)],check=True,capture_output=True)
            subprocess.run(["openssl","pkey","-in",str(private),"-pubout","-out",str(public)],check=True,capture_output=True)
            files = {"index.html": hashlib.sha256(b"<html></html>").hexdigest(),
                     "js/app.js": hashlib.sha256(b"window.ok=1").hexdigest()}
            canonical = "\n".join(f"{p}:{files[p]}" for p in sorted(files))
            sample = {"nativeBuild":146,"sequence":11,"expiresAt":int(time.time()*1000)+7200000,
                      "files":files,"revision":hashlib.sha256(canonical.encode()).hexdigest()}
            source, signed = root/"unsigned.json", root/"signed.json"
            source.write_text(json.dumps(sample))
            result = subprocess.run([sys.executable,str(TOOL),"sign",str(source),str(signed),
                  "--private-key",str(private),"--public-key",str(public)],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            signed_manifest = json.loads(signed.read_text())
            module.verify(signed_manifest,public,expected_build=146,min_sequence=10)
            with self.assertRaisesRegex(ValueError, "Replayed"):
                module.verify(signed_manifest,public,expected_build=146,min_sequence=11)
            with self.assertRaisesRegex(ValueError, "another Android build"):
                module.verify(signed_manifest,public,expected_build=147)
            with self.assertRaisesRegex(ValueError, "Expired"):
                module.verify(signed_manifest,public,now_ms=sample["expiresAt"])
            signed_manifest["sequence"] += 1
            with self.assertRaisesRegex(ValueError, "signature verification failed"):
                module.verify(signed_manifest,public)
            signed_manifest["sequence"] -= 1
            signed_manifest["files"]["js/app.js"] = "a"*64
            with self.assertRaisesRegex(ValueError,"Revision"):
                module.verify(signed_manifest,public)

    def test_forbid_unsafe_file_paths_and_unsigned_manifest(self):
        files = {"index.html":hashlib.sha256(b"safe").hexdigest()}
        canonical = "index.html:"+files["index.html"]
        sample = {"nativeBuild":146,"sequence":1,"expiresAt":int(time.time()*1000)+7200000,
                  "revision":hashlib.sha256(canonical.encode()).hexdigest(),"files":files}
        for path in ("data/prayer-times-offline.json","../outside.js","js/%2e%2e/escape.js","assets/quran.json"):
            sample["files"][path] = "0"*64
            with self.assertRaises(ValueError,msg=path):
                module.payload(sample)
            del sample["files"][path]
        with self.assertRaisesRegex(ValueError, "Missing or invalid signature"):
            module.verify(sample,Path("/not/an/actual/public/key.pem"))

if __name__ == "__main__":
    unittest.main()
