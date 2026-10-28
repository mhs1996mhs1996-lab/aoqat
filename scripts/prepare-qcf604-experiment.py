#!/usr/bin/env python3
"""Generate a compact, pinned QCF V2 glyph-code manifest for an isolated web trial.

This does NOT replace the approved SVG mushaf, install fonts, or modify main.
Source layout: pinned public Madinah Mushaf/QUL page files used by the existing
scripts/render-responsive-hafs.py. No runtime per-page API is needed.
"""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import gzip
import hashlib
import json
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SOURCE_COMMIT = "dad9cf67588ab66c914c155924d8a3699704a03d"
SOURCE = "https://raw.githubusercontent.com/manaf/KFGQPC-Madinah-Mushaf/" + SOURCE_COMMIT
OUTPUT = ROOT / "experiments" / "qcf604-layouts.json.gz"
TOTAL = 604


def get_page(page: int) -> tuple[int, dict, int]:
    url = f"{SOURCE}/data/pages/page-{page:03d}.json"
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "aoqat-qcf604-trial/1.0"})
            with urllib.request.urlopen(request, timeout=35) as response:
                raw = response.read()
            data = json.loads(raw)
            if data.get("page") != page:
                raise ValueError(f"Page number mismatch: {page}")
            rows: list[dict] = []
            words = 0
            for original in data.get("lines", []):
                kind = original.get("type")
                if kind == "blank":
                    continue
                if kind == "surah_name":
                    chapter = original.get("decor", {}).get("surah")
                    if not isinstance(chapter, int) or not 1 <= chapter <= 114:
                        raise ValueError(f"Invalid surah heading on page {page}")
                    rows.append({"s": chapter})
                elif kind == "basmallah":
                    rows.append({"b": 1})
                elif kind == "text":
                    codes = [w.get("qpcV2") for w in original.get("words", [])]
                    if not codes or any(not isinstance(c, str) or not c.strip() for c in codes):
                        raise ValueError(f"Missing native QCF glyph codes on page {page}")
                    words += len(codes)
                    rows.append({"v": codes, "c": bool(original.get("centered"))})
                else:
                    raise ValueError(f"Unknown layout row type on page {page}: {kind!r}")
            if not 6 <= len(rows) <= 15 or words < 8:
                raise ValueError(f"QCF rows incomplete on page {page}: {len(rows)} rows")
            return page, {"lines": rows}, words
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            if attempt == 3:
                raise RuntimeError(f"Source fetch failed for page {page}") from exc
            time.sleep(1.5 * (attempt + 1))
    raise AssertionError("unreachable")


def main() -> None:
    pages = {}
    word_total = 0
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = [pool.submit(get_page, n) for n in range(1, TOTAL + 1)]
        for f in as_completed(futures):
            page, data, count = f.result()
            pages[str(page)] = data
            word_total += count
    assert len(pages) == TOTAL
    assert [int(k) for k in sorted(pages, key=int)] == list(range(1, TOTAL + 1))
    manifest = {
        "edition": "QCF V2 Hafs experimental text layout; NOT the shipped reader",
        "sourceCommit": SOURCE_COMMIT,
        "pageCount": TOTAL,
        "pages": pages,
    }
    payload = json.dumps(manifest, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))
    verify = json.loads(gzip.decompress(OUTPUT.read_bytes()))
    assert verify["pageCount"] == TOTAL
    for n in (1, 2, 20, 101, 102, 103, 449, 450, 451, 604):
        assert verify["pages"][str(n)]["lines"]
    print(
        f"Prepared {TOTAL} QCF pages ({word_total} glyph-code words);"
        f" {len(payload)} JSON bytes -> {OUTPUT.stat().st_size} gzip bytes;"
        f" SHA256={hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}",
        flush=True,
    )


if __name__ == "__main__":
    main()
