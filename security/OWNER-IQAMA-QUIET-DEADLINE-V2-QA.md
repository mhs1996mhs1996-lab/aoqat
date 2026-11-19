# OwnerPilot only: early ringtone restoration after user-selected 16-minute quiet

Observed on phone: adhan 18:21, before-Iqama 15m => Iqama 18:36; user-selected quiet 16m => restore 18:52; actual restore 18:48 (12m after Iqama). The screenshot shows 16m on the quiet page, but that screenshot alone does not prove the native Android preference at the instant of activation was also 16m.

## Confirmed source-level second coupling
The earlier correction in AfterIqamaQuiet.window removed the display duration cap. Another native path in AdhanPlaybackService.activateQuiet still used `minOf(maxOf(end,oldEnd),iqamaCap)` when a quiet window was already owned and a stale iqamaEnd remained. This can truncate later overlapping windows and must never be allowed. Replace with `QuietDeadline.merge(end,oldEnd,already)`, so the requested period cannot be cut short by a display countdown or previous shorter interval. Keep original previous ringtone/DND state and exact restore alarm. Do not touch production.

## Test cases
- Before-Iqama 15m, elapsed display 10m, quiet 16m => quiet ends at +31m from adhan, not +25m or +27m.
- Existing 12m quiet followed by 16m requested quiet => end at 16m.
- Existing 16m quiet followed by shorter request => never prematurely restore earlier quiet.
- Fresh cycle after restore => never inherit a stale previous end.
- Other existing Android tests unchanged.

## Remaining diagnostic gap
The 18:48 observation is also consistent with a **12-minute value saved in native settings** while the UI later showed 16. Verify saved settings vs displayed setting at actual activation time and ensure no external device DND schedule or OEM ringer policy acted. Do not claim the observed 18:48 issue fully fixed before reproducing on phone. The current seq8 UI has a debounced asynchronous Android bridge save. The screenshot after APK upgrade also lacks the seq8 visual style; verify OTA overlay state before concluding the settings UI represents the same native state.

## Deployment
Draft review branch only, native Kotlin, not JS OTA. No APK signing, user distribution, production app, admin app, or modification of unrelated prayer/Quran files. New unsigned owner-only pilot APK must pass native unit tests and be locally signed by the owner before device testing.
