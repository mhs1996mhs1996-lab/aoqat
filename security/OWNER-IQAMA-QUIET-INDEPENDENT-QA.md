# Owner-pilot Android audit — independent elapsed-Iqama timer and post-Iqama silent duration

## User-observed bug
The owner configured post-Iqama silent for **12 minutes**, while `مضى على الإقامة` remained at its **10-minute default**. The handset reportedly restored its sound at minute 10 instead of minute 12. The owner also observed an elapsed counter exceeding its expected limit on at least one device.

## Confirmed deterministic source defect (ownerPilot build 150)
`android-native/app/src/main/java/com/aoqat/calendar/AfterIqamaQuiet.kt` contained:
`return start to start+minOf(duration,elapsedMinutes.coerceIn(0,120))*60000L`.
This explicitly *silenced for the shorter of the two durations*. That is wrong: displaying the elapsed-Iqama timer is independent of the user's saved silent preference.

Fix is restricted to `return start to start+duration*60000L`; maintain the existing argument for binary/source callers and all safety guards. In `AfterIqamaQuiet.onCountdownComplete`, the existing logic checks the independently scheduled `iqamaEnd` and calls `restoreRingerIfExpired` before restoring; the extension to 12 minutes therefore remains protected at minute 10. Native restore alarm is scheduled before the ringer is changed and will return ringer at the absolute end. Do not use the user-facing elapsed timer or notification close to force premature sound restoration.

## Checks
- 10 minute before-Iqama, 10 minute elapsed display, 12 minute after-Iqama quiet: elapsed display finishes at +20m from prayer time; ringtone restoration at +22m.
- All five prayer IDs use their independent user quiet duration.
- Quiet shorter than elapsed (e.g. 7 mins) must restore earlier than the countdown ends.
- No adhan master toggle coupling; no widening of allowed prayer IDs or durations; no change to DND preservation, audio player, lock-screen, Quran or prayer data.
- Existing Robolectric tests cover DND policy, exact alarm restoration and stale-cycle safety.

## User clarification: defaults are NOT limits
The owner explicitly requires that the **untouched elapsed-Iqama timer defaults to 10 minutes**, but changing any of the three values should be honored **per prayer**:
- Remaining before Iqama: its own user-selected time (the pre-existing Fajr default remains 20, other prayers 10 until owner changes it).
- "مضى على الإقامة": 10-minute untouched default; valid custom values from 1 to 30 minutes must replace the default, not be capped by it.
- Silent after Iqama: its own selected 0-120 minute value (zero disables that prayer); neither ten-minute defaults nor an edited elapsed timer may shorten or extend it.
For example, remaining=12m, elapsed=25m, quiet=15m means Iqama zero at +12m, quiet ends +27m, elapsed display ends +37m. These are three independent choices. Existing Android preference fields `iqama_schedule.minutes`, `iqama_schedule.afterMinutes` and `adhan_settings.afterIqamaSilent.minutes` remain separate. No default reset on saved settings or restart.
The test suite uses five distinct custom triples, plus a saved default untouched elapsed=10 / before=12 / quiet=15 case, to prevent the same bug from returning.

## Still open
The **separate** report that `مضى على الإقامة` kept displaying beyond ten minutes has NOT yet been reproduced or repaired. Possible causes include device-side delayed notification expiry, a different native value from web UI localStorage, and system notification refresh lag. Do not claim this issue fixed merely from quiet interval tests. Need verify the on-device native `readIqamaTiming().afterMinutes`, app-side `aoqatAfterIqamaMinutesV1`, actual notification start/end anchors, and Android alarm accuracy with phone diagnostics before touching unrelated display code.

## Deployment boundary
This is a DRAFT branch based on the exact owner-only B150 pilot, not main and not `aoqat-admin`. It changes only one Kotlin source + its test + review docs/workflow. It does NOT change deployed APK/production OTA. **This native Kotlin change cannot be installed through an HTML/JS-only signed OTA ZIP**; a fresh pilot APK build and owner-local signing with fixed APK V2 P12 would be needed for on-device acceptance. Do not publish to users without full acceptance and explicit owner approval.
