# Mushaf replacement trial — 2026-10-25

This branch is isolated from main. Do not deploy or alter Android until web verification succeeds.

## Existing source assets
- Official KFGQPC Hafs 1441H original-page source: see assets/QURAN-READER-SOURCES.md and scripts/render-original-hafs.py.
- KFGQPC pocket Hafs source: see assets/MUSHAF-SOURCES.md and scripts/render-pocket-hafs.py.
- Responsive original QCF2 glyph renderer: scripts/render-responsive-hafs.py.
- Original 604-page pocket asset manifest: assets/mushaf-hafs-pocket-ready.json.
- Preserve Quran source notices and attribution; do not copy simppro app files or graphics.

## Acceptance criteria
1. Identify the active web reader entrypoint and actual image source at runtime, rather than assuming a renderer is enabled because assets exist.
2. Compare page 1 (Al-Fatiha), page 2 (Al-Baqara), and a normal middle page against the user screenshots. Preserve exact Quranic text, ornaments and ayah numbers.
3. Check all 604 images exist and load; check 6236 ayah hit regions, bookmarks, page switching, long press, and last-page persistence.
4. Verify offline behavior, service-worker cache, file size, and Android back gesture.
5. Make only web-reader-scoped changes. Do not change prayer times, adhan, alerts, theme defaults or Android APK.
6. Provide a web preview for user approval before merging into main or packaging an APK.

## Rights
Use KFGQPC official digital editions under their published usage terms, preserve source attribution and checksums, and verify license restrictions against the original publisher's current notice. No proprietary simppro assets are imported.

## Status
Source inventory complete; branch created. Runtime reader selection, visual QA and build/deployment remain pending. No claim of replacement or deployment is made here.
