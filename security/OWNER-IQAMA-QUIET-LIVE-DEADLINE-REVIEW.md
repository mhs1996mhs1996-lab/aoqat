# OwnerPilot B150 — quiet deadline revalidation, no publication

## User's second real-device report
At 18:50 on November 19 the user's separate `أوقات الصلاة — تجريبي` APK still displayed **16** minutes for Isha post-Iqama silent. They reported prayer at **18:21**, before-Iqama **15** minutes (zero at **18:36**), and phone returning to sound at **18:48** instead of **18:52**. The 18:48 observed time is 12 minutes after Iqama; the cause cannot be conclusively proven from the screenshot alone, because screen UI values do not include the previously scheduled Android restore deadline.

The earlier `minOf(quiet, elapsed)` truncation was fixed and unit-tested in previous owner-only branch. This is an additional defense for an Android **already scheduled** restore alarm that still carries an earlier duration after changing settings or upgrading.

## Owner-only native change
- `AfterIqamaQuiet.reconcileOwnedDeadline(c)` checks the phone's currently saved `afterIqamaSilent.minutes[prayerId]`, exact per-prayer `IqamaNativeScheduler.durations.beforeMinutes` and original prayer timestamp to calculate the exact absolute desired deadline. Does not use the elapsed countdown as a quiet cap.
- Recompute only when **this app already owns the ringer** and an `iqamaEnd` and persisted original prayer cycle exist. Safeguard against stale/unrelated cycle using stored `iqamaPrayerId` / `iqamaPrayerAt`; legacy ownerPilot may lack these IDs, in which case the native persisted cycle remains the fallback. No new mute starts from this method.
- When a 12-minute old RESTORE_SOUND alarm arrives at 18:48 while 16-minute quiet is saved and the legitimate end is 18:52, arm a new exact recovery alarm BEFORE updating saved `end` and `iqamaEnd` to 18:52. The ringtone stays silent.
- When the user SHORTENS duration (e.g. to 7 after 9 minutes have passed), recompute the earlier deadline and restore promptly. When the notification service ends after its own timer, it does not force early ringtone restoration.
- Trigger reconciliation when `AdhanSchedule.configure` saves new user quiet settings, before any `RESTORE_SOUND` handler calls `restoreRingerIfExpired`, and before `AfterIqamaQuiet.onCountdownComplete` processes elapsed display expiration.
- Preserve Android DND settings, old volume mode and safety checks, user-chosen values, all other notifications, prayer data, Quran, offline pages and admin.

## Real-device checks required
1. Before-Iqama = 15, elapsed = 12 (or default 10), silent after = 16; inspect actual first silent mode and restore at +16 AFTER zero, not +12 or elapsed expiry.
2. Check + and - changes in the separate ownerPilot UI, preserve durations after app restart. Changing quiet from 12 to 16 DURING a live interval must move recovery deadline to +16; shortening from 16 to 7 after +9 must restore immediately.
3. Test a screen-off handset, the app in background, and old notification end before quiet end. Verify DND/manual sound restoration and permissions. Verify another day's prayer never inherits old recovery.
4. IMPORTANT: if sound still restores early despite the native test, it could come from outside the app (device DND/automation, OEM ringer handling) or from runtime preferences not matching screenshot. Only actual device diagnostics can determine the exact cause.

## Safety
This branch is based on `fix/ownerpilot-independent-iqama-quiet-20261119`, not main and not `aoqat-admin`. No production code edits or user releases. Native Kotlin correction cannot be delivered via HTML/JS OTA. A new separate **unsigned ownerPilot APK** is compiled in CI, then signed locally by the owner using the already-approved APK V2 P12; do not uninstall current pilot or overwrite owner OTA keys. Do not promise that code review alone proves an Android OEM sound behavior fixed. No publish without owner approval.
