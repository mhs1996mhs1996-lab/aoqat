# Build 150 / AOQAT 2.12 — V2 owner release candidate

This is a new **complete APK** release candidate, NOT a partial web patch or publication. The tested owner-signed B149 continues working untouched.

## Identity and compatibility

- Application ID: `com.aoqat.calendar` (unchanged).
- Version name: `2.12`; Android versionCode: `150` (greater than B146–149).
- APK signature: the SAME owner-held offline `aoqat-apk-production-v2.p12` / `aoqat-production-v2` key, expected public SHA-256 `9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765`.
- OTA (separate trust chain): the unchanged pinned ECDSA/P-256 V2 public key, verified by `WebUpdates.kt`; owner private PEM must remain in Termux.
- Build 149 and other V2 installs can install build 150 over the existing package without deleting it, if verified with the same owner signer. Older 2.10 used a different certificate and **cannot** upgrade via signed B150 install-over; owner-approved clean reinstall requires user-data precautions.
- Native updates, Quran font assets and offline prayer-time data are **never** supported by the signed partial OTA channel. Those need a new V2-signed APK.

## No-patching / strict content freeze

Entire project source — including website, prayer data, 604 Quran page fonts, user settings schema, alarms, notifications, widgets, lock screen and all native Kotlin — **must be byte-for-byte identical** to owner-tested B149. The ONLY changes authorized in this review branch are versionCode/name, matching regression-test version assertion, this checklist, and CI workflow. Additional changes, even ostensibly small bug fixes, require a separate proposal, owner review and tests.

CI proves this with an allowlist diff from B149 SHA `db11b2a7e6cc34736fa654540e397c7350296450` and validates exact Gradle/tester replacements. Rebuilds and checks Android tests, all 604 original offline fonts, 366 prayer days, Quran renderer content, native updater trust boundaries, and byte-for-byte identity of packaged B150 index.html with the already independently owner-signed B149 page (SHA256 `e9a045f8acf0fd6f66bfa6bbdd36dfb3a014a6474d700d840186f7fba682be1f`).

## Owner rollout gates

1. CI green and exact SHA256 of **unsigned** B150 APK recorded.
2. Owner uses trusted locally verified offline signing script, P12 stored **only** on phone. Never send P12/passwords to GitHub, chat, Vercel or any cloud.
3. Verify owner-signed B150 certificate SHA256 and versionCode/Name. Only then install B150 **over B149** on the test phone with no uninstall. Confirm stored settings, bookmarks and alarms persist.
4. Test fully offline (QCF first/last 604, prayer times, iqama, alarms, lock-screen widgets, permissions, audio and local prayers). Important: page swipe delay is still a known unresolved B149 issue, not falsely claimed solved.
5. Build-specific signed OTA: previous B149 signed manifest `nativeBuild=149` must be REJECTED by B150; owner must use OTA V2 private PEM to sign an independently reviewed `nativeBuild=150` manifest. Initial pilot should contain only identical packaged `index.html` so activation adds zero UI functionality.
6. Review the exact `android-updates/build-150/manifest.json` and `files/index.html` under a separate draft. Deploy only after owner explicitly approves and review confirms no unrelated web changes.
7. On B150 tester phone confirm auto-check when opened/resumed with internet, signed payload download, **activation on next launch**, startupReady acknowledgement, previously saved settings, offline fallback, rejection of tampering and no repeat downloads. No real OTA publication or production release without this test.

## Status

- B150 source candidate built in separate review branch, no deployment.
- V2 owner signing of B150 and B150-specific OTA are **NOT yet completed** until owner runs local key signing/tests.
- APK 2.12 with no content edits cannot automatically repair the pre-existing Quran swipe-latency issue.
