# Owner-only build 150, OTA V2 sequence 6 — quiet controls

**Status:** code review and isolated tests complete; **the owner's phone must still test the signed update**. Do not merge into published OTA, main Android APK, or public website. No auto rollout.

The owner installed signed sequence 5 and confirmed: checkbox slowness and unwanted keyboard had improved; the +/- increment/decrement still felt delayed and the settings cards/buttons consumed too much screen space.

## Scope — exact difference from seq5
- Modify only the signed `index.html` script reference **from** `js/owner-quiet-seq5.js` **to** `js/owner-quiet-seq6.js`; preserve every other byte.
- Add `js/owner-quiet-seq6.js`, reviewed and pinned SHA256. This rebinds the original APK quiet panel. It shortens the native write delay from 180ms to **1400ms of inactivity** so rapid taps do not constantly re-trigger the heavyweight native `AdhanSchedule.configure` work (re-scheduling multiple alarms and widgets). It still flushes the latest selection on `visibilitychange`/pagehide, and changes the displayed number immediately.
- Do not run seq5 and seq6 quiet scripts simultaneously: prior handlers would otherwise both remain registered and write conflicting states. The old `js/owner-quiet-seq5.js` is **retained unchanged in the seq6 ZIP and signed manifest** for the Android anti-deletion safety invariant, but is **not referenced** in the new index.
- Compact the UI: remove the redundant inner title, use collapsible help (still readable on demand), concise minute instructions, two-column responsive rows with no horizontal overflow, no full panel redraw on every tap, and 34x38px +/- button faces within 44px-high rows, with readable numeric input. The label remains right-aligned. For narrow phones a media query preserves working widths and prevents clipping.
- Respect both sections (adhan and post-iqama), all five prayers, 0–120 minutes and manual numeric editing; no change to existing saved data or native DND logic.

**Limitations:** Native alarm rescheduling still runs once on idle save, which may briefly use the Android main thread. This partial web update cannot rewrite the native `AdhanSchedule.configure` implementation. Confirm the perceived latency and crash behavior on actual hardware before calling it fixed; if substantial lag remains, the proper next correction is a separate *full APK* native scheduling optimization with owner QA.

## Verify and sign locally — owner Termux
Download BOTH files to the root `Download` folder:
- `owner-ota-v2-b150-quiet-seq6.py`
- `owner-ota-b150-seq6-quiet-compact.js`

Keep the previously **signed** seq5 ZIP at `~/storage/downloads/AOQAT-B150-OWNER-SEQ5-QUIET-FIX-SIGNED-TEST-ONLY.zip`. The script rejects unsigned or altered old archives, keys from a different publisher, changed SHA256 hashes, expired manifests, and existing output files. It uses the original `~/aoqat-keys/aoqat-update-private-v2.pem` and matching public key on device.

Run:
```sh
python ~/storage/downloads/owner-ota-v2-b150-quiet-seq6.py --owner-stage
```
Enter the **AOQAT-OTA-V2** PEM password (different from the APK/ADMIN P12 passwords). The hidden password is never sent to GitHub.

Generated local result if valid:
`~/storage/downloads/AOQAT-B150-OWNER-SEQ6-QUIET-COMPACT-SIGNED-TEST-ONLY.zip`.

In **أوقات الصلاة — تجريبي** only, choose "اختيار ZIP موقّع وتجربته", select signed seq6, and press "إعادة فتح التطبيق التجريبي لتفعيل المعاينة". Inspect "ضبط التنبيهات ← تنبيهات أوقات الصلاة ← تفعيل وضع الصامت". Test:
1. All five prayer rows remain readable at 320–420px equivalent screen width, no clipped buttons; each +/- remains comfortably tappable.
2. Press +/− 20 times quickly; number updates immediately with no keyboard, slow redraw or exit.
3. Tap the numeric **value** to manually enter a number; Arabic input digits accepted and bounded to 0–120.
4. Toggle checkbox and test both groups; help can be expanded.
5. Change values, leave page and restart app; latest setting persists.
6. Check real adhan/post-iqama timing and ringer restore on handset and additional OEM test devices.

If import fails, send its on-screen diagnostic only; do not reset lastSequence or delete the app to bypass signature or anti-replay validation.

GitHub CI uses only already public seq3/seq4/seq5 source files and synthetic signing keys. No private key is present; CI ZIP is **UNSIGNED / NOT INSTALLABLE**. User distribution remains blocked pending owner explicit approval and broader regression tests.
