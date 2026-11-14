# V2 OTA and disposable Android signature-rotation test results — 2026-11-14

**SECURITY HOLD: No production APK release or real user upgrade has been approved.**

## Automated checks completed

The following CI links contain actual GitHub Actions results from the isolated
security branch. They are not theoretical tests.

| Check | Result | Evidence |
|---|---|---|
| Signed OTA: expired manifest rejected without payload fetch | PASS | [Android security unit tests](https://github.com/mhs1996mhs1996-lab/aoqat/actions/runs/43632516606) |
| Signed OTA: altered confirmed snapshot rejected on next startup | PASS | Same Android unit test run |
| Signed OTA: tampered pending snapshot never activates | PASS | Same Android unit test run |
| Quran/prayer content integrity, signer trust pin, no private-key files, signing audit tests | PASS | [Latest safety guard](https://github.com/mhs1996mhs1996-lab/aoqat/actions/runs/43634230991) |
| Native security APK build and offline package validation | PASS | [Security-only APK CI](https://github.com/mhs1996mhs1996-lab/aoqat/actions/runs/43634078327) |
| Disposable Android emulator signature migration (API 26, 27, 28, 33) | PASS | [Emulator matrix run](https://github.com/mhs1996mhs1996-lab/aoqat/actions/runs/43636253754) |

## Emulator matrix — *throwaway test app and throwaway keys only*

- **API 26 (Android 8):** PASS for expected legacy-signer fallback.
  The disposable rotated APK selects the **old** certificate, not the new.
  Additionally installed a **second fake package ID** with the new disposable
  certificate, kept the old package installed and confirmed its private
  test-data marker persisted unchanged. This proves side-by-side installation
  mechanics, **not automatic user-data transfer**.
- **API 27 (Android 8.1):** PASS. Its available Google APIs emulator uses
  `x86` (not `x86_64`). Confirmed the same legacy signer fallback and
  side-by-side new package installation without deleting the old package or
  its private test-data marker.
- **API 28 (Android 9):** PASS. Verified the selected **new** signer in the
  disposable signing lineage; installed old-signer fixture, wrote a private app
  data sentinel, installed the rotated-signer version over it via `adb install
  -r`, confirmed the sentinel persisted and package `versionCode=2`.
- **API 33 (Android 13):** PASS. Same test: verified new signer selection,
  successful install-over and preservation of the private test sentinel.

The fixture is an empty, debuggable, no-code app with package
`com.example.aoqat.rotationfixture`, not the real AOQAT package. For API 26/27,
the second fake app has the separate package ID
`com.example.aoqat.rotationfixture.newsigner`. Both key
stores are generated in the temporary runner and destroyed afterwards.
Neither the owner's RSA-3072 APK production private key nor the owner's P-256
OTA private key was provided to CI.

### Lessons learned during the tests

- Initial emulator matrix jobs failed due to a test-fixture manifest filename
  and older-format certificate-output parser. These were **test harness**
  problems, not production key material or user data problems.
- Android SDK Build Tools 37 emits `V2 Signer:` and `V3.0 Signer:`
  certificate labels instead of older `Signer #1` output. The isolated
  emulator script and read-only APK signature audit were corrected. Regression
  tests now cover both output formats. The final tests above passed.
- CI inspection/installation of a fake package does **not** validate the real
  installed v2.10 certificate lineage, root-specific phone behavior, app
  settings migration, alert permissions, offline Mushaf performance or adhan
  files. Those need approved real-device and owner-signed-candidate tests.

## Mandatory release blockers, unchanged

1. The old real v2.10 APK signer was exposed in public Git history. Its
   certificate must not be silently reused as a clean production signing
   identity; an owner-reviewed lineage transition is required.
2. The owner-controlled APK signing key `aoqat-apk-production-v2.p12` stays
   offline. Its public certificate is separately pinned in
   `security/aoqat-apk-public-v2.crt`. The fixture keys prove *mechanics* only.
3. Android 8/8.1 users lack v3 key-rotation migration. A side-by-side new
   package can coexist but does **not** carry private settings automatically.
   Export/restore or guided user-consented setup must be designed and tested.
   In particular, `adhan_settings.settings` is persistent user choice, but
   `adhan_ringer`, `adhan_audio_volume` and adhan delivery/retry fields are
   transient runtime state and must never be blindly restored. The custom
   audio is one `filesDir/custom-adhan` file. See
   `security/ANDROID8-TRANSITION-OPTIONS.md`.
4. The real 2.10 -> candidate APK install-over must be tested on physical
   Android 9+ phones and verified to preserve offline Quran, prayer timetable,
   notifications, user settings and adhan/iqama behavior.
5. An owner-signed **actual** V2 OTA manifest must be tested with the owner's
   private key *locally* while keeping that private key and all passphrases off
   GitHub, Vercel and chat.
6. Only an owner-approved reviewed release, after enforced branch protections
   and independent checks, can be published.

**Status: ALL LISTED SYNTHETIC AND AUTOMATED TESTS PASSED; REAL-DEVICE
MIGRATION AND PRODUCTION RELEASE REMAIN BLOCKED.**
