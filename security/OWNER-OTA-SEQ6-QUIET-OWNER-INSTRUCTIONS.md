# AOQAT B150 owner-only OTA V2 — sequence 6 (quiet UI, second pass)

This is an owner-only candidate. It does **NOT** update the general prayer application, web site, admin app, Quran data, prayer data, Android native services, DND code, or any user devices. It does not publish to any OTA channel.

## What was observed by owner after seq5
- ✅ Both quiet-mode checkboxes were no longer slow
- ✅ +/- no longer spawned the numeric keyboard
- ❌ Repeated +/- presses still sluggish on phone
- ❌ Buttons/cards take too much vertical space on phone

## Exact reviewed seq6 changes
- Only replace the **already signed, already authorized** file `js/owner-quiet-seq5.js` with newer bytes, keeping the signed `index.html` BYTE-IDENTICAL to seq5. The native startup bundle, profile buttons, and all other content remain untouched.
- Increase the input idle interval from 180ms to 900ms to coalesce more rapid taps before an Android bridge save. Always flush on pagehide and when document becomes hidden.
- Immediately update only the numeric control; avoid redraw, forced focus, keyboard activation, and unnecessary native calls when value hits 0 or 120.
- Keep +/- controls **at least 44 × 44 CSS pixels** for reliable finger targeting. Constrain stepper width relative to the row and compact card padding, gaps and row heights with breakpoints for narrow phones (320–370px).
- Long explanatory help remains readable inside collapsed "شرح طريقة عمل الصامت" sections, with one compact section heading and caption. Do not delete help text or hide prayer names.
- JavaScript handles only user-interface interactions; native DND/silent alarm and exact-time scheduling were not changed.

## For owner on Android / Termux
1. Download `aoqat-owner-seq6-signing-files.zip` (contains **two files**: `owner-ota-v2-b150-quiet-seq6.py`, `owner-ota-b150-seq6-quiet-ui.js`), extract and put both files directly inside Download.
2. The owner-signed seq5 archive **must** remain in Download, exact name `AOQAT-B150-OWNER-SEQ5-QUIET-FIX-SIGNED-TEST-ONLY.zip`. Do not upload signing keys, archives or passwords here. The script verifies its build=150, sequence=5, fixed profile/index hash, previous signed quiet JS hash and authentic `AOQAT-OTA-V2` publisher signature.
3. In Termux run:
   `python ~/storage/downloads/owner-ota-v2-b150-quiet-seq6.py --owner-stage`
4. Type the **OTA V2 PEM password**, not either APK P12 password. Signing and verification stay on phone.
5. Result: `~/storage/downloads/AOQAT-B150-OWNER-SEQ6-QUIET-COMPACT-SIGNED-TEST-ONLY.zip`. This ZIP is ONLY for `أوقات الصلاة — تجريبي`, through its owner-only ZIP importer, not the original main prayer application.
6. Restart experimental app when requested. Visit `ضبط التنبيهات > تنبيهات أوقات الصلاة > تفعيل وضع الصامت`; verify 5 visible prayer rows in the active card, readable title/controls on narrow phone, 25 repeated +/- presses, 0/120 limits, manual numeric keyboard ONLY by tapping number, checkbox states, and persistence after reopening. Verify reminders, ringer restore and any device-specific crash separately before considering a user release.

## Security and verification
- GitHub CI checks only the changed owner-review files against previous pilot branch; hashes script bytes and compares them against a pinned SHA256 before local signing. It rejects tampered script bytes and reconstructs the exact old signed seq5 index from pinned seq3/4 ancestry.
- GitHub CI tests use disposable ECDSA keys, not the user's production or owner private keys. The output artifact contains **signing program + reviewed UI script**, not an owner-signed update.
- Do not claim that source-review or phone import alone proves native quiet / DND / notifications. Need real-device testing. Never publish this branch to main until explicit owner approval and a separate production release assessment.
