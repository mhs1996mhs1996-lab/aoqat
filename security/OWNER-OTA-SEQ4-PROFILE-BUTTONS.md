# Owner-only offline signed OTA test sequence 4 — profile buttons

**Purpose:** demonstrate a new, exactly reviewed change on the owner's separate `أوقات الصلاة — تجريبي` phone app, *before any general release*. This is NOT automated publication or a substitute for testing actual prayer services.

## Change scope
- Base: currently published, owner-signed build **150**, OTA sequence **3**, manifest revision `98554724ebce6ab736e7c5309a136201eb2e6e52fc78085aec6585993e191d8a`.
- Candidate: sequence **4**. Replace exactly one anchored block in signed `index.html` profile subpage handler; add **three local test buttons** (arrival check, counter increment, counter reset). No password fields, persistent settings, personal data, network, native code, notification or prayer/Quran data modified.
- Keep the existing profile entry last in Settings and its back navigation; no new permissions.
- Only `index.html` is in signed snapshot. No deletions or other OTA paths.

## Offline signing on owner's Termux
1. Download the separately reviewed `owner-b150-approved-seq3-signed-smoke-test.zip` from the earlier test (or the review artifact). Its exact signature and hash are validated before patching.
2. Keep `~/aoqat-keys/aoqat-update-private-v2.pem` and `aoqat-update-public-v2.pem` private/on device (the public key is okay to share). The **OTA V2 private key** is not the APK P12 or Admin P12.
3. From Termux run:
   `python ~/storage/downloads/owner-ota-v2-b150-profile-buttons-seq4.py --owner-stage`
   The script asks for the **OTA V2 PEM password in hidden input**, verifies public publisher identity and seq3 signature, signs **seq4** locally and checks it again.
4. The resulting `~/storage/downloads/AOQAT-B150-OWNER-SEQ4-SIGNED-TEST-ONLY.zip` is for **local import into the separate ownerPilot app only**. It is *not* an installable APK and must never be uploaded to the production OTA channel.
5. In `أوقات الصلاة — تجريبي`, choose "اختيار ZIP موقّع وتجربته". Then restart the *experimental* app and open Settings > "الملف الشخصي" to test the three buttons. A successful import alone does not prove complete application functionality.

## CI and safety
- CI uses only the **published seq3 public signed manifest/index and public V2 key** from pinned Git commit, plus **disposable generated keys** for sign/verify tests. No private keys or owner passwords in CI.
- CI produces an **UNSIGNED ZIP for content review only**; that ZIP must be rejected by Android.
- Signing and final installation require the owner's explicit local action and actual phone testing.
- **No GitHub Actions publication**. Do not merge this branch into the production website/OTA source; no production repo branches, Android APK, user databases, or admin files are modified.

## Next phase
Only after real-device seq4 acceptance, prepare a *different* seq5 candidate to fix the quiet-mode checkbox and minute stepper performance. Its native WebView startup bundle must be carefully handled and acceptance-tested for restoration of phone ringer/DND. Do not bundle the change with this seq4 test.
