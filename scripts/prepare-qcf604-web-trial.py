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
OUTPUT = ROOT / "experiments" / "qcf604-web-verse-layouts.json.gz"
TOTAL = 604
QURAN = json.loads((ROOT / 'assets' / 'quran.json').read_text(encoding='utf-8'))
VERSE_INDEX = {f"{surah['id']}:{verse['id']}": i for i, (surah, verse) in enumerate((s,v) for s in QURAN for v in s['verses'])}
assert len(VERSE_INDEX) == 6236


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
            indices = set()
            markers = set()
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
                    codes = []
                    for w in original.get('words', []):
                        code = w.get('qpcV2')
                        verse_key = ':'.join(str(w.get('location', '')).split(':')[:2])
                        index = VERSE_INDEX.get(verse_key)
                        if not isinstance(code, str) or not code.strip() or index is None:
                            raise ValueError(f'Missing Quran glyph or ayah mapping on page {page}: {w!r}')
                        end = w.get('kind') == 'marker'
                        codes.append([index, code, int(end)])
                        indices.add(index)
                        if end:
                            markers.add(index)
                    if not codes:
                        raise ValueError(f'Empty native QCF row on page {page}')
                    words += len(codes)
                    rows.append({'v': codes, 'c': bool(original.get('centered'))})
                else:
                    raise ValueError(f"Unknown layout row type on page {page}: {kind!r}")
            if not 6 <= len(rows) <= 15 or words < 8:
                raise ValueError(f"QCF rows incomplete on page {page}: {len(rows)} rows")
            return page, {'lines': rows}, words, indices, markers
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            if attempt == 3:
                raise RuntimeError(f"Source fetch failed for page {page}") from exc
            time.sleep(1.5 * (attempt + 1))
    raise AssertionError("unreachable")


def main() -> None:
    pages = {}
    word_total = 0
    seen_indices = set()
    seen_markers = set()
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = [pool.submit(get_page, n) for n in range(1, TOTAL + 1)]
        for f in as_completed(futures):
            page, data, count, indices, markers = f.result()
            pages[str(page)] = data
            word_total += count
            seen_indices.update(indices)
            seen_markers.update(markers)
    assert len(pages) == TOTAL
    assert len(seen_indices) == 6236, f'Missing verse mappings: {6236-len(seen_indices)}'
    assert len(seen_markers) == 6236, f'Missing verse endings: {6236-len(seen_markers)}'
    assert [int(k) for k in sorted(pages, key=int)] == list(range(1, TOTAL + 1))
    # Stabilize JSON/gzip bytes regardless of parallel source fetch completion order.
    pages = {str(n): pages[str(n)] for n in range(1, TOTAL + 1)}
    manifest = {
        "edition": "QCF V2 Hafs web trial with authentic per-word verse mapping",
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
