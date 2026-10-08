# Quran reader sources

- Existing Arabic text remains unchanged in `quran.json` (114 surahs / 6236 verses). See QURAN-ATTRIBUTION.md and QURAN-LICENSE.txt.
- `quran-pages.json` is derived from Tanzil Quran Metadata 1.0: https://tanzil.net/res/text/metadata/quran-data.xml (CC BY). It preserves the 604 Medina Mushaf page boundaries and 30 juz boundaries as zero-based verse indices. Attribution: Tanzil Project, https://tanzil.net/docs/Quran_Metadata.
- Amiri Quran font: Google Fonts / Amiri project, SIL Open Font License 1.1. Font license is in fonts/AMIRI-QURAN-LICENSE.txt.
- Streaming verse recitations and Al-Muyassar tafsir: Al Quran Cloud, https://alquran.cloud/cdn and https://alquran.cloud/api. These are online services; audio and tafsir are not bundled.
- The web interface is built for this project, using the user's screenshot as an arrangement reference. It does not copy the Great Quran application's proprietary artwork or content library.

Web-only prototype: the Android adhan settings override retains the existing APK reader. Do not remove it until the user approves the web changes for APK.

## Reference comparison (2026-10-08)

- Official reference edition: King Fahd Glorious Quran Printing Complex, Madinah Mushaf, Hafs: https://qurancomplex.gov.sa/quran-hafs/ and https://qurancomplex.gov.sa/riwaiat-hafs/. The project is not certified by the Complex and does not redistribute a newly downloaded official page edition.
- All 604 page starts and all 114 verse counts and Meccan/Medinan classifications were compared with https://tanzil.net/res/text/metadata/quran-data.xml and matched.
- Line distribution remains derived from the existing mushaf-layout source. That source places Surah 45's heading at the end of page 498 and its basmala and first verses on page 499. Other application screenshots may use different editions. No text, page boundary, or word-range data was changed in this update.
- The currently loaded font is assets/fonts/uthmanic-hafs.woff2; see UTHMANIC-HAFS-LICENSE.txt. Amiri remains a bundled legacy asset.
- The mirrored title-frame ornaments and reading palettes are presentation elements authored for this interface, not Quranic text or copied proprietary app artwork. They do not establish an official certification.
- Added green, blue, and black-on-white palettes supplement sepia, white, and night. These are user preferences, not medical treatments.

## Original-page web reader (2026-10-08)

The web reading surface now uses the original KFGQPC **1441H Hafs** Illustrator page masters, rendered at 3x resolution to WebP without retyping, moving, cropping, or redrawing any part of the page. Source: https://dm.qurancomplex.gov.sa/Download/1441-AI-hafs.zip. Download mirror: https://cdn.quran.ws/KFGQPC/resources/dm/1441-ai-hafs/1441-AI-hafs.zip.

The downloaded archive SHA-256 was verified: `280c5d71ca16aaeeb3a343be1b92c76fa6df71d0671e202c026fde12402d9eef`. It contains 604 AI/PDF page masters. Original headers, basmala, words, ayah symbols, ornamental frames, marginal signs, and printed numbers remain in the page image. Theme filters change display colors only. Green shows the native page colors.

Hit polygons are from Quran.ws / Quranpedia `quran-svg`, revision `b4155f07e4aea087d2c458069acff9f7c7e749f6`, `mushafs/hafs/kfqc/json`. Their coordinates are mapped back through the inverse cropped-SVG transform onto the unmodified AI page coordinates. The entire sequence of 6236 mapped ayahs was checked against the existing indexed text. The hit layer is UI, not page artwork.

This 1441H edition differs from the previous 1421H page layout on 36 page ranges. The web reader derives page starts from the 1441H hit metadata; the old quran-pages.json remains intact. Verse-indexed notes, bookmarks, tafsir and recitation continue to use the same global ayah indices. Page 499 now contains the original Jathiyah heading.

Local text remains available for search, tafsir labels, copied verses and screen-reader names; it no longer typesets the web reading page. This integration does not claim an official certification for the surrounding app.

See MUSHAF-HAFS-1441-NOTICE.md for usage rights and attribution. Only web reader assets were changed; no Android integration or APK build is triggered.

Pages cache as they are visited. The settings include a resumable download of all 604 original pages for complete offline reading; pages 1 and 604 and the mapping are cached with the initial app shell.
