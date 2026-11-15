# AOQAT V2 — Build 149 signed automatic update / owner-only acceptance

## Verified state (2026-11-15)
- Owner APK V2 RSA certificate: `9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765`.
- Real signed APK builds 146,147,148,149 installed on test phones. Build 149 upgraded over 147 without uninstall; the owner reported identical normal line sizes but Quran swipe delays remain.
- The **different** ECDSA/P-256 OTA V2 public key pin is already in `WebUpdates.kt`, SPKI SHA256 `8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d`.
- Android automatically checks for updates on startup and resume, throttled to 5 minutes. After validated download, activation is on the next launch. Corrupt/unsigned/other-build/replayed versions are rejected. Installed content stays available offline.
- **There is NO signed, deployed build-149 OTA channel yet.** V2 APK signing alone does not make update manifests valid.
- Current deployed `main` is an older baseline and must NOT be overwritten by a security trial. Do not merge this draft.

## 1. Safe pilot: owner signs exactly the packaged index.html (NO FUNCTIONAL CHANGES)

The standalone public helper is `security/owner-ota-v2-build149.py`. It has two modes:

- `--self-test`: temporary disposable local EC key; never uses owner keys.
- `--owner-stage`: input signed `aoqat-b149-v2-qcf-uniform-signed.apk` from Download, verifies the exact owner's signed APK SHA256 and V2 signer, extracts its **unchanged** `assets/www/index.html`, constructs build=149 sequence=1 expiring in 14 days, prompts for the **OTA update private PEM** password, signs using a local private anonymous FD to OpenSSL, independently verifies with the V2 public PEM, tests a forged sequence, creates a ZIP of *only public files*.

No browser/account/GitHub upload, APK signing, or HTTP request is made by this helper.

The key paths are stored only on the owner's phone:
- `~/aoqat-keys/aoqat-apk-production-v2.p12` (Android APK signing key: **not used for OTA**)
- `~/aoqat-keys/aoqat-update-private-v2.pem` (encrypted private OTA signing key)
- `~/aoqat-keys/aoqat-update-public-v2.pem` (matching public OTA verifier).

The output from the owner's phone is:
`~/storage/downloads/AOQAT-149-OTA-V2-OWNER-REVIEW-seq1.zip`
with exactly these public paths:
`android-updates/build-149/manifest.json`
`android-updates/build-149/files/index.html`

**If either key is missing, public fingerprint disagrees, or the APK differs from the one the user tested, stop.** Do not upload the private PEM or P12 and do not post the passphrase in a chat.

## 2. Independent signed-bundle acceptance before publication

Owner may provide **only** the public review ZIP when signing succeeds. On a separate review branch:
1. Independently extract and verify exact signer, build 149, sequence 1, expiration window and SHA256 of every listed payload, against `security/aoqat-update-public-v2.pem`.
2. Confirm that the ZIP contains only an unmodified `index.html`, byte-for-byte matching the exact reviewed B149 APK. No altered web files, Quran, assets, or prayer data.
3. Run `security/test-signed-update-manifest.py` and Android `WebUpdatesTest` (missing/invalid signature, payload tampering, replay, expiry, wrong build, crash rollback, forbidden paths).
4. Review the *specific* origin path `https://aoqat.vercel.app/android-updates/build-149/`; it must serve manifest and permitted payload with no HTTP redirects or cache confusion. No unreviewed files may appear in that folder.
5. Only after owner approval, use a separate reviewed deployment PR restricted to `android-updates/build-149` and authorized manual deployment. Do not merge the experimental Android changes as an implicit side effect.
6. Test on the B149 phone: with network on, open app to check; re-open to stage signed update; re-launch to activate; confirm startupReady; enable airplane mode and verify UI, Quran, calendar, adhan/notifications, bookmark persistence. Confirm app continues if the server is unavailable. Verify replay/forged signature rejects and rollout rollback.
7. Do not use OTA for Kotlin/native Android code, Quran pages/fonts or prayer data. Such changes require a new APK with the **same** V2 APK signer.

## 3. What future users experience

With owner-reviewed signed OTA deployment, users need only an internet connection *when checking* and restart/reopen to activate; no Termux or private keys. Subsequent offline use remains as before. The installed APK V2 trust chain is necessary. Android package upgrades are separate: the app must download and request OS installation of a V2-signed APK, with OS user consent; Android won't silently install it.

**Status**: ready for a local owner key preflight / signed NO-OP update pilot; **not** approved for unattended deployment or public release.
