# Quran reader sources

- Existing Arabic text remains unchanged in `quran.json` (114 surahs / 6236 verses). See QURAN-ATTRIBUTION.md and QURAN-LICENSE.txt.
- `quran-pages.json` is derived from Tanzil Quran Metadata 1.0: https://tanzil.net/res/text/metadata/quran-data.xml (CC BY). It preserves the 604 Medina Mushaf page boundaries and 30 juz boundaries as zero-based verse indices. Attribution: Tanzil Project, https://tanzil.net/docs/Quran_Metadata.
- Amiri Quran font: Google Fonts / Amiri project, SIL Open Font License 1.1. Font license is in fonts/AMIRI-QURAN-LICENSE.txt.
- Streaming verse recitations and Al-Muyassar tafsir: Al Quran Cloud, https://alquran.cloud/cdn and https://alquran.cloud/api. These are online services; audio and tafsir are not bundled.
- The web interface is built for this project, using the user's screenshot as an arrangement reference. It does not copy the Great Quran application's proprietary artwork or content library.

Web-only prototype: the Android adhan settings override retains the existing APK reader. Do not remove it until the user approves the web changes for APK.
