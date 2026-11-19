# Proposed B150 pilot quiet-mode UI performance repair (NOT YET RELEASED)

Reported on real Android phones: checkbox toggling appears slow and sometimes app exits, each +/- minute tap takes too long, the keyboard opens on +/- even though it should open only on numeric tap, and the stepper buttons are oversized.

This branch only edits `android-native/apk-overrides/native-quiet-menu.js` and adds tests. It **does not** change `aoqat` main, the published OTA channel, the admin dashboard, the signed seq3/seq4 releases, prayer data, Quran assets, DND native services or APK permissions.

Proposed behavior:
- Clicking checkbox changes that card's controls immediately, WITHOUT reconstructing the entire panel.
- +/- updates only the numeric input before an Android call; native settings saves are coalesced over 180ms.
- On visibility change or pagehide, the pending last settings change is flushed, preventing a stale value.
- Touching +/- never automatically focuses the number. Direct numeric tap remains editable, Arabic input normalizes to ASCII digits, and 0–120 minutes constraints remain.
- Smaller 34x36px +/- controls, 45x36px number, closer spacing.
- Synchronous native save errors display a local warning instead of hiding them.

Important: this is a **code-level UI fix**, not proof of native device stability. Native Android alarm scheduling and OEM DND/ringer behavior must be tested on the owner's phone. The compiled JS lives in APK's `js/apk-startup-bundle.js`, so distributing it via a future signed OTA needs a special, reviewed `index.html` + startup bundle snapshot. Do NOT sign or push this as seq4. After the owner's seq4 profile-only test succeeds, separately produce signed **seq5** and observe checkbox, 20 rapid +/- presses, manual input, permissions, restart, Fajr and other prayer schedules, native ringer restore, and background/crash behavior. No public release before explicit approval.
