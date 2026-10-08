# Web mushaf sources

The compact web trial displays the unmodified numbered pages 1–604 of the King Fahd Complex pocket Hafs publication. The surrounding web application is not certified by the Complex.

- Official publication: https://qurancomplex.gov.sa/wp-content/uploads/isdarat/hafs/jaib.pdf
- Download mirror: https://cdn.quran.ws/KFGQPC/resources/quran-hafs/jaib/jaib.pdf
- Verified SHA-256: `70eba3d516823d54a9b001672c00a0403a25df937d52fe0a38731b915825aee4`
- Mirror metadata: https://github.com/quran-ws/kfgqpc-resources/blob/main/metadata/quran-hafs.json
- Numbered pages are PDF indices 3 through 606 inclusive; front matter and appendices are not part of the numbered Quran pages.

No Quran text, line order, verse marker, heading, ornament, marginal sign or printed folio is redrawn or removed. Display boxes omit blank exterior paper only; themes are display filters. The original 1441H assets remain preserved.

The ayah interaction regions retain the previously verified 6236-ayah sequence. Their coordinates are registered to the identical printed calligraphy in each pocket page using an affine transform, at least 100 matching features per page and bidirectional black-ink coverage checks. Elaborate opening-page ornaments are excluded from the reverse coverage criterion. The resulting matches and coverage are recorded in each page metadata entry.

The Android reader is unchanged.

## Responsive phone reading

Phone reading uses original QCF2 Hafs glyph outlines from KFGQPC’s Al Madinah
Mushaf desktop installer 2.1. Archive SHA-256:
`077ee64d5bcb35bc6d07bca0b3a8faacd97add0c610b5ee72e0ccb3b457445a5`.
The release is preserved at
https://github.com/manaf/KFGQPC-Madinah-Mushaf .

Word glyph codes, **v2_page** and **line_v2** come from the Quran Foundation
public API; generic page_number/line_number are not used for QCF2. Chapter
pagination is completed before rendering, and all 6236 unique verse endings
are checked. Surah and basmala row positions come from the QUL-derived layout
at commit `dad9cf67588ab66c914c155924d8a3699704a03d`; its predicted glyph mappings
are not used. Every native glyph must exist in the original page font.
HarfBuzz applies the original OpenType shaping tables; fontTools exports the
unchanged glyph contours to scalable vector paths. No letters are redrawn,
horizontally stretched, or cut from raster images. Complete native rows scale
uniformly; the interface adapts spacing **between** rows to the screen.

`render-responsive-hafs.py` rebuilds all 604 assets and records original font
and output checksums. Reading needs no third-party API or font CDN at runtime.
The pocket facsimile remains available as a separate display choice. Switching
editions resolves the same verse instead of assuming identical page breaks.
This describes source provenance, not certification of our application by KFGQPC.
Reference rendering documentation:
https://api-docs.quran.com/docs/tutorials/fonts/font-rendering/
https://api-docs.quran.com/docs/api/field-reference/

Original page-font 245 contains a malformed competing `cmap` subtable. The
build supplies HarfBuzz with the original valid Unicode-to-glyph mapping in a
normalized shaping container, checks every required glyph ID, and still exports
the original font’s unchanged glyph contours. This is recorded per page as
`cmapNormalized`; the original archive and font checksums remain unchanged.
