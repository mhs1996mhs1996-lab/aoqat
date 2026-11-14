#!/usr/bin/env python3
"""Fail closed when Quran or prayer-time source bytes change from the reviewed v2.10 snapshot.

IMPORTANT: A matching checksum means "unchanged", NOT that a religious text or
prayer timetable has been independently authenticated. Changes require a new
human-reviewed reference snapshot. This guard is supplementary to signed updates.
"""
from __future__ import annotations
import subprocess
import sys

# Immutable commit used to build the existing v2.10 trial release.
REFERENCE_COMMIT = "adbce560c254c8e142c60d5d2d5b3fde75c2b5a7"

CRITICAL_FILES = frozenset((
    "assets/quran.json",
    "assets/quran-pages.json",
    "data/prayer-times-offline.json",
    "data/prayer-times-offline.js",
    "data/prayer-times.js",
    "js/quran-reader.js",
    "js/prayer-countdown.js",
    "js/prayer-time-choice.js",
))
CRITICAL_PREFIXES = (
    "assets/mushaf-phone-hafs/",
    "assets/mushaf-phone-hafs.",
    "assets/mushaf-hafs-pocket",
    "assets/qcf-v2-page-fonts/",
)

def protected(path: str) -> bool:
    return path in CRITICAL_FILES or any(path.startswith(p) for p in CRITICAL_PREFIXES)

def run(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], stderr=subprocess.PIPE)

def tree_names(ref: str) -> set[str]:
    return {
        name.decode("utf-8")
        for name in run("ls-tree", "--full-tree", "-r", "-z", "--name-only", ref).split(b"\0")
        if name
    }

def entry_hash(ref: str, path: str) -> bytes:
    # Hash of full tracked blob contents, not a filename or timestamp.
    return run("rev-parse", f"{ref}:{path}").strip()

def check(head: str = "HEAD") -> int:
    before = {p for p in tree_names(REFERENCE_COMMIT) if protected(p)}
    after = {p for p in tree_names(head) if protected(p)}
    required = set(CRITICAL_FILES)
    absent = sorted(required - before)
    if absent:
        print("FAIL: baseline is missing expected religious source files:", *absent, sep="\n  ", file=sys.stderr)
        return 2
    modified = []
    for path in sorted(before | after):
        if path not in before or path not in after:
            modified.append(path)
        elif entry_hash(REFERENCE_COMMIT, path) != entry_hash(head, path):
            modified.append(path)
    if modified:
        print("BLOCKED: Protected Quran / prayer data or rendering logic differs from frozen baseline:", file=sys.stderr)
        for path in modified:
            print(" -", path, file=sys.stderr)
        print("Do NOT bypass. Verify against the approved religious reference and re-approve a NEW baseline in a separate reviewed security change.",file=sys.stderr)
        return 1
    print(f"PASS: {len(before)} protected files unchanged versus v2.10 frozen release. This is an integrity check, not religious certification.")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(check(sys.argv[1] if len(sys.argv) > 1 else "HEAD"))
    except subprocess.CalledProcessError as exc:
        print("FAIL: Could not inspect complete reference history; use checkout fetch-depth: 0", str(exc), file=sys.stderr)
        sys.exit(2)
