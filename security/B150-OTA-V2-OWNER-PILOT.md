# AOQAT 2.12 / versionCode 150 — owner-only V2 signed OTA pilot

## Grounded acceptance
The owner reported on 2026-11-17 that the actual locally V2-signed B150 APK **installed over B149 without uninstalling**. This proves the owner APK V2 signing continuity on the tested phone; user data persistence and all feature behavior still need owner checking.

- APP ID `com.aoqat.calendar`; displayed version `2.12`, Android versionCode `150`.
- Owner-approved APK signer fingerprint: `9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765`.
- Exact signed owner APK B150 SHA256 (from local Termux signing result): `eb3d615ed169819294d8e608a166883345be4b80a807a9d72bdff5cf70bf30b5`.
- OTA ECDSA P-256 publisher key SPKI SHA256: `8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d`. **Separate from APK PKCS12 signer.**
- **No live OTA update has been installed yet on B150.**

## Owner-only pilot
Use the public Python helper `security/owner-ota-v2-build150.py` from this exact reviewed Git commit.

Owner's existing local Termux paths:
- `~/storage/downloads/aoqat-b150-v2-2.12-signed.apk`
- `~/aoqat-keys/aoqat-update-private-v2.pem` (NEVER transfer to GitHub/chat)
- `~/aoqat-keys/aoqat-update-public-v2.pem`

Run `python3 ... --self-test` with network off after validating helper SHA; no actual owner private key is used.
Then `python3 ... --owner-stage` with network off and type the **OTA private PEM** passphrase into local, hidden prompt. The helper:
1. Authenticates EXACT signed APK hash, expected V2 certificate and OTA publisher SPKI.
2. Extracts only the original `assets/www/index.html` bytes from the **signed B150 APK**, without editing it.
3. Signs a 14-day, sequence 1, `nativeBuild=150` manifest and verifies locally. No changes to content.
4. Writes ONLY the public no-op review package `AOQAT-150-OTA-V2-OWNER-REVIEW-seq1.zip` to Downloads with `android-updates/build-150/manifest.json` and `android-updates/build-150/files/index.html`. It never accesses the internet nor publishes anything.

The actual APK must first be test-installed and its settings preserved. If the owner B150 APK hash differs, STOP instead of bypassing validation.

## Release holds
- Independently inspect ONLY the public ZIP, the exact signature, SHA256, expiry, build, sequence, allowed web files and byte-for-byte original APK index.
- Review on a separate branch. No merging into `main`, no production Vercel deployment or auto-update distribution without explicit owner approval.
- To test OTA receiving over a network, deploy the signed no-op files only to `https://aoqat.vercel.app/android-updates/build-150/` following a scoped reviewed change, then open and relaunch B150 to observe download, staged activation and `startupReady()` confirmation. A signed update for build 149 **must not be accepted** by B150.
- Check offline prayer times, Quran 604 pages, alarms, widgets, Adhan/iqama, themes and settings after network is off. Do not claim a no-op test fixes Quran page swiping delays.
- Future web/JS/CSS updates require new valid owner-signed manifest (sequence strictly increases) and must obey the APK signed updater's allowed paths. Native Kotlin/QCF font/prayer database changes **require complete newly V2-signed APK**.

**Status**: preparation of B150 signed no-op OTA pilot only; not automatic deployment, not public release.
