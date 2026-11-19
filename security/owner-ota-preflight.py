#!/usr/bin/env python3
"""Fail-closed inspection of two OWNER-SIGNED full OTA snapshots. REVIEW ONLY.

Run with --baseline and --candidate pointing to directories or review ZIPs.
Read-only: never uploads, deploys, signs, or changes installed apps.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import stat
import subprocess
import sys
import time
import zipfile

SCRIPT = Path(__file__).resolve().parent / "signed-update-manifest.py"
PINNED_SPKI_SHA256 = "8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d"
MAX_MANIFEST = 1 * 1024 * 1024
MAX_FILE = 6 * 1024 * 1024
MAX_TOTAL = 24 * 1024 * 1024


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_verifier():
    spec = importlib.util.spec_from_file_location("aoqat_signed_verifier", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _read_raw(source: Path, build: int) -> dict[str, bytes]:
    prefix = f"android-updates/build-{build}/"
    if source.is_dir():
        root = source
        if not (root / "manifest.json").is_file():
            root = root / prefix
        if not (root / "manifest.json").is_file():
            raise ValueError("Missing manifest.json in selected OTA directory")
        files = {}
        for item in root.rglob("*"):
            if item.is_symlink():
                raise ValueError("Symlinks in an update package are forbidden")
            if item.is_file():
                rel = item.relative_to(root).as_posix()
                if rel != "manifest.json" and not rel.startswith("files/"):
                    raise ValueError("Unexpected package file: " + rel)
                if item.stat().st_size > (MAX_MANIFEST if rel == "manifest.json" else MAX_FILE):
                    raise ValueError("Oversized package member: " + rel)
                files[rel] = item.read_bytes()
        return files
    if not source.is_file() or not zipfile.is_zipfile(source):
        raise ValueError("Expected an OTA directory or ZIP archive")
    result = {}
    with zipfile.ZipFile(source) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            name = info.filename
            if name.startswith(prefix):
                name = name[len(prefix):]
            elif name.startswith("manifest.json") or name.startswith("files/"):
                pass
            else:
                raise ValueError("Unexpected ZIP path: " + info.filename)
            if name in result or name.startswith("/") or "\\" in name or any(
                part in (".", "..", "") for part in name.split("/")
            ):
                raise ValueError("Duplicate or unsafe ZIP path: " + info.filename)
            if (info.external_attr >> 16) & 0o170000 == stat.S_IFLNK:
                raise ValueError("Symlinks in ZIP are forbidden")
            if name != "manifest.json" and not name.startswith("files/"):
                raise ValueError("Unexpected package entry: " + name)
            if info.file_size > (MAX_MANIFEST if name == "manifest.json" else MAX_FILE):
                raise ValueError("Oversized ZIP member: " + name)
            data = archive.read(info)
            if len(data) != info.file_size:
                raise ValueError("Corrupt ZIP member")
            result[name] = data
    return result


def _inspect_bundle(source: Path, build: int, public_key: Path, now_ms: int, *,
                    past_manifest: bool = False, enforce_pin: bool = True) -> dict:
    if enforce_pin:
        der = subprocess.check_output([
            "openssl", "pkey", "-pubin", "-in", str(public_key), "-outform", "DER"
        ], stderr=subprocess.DEVNULL)
        if sha(der) != PINNED_SPKI_SHA256:
            raise ValueError("Publisher key is not the pinned AOQAT V2 public key")
    raw = _read_raw(source, build)
    manifest_bytes = raw.get("manifest.json")
    if not manifest_bytes or len(manifest_bytes) > MAX_MANIFEST:
        raise ValueError("Missing or oversized manifest")
    manifest = json.loads(manifest_bytes.decode("utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("Invalid manifest")
    expiration = manifest.get("expiresAt")
    if not isinstance(expiration, int) or expiration <= 0:
        raise ValueError("Missing expiry")
    verify_at = min(now_ms, expiration - 1) if past_manifest else now_ms
    load_verifier().verify(manifest, public_key, expected_build=build,
                           min_sequence=0, now_ms=verify_at)
    listed = manifest["files"]
    expected = {"manifest.json"} | {"files/" + p for p in listed}
    if set(raw) != expected:
        raise ValueError("Missing/extra files: " + repr(sorted(set(raw) ^ expected)))
    total = 0
    for path, expected_hash in listed.items():
        content = raw["files/" + path]
        total += len(content)
        if total > MAX_TOTAL or len(content) > MAX_FILE:
            raise ValueError("OTA size limit exceeded")
        if sha(content) != expected_hash:
            raise ValueError("SHA-256 mismatch: " + path)
    return {"manifest": manifest, "hash": sha(manifest_bytes),
            "file_count": len(listed), "total_bytes": total}


def compare(baseline: Path, candidate: Path, public_key: Path, *,
            expected_build: int, now_ms: int | None = None,
            enforce_pin: bool = True) -> dict:
    now_ms = int(time.time() * 1000) if now_ms is None else now_ms
    old = _inspect_bundle(baseline, expected_build, public_key, now_ms,
                          past_manifest=True, enforce_pin=enforce_pin)
    new = _inspect_bundle(candidate, expected_build, public_key, now_ms,
                          enforce_pin=enforce_pin)
    a, b = old["manifest"], new["manifest"]
    if b["sequence"] <= a["sequence"]:
        raise ValueError("BLOCKED: sequence is not newer than installed production")
    if b["revision"] == a["revision"]:
        raise ValueError("BLOCKED: candidate is identical to previous release")
    old_files, new_files = a["files"], b["files"]
    added = sorted(set(new_files) - set(old_files))
    deleted = sorted(set(old_files) - set(new_files))
    modified = sorted(p for p in set(old_files) & set(new_files)
                      if old_files[p] != new_files[p])
    # Deleted OTA overrides can fall back to the APK copy, giving unexpected
    # behaviour. A deletion requires a separately trialled full APK release.
    blockers = (["Deleted paths require a reviewed FULL APK, not a partial OTA"]
                if deleted else [])
    changes = [
        {"path": p, "operation": operation, "before": old_files.get(p),
         "after": new_files.get(p)}
        for operation, paths in (("add", added), ("modify", modified), ("delete", deleted))
        for p in paths
    ]
    return {
        "status": "BLOCKED" if blockers else "READY_FOR_OWNER_PHONE_TEST",
        "deployment_allowed": False,
        "owner_phone_tested": False,
        "owner_approved": False,
        "nativeBuild": expected_build,
        "baseline": {"sequence": a["sequence"], "revision": a["revision"],
                     "manifestSha256": old["hash"]},
        "candidate": {"sequence": b["sequence"], "revision": b["revision"],
                      "manifestSha256": new["hash"], "files": new["file_count"],
                      "bytes": new["total_bytes"]},
        "summary": {"added": len(added), "modified": len(modified),
                    "deleted": len(deleted)},
        "changes": changes, "blockers": blockers
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--public-key", type=Path, default=Path("security/aoqat-update-public-v2.pem"))
    parser.add_argument("--build", type=int, required=True)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    try:
        result = compare(args.baseline, args.candidate, args.public_key, expected_build=args.build)
        report = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True)
        if args.report:
            if args.report.exists():
                raise ValueError("Report already exists; refusing overwrite")
            args.report.write_text(report + "\n", encoding="utf-8")
        print(report)
        if result["status"] == "BLOCKED":
            print("STOP: deleted OTA entries need separate full APK review", file=sys.stderr)
            return 2
        print("REVIEW ONLY: no owner device test, signature approval or deployment performed")
        return 0
    except (OSError, KeyError, ValueError, TypeError, zipfile.BadZipFile,
            subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print("BLOCKED:", str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
