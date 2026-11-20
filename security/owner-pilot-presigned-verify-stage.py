#!/usr/bin/env python3
"""Verify a privately pre-signed pilot OTA against exact Android web assets.

The ECDSA key never enters GitHub; CI checks signature using the pinned
public SPKI in WebUpdates.kt. This only stages files for the isolated feed.
"""
import argparse
import base64
import hashlib
import json
import re
import subprocess
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB_ASSETS = ROOT / "android-native/app/src/main/assets/www"
PIN_SOURCE = ROOT / "android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt"
DOMAIN = "AOQAT-WEB-UPDATE-OWNER-PILOT-V1"
FEED_ROOT = Path("android-updates/owner-pilot/build-150")
EXPECTED_PIN = "a0acf8f0464bad18392073c47166937e68f72b732efa3e1299331d0bc43307ea"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def collect_assets() -> dict[str, bytes]:
    assert WEB_ASSETS.is_dir(), "First run :app:syncWebAssets"
    files = {"index.html": (WEB_ASSETS / "index.html").read_bytes()}
    for dirname, ext in (("js", ".js"), ("css", ".css")):
        for p in sorted((WEB_ASSETS / dirname).rglob("*")):
            if p.is_file() and p.suffix == ext:
                rel = p.relative_to(WEB_ASSETS).as_posix()
                assert re.fullmatch(r"(?:js|css)/[a-zA-Z0-9_./-]+\\.(?:js|css)", rel), rel
                assert not any(x in rel for x in ("..", "//", "/.", "%", "\\\\")), rel
                files[rel] = p.read_bytes()
    assert 1 <= len(files) <= 250
    assert all(len(v) <= 6 * 1024 * 1024 for v in files.values())
    assert sum(map(len, files.values())) <= 24 * 1024 * 1024
    assert b"js/apk-startup-bundle.js" in files["index.html"]
    assert b"privacyPolicy" in files["js/apk-startup-bundle.js"]
    assert b"aoqatOwnerSeq4Buttons" in files["js/apk-startup-bundle.js"]
    return files


def pinned_public() -> bytes:
    source = PIN_SOURCE.read_text()
    match = re.search(r'const val PILOT_SIGNING_PUBLIC_KEY_B64\\s*=\\s*"([^"]+)"', source)
    assert match, "Pilot public key not found"
    der = base64.b64decode(match.group(1), validate=True)
    assert digest(der) == EXPECTED_PIN, "Unexpected pilot signing key"
    return der


def check_signature(message: bytes, signature: str) -> None:
    der = pinned_public()
    sig = base64.b64decode(signature, validate=True)
    with tempfile.TemporaryDirectory(prefix="aoqat-pilot-verify-") as directory:
        root = Path(directory)
        (root / "public.der").write_bytes(der)
        (root / "message").write_bytes(message)
        (root / "signature").write_bytes(sig)
        pub = subprocess.run(["openssl", "pkey", "-pubin", "-inform", "DER",
                              "-in", str(root / "public.der"), "-out", str(root / "public.pem")],
                             capture_output=True, check=True)
        verified = subprocess.run(["openssl", "dgst", "-sha256", "-verify",
                                   str(root / "public.pem"), "-signature",
                                   str(root / "signature"), str(root / "message")],
                                  capture_output=True, text=True, check=False)
        assert verified.returncode == 0 and "Verified OK" in verified.stdout, "Invalid publisher signature"


def stage(attestation_path: Path, output_dir: Path, previous_path: Path) -> None:
    a = json.loads(attestation_path.read_text(encoding="utf-8"))
    assert set(a) == {"channel","nativeBuild","sequence","source_head","approved",
                      "expiresAt","revision","signature","manifest_sha256","reason"}
    assert a["approved"] is True and a["channel"] == "owner-pilot"
    assert type(a["nativeBuild"]) is int and a["nativeBuild"] == 150
    assert type(a["sequence"]) is int and a["sequence"] == 2
    assert type(a["expiresAt"]) is int and int(time.time() * 1000) + 5 * 60000 < a["expiresAt"]
    assert type(a["reason"]) is str and 5 <= len(a["reason"]) <= 120
    assert re.fullmatch("[0-9a-f]{64}", a["revision"])
    assert re.fullmatch("[0-9a-f]{64}", a["manifest_sha256"])
    assert re.fullmatch("[0-9a-f]{40}", a["source_head"])
    previous = json.loads(previous_path.read_text(encoding="utf-8"))
    assert previous["channel"] == "owner-pilot" and previous["nativeBuild"] == 150
    assert previous["sequence"] == a["sequence"] - 1
    files = collect_assets()
    sums = {name: digest(body) for name, body in sorted(files.items())}
    assert set(previous["files"]).issubset(sums), "Cannot delete existing signed paths"
    canonical = "\\n".join(f"{name}:{sums[name]}" for name in sorted(sums))
    revision = digest(canonical.encode("utf-8"))
    assert revision == a["revision"], "Packaged Android assets differ from owner-signed review"
    payload = "\\n".join([DOMAIN, "150", str(a["sequence"]), str(a["expiresAt"]),
                           revision, canonical]).encode("utf-8")
    check_signature(payload, a["signature"])
    manifest = {"nativeBuild":150, "sequence":a["sequence"],
                "channel":"owner-pilot", "expiresAt":a["expiresAt"],
                "revision":revision, "files":sums, "signature":a["signature"]}
    raw = json.dumps(manifest, ensure_ascii=False, separators=(",", ":")).encode()
    assert digest(raw) == a["manifest_sha256"], "Manifest differs from signed preview"
    target = output_dir / FEED_ROOT
    assert not target.exists(), "Refusing to overwrite output directory"
    target.mkdir(parents=True)
    (target / "manifest.json").write_bytes(raw)
    for name, body in files.items():
        p = target / "files" / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(body)
        assert digest(p.read_bytes()) == sums[name]
    assert len(files) == 88, "Unexpected added/removed OTA asset"
    print("PASS: signed owner-pilot sequence 2 matches ALL 88 APK web assets")
    print("MANIFEST_SHA256=" + digest(raw))
    print("TOTAL_BYTES=" + str(sum(map(len, files.values()))))
    print("No private key, APK source change, Vercel or production path")


if __name__ == "__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--attestation", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    p.add_argument("--previous", required=True, type=Path)
    a=p.parse_args()
    stage(a.attestation, a.output, a.previous)
