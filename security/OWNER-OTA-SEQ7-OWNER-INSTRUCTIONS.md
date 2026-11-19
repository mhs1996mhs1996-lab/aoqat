# AOQAT owner pilot — OTA sequence 7 (tight +/number/− container only)

Reported by the owner after installing seq6 on Android: the large blue border around the +/- control, number and "دقيقة" is visually disproportionate. All other quiet functionality (checkbox, fast increment/decrement, numeric keyboard only when selecting number, save) is accepted and MUST NOT be altered.

## Strict change scope
- The previous **signed seq6** offline update on B150 is the mandatory base.
- The exact signed `index.html` stays BIT-FOR-BIT identical to seq6 (still including profile test buttons and the existing script link).
- The **only** signed file updated is `js/owner-quiet-seq5.js` — its internal name is retained to ensure native allowlist/cache paths remain unchanged.
- JS modifications versus seq6 are **only** two localized markup boundaries and a block of scoped `#quietPanel` CSS. The "دقيقة" label moves *out of the blue frame*, adjacent to a close-fitting group containing only minus, 42px number and plus. No change to event logic, bridge calls, durations, saved preferences, UI settings elsewhere, Quran, prayer data or native DND logic.
- + and − retain touch targets of **44×44 CSS px** (accessible on small devices). Cards stay inside the viewport, 5 prayer rows retained. A functional regression test reconstructs seq6 JS **exactly** after reversing these two markup changes and one CSS block, ensuring no unrelated changes.
- No change to any source for normal prayer app, website, admin app, published OTA, Android APK or production user devices.

## Sign / test (owner phone only)
1. Download and unzip `aoqat-owner-seq7-local-signing-files.zip`. Move `owner-ota-v2-b150-quiet-seq7.py` and `owner-ota-b150-seq7-quiet-ui.js` directly to **Download**.
2. Keep your already owner-signed `AOQAT-B150-OWNER-SEQ6-QUIET-COMPACT-SIGNED-TEST-ONLY.zip` there. The local script strictly verifies its ECDSA signature, publisher, B150, seq6 and pinned content hashes. **Do not use an unsigned review ZIP**.
3. In Termux:
   `python ~/storage/downloads/owner-ota-v2-b150-quiet-seq7.py --owner-stage`
4. Enter password for encrypted `AOQAT-OTA-V2` PEM **on your phone**. Never send password or key to GitHub or ChatGPT. Your APK/ADMIN P12 are NOT used.
5. The signed review ZIP is generated inside Download:
   `AOQAT-B150-OWNER-SEQ7-STEPPER-BALANCED-SIGNED-TEST-ONLY.zip`
6. In **أوقات الصلاة — تجريبي**, import this ZIP from the owner-only test screen and restart when prompted. Compare the quiet screen to seq6: only the border/group around +/-/number should be narrower; "دقيقة" remains readable outside; no cut edges and no keyboard on +/-.
7. Verify 5 prayers, repeated presses, reopen persistence, 0–120 limits and checkbox responsiveness. Problems should be reported **before** any production adoption.

**Nothing automatically publishes.** This branch is a quarantined draft for the owner phone only. The user's real APK, settings, and offline app are not modified by GitHub CI. Actual-device testing is required.
