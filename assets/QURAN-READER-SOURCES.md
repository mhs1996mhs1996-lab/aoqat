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
