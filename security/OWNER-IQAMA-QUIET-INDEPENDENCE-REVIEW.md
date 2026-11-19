# Review: independent iqama elapsed counter and silent window (owner-only pilot)

## Owner-observed failure
Owner reports: "مضى على الإقامة" continued to 12 minutes despite expecting 10 by default; the after-iqama quiet ringtone returned after 10 even though user selected 12 minutes. Never change or reset the owner's preferences without consent.

## Verified code defect and limited repair
The B150 Kotlin `AfterIqamaQuiet.window` incorrectly computed the silent deadline as
`iqamaZero + minOf(configuredQuietMinutes, elapsedCounterMinutes) * 60_000`.
This silently capped requested **12-minute quiet** at the separate **10-minute elapsed countdown**.

The repair uses `iqamaZero + configuredQuietMinutes * 60_000` instead. Both still share the correct zero point (`prayerAt + beforeIqamaMinutes`), but their deadlines are **independent**:
- Elapsed countdown defaults to **10 min**; its per-prayer overrides are stored in `iqama_schedule.afterMinutes` and used only for notification / web "مضى" via `IqamaCycle.Durations.afterMinutes`.
- After-iqama quiet per-prayer minutes are stored in `adhan_settings.settings.afterIqamaSilent.minutes` and applied by `AfterIqamaQuiet.window`/native ringer alarm. Zero disables silence for that prayer; quiet switch is independent of the adhan master switch.
- 10 elapsed / 12 quiet => notification can finish at +10, ringtone stays quiet until +12. 12 elapsed / 8 quiet => ringtone restores at +8, notification can continue through +12.
- Ringer restore is set from the original **absolute** quiet deadline, not how late the app or notification wakes up. The existing `AfterIqamaQuiet.onCountdownComplete` calls `restoreRingerIfExpired`; early countdown expiry must not restore a still-active longer quiet period.

Other underlying native scheduling, Quran, prayer-data, JS settings, production app, admin repo and public OTA remain unchanged. The owner-specific QA screen has one **read-only** button to show the effective saved native before/after durations and quiet durations for each prayer. It distinguishes stored elapsed values versus the 10-minute fallback without mutating anything.

## What is NOT established yet
Why the owner's elapsed display reached 12 minutes cannot be concluded from source code alone. The JS default `aoqatAfterIqamaMinutesV1` is 10, but the browser's local storage and Android `iqama_schedule.afterMinutes` can contain old overrides. The owner QA diagnostic can identify whether Android's afterMinutes has a stored 12 or uses the 10 default; compare it against the separate web display. Do NOT silently overwrite old settings or mislabel the cause.

## Tests and deployment boundary
Robolectric tests verify both independent directions, explicit 0 quiet, adhan master independence, exact 12-minute ringtone deadline with 10-minute elapsed count, restoration alarm, prior user DND state, and no early restore. Full `testDebugUnitTest` + `assembleOwnerPilot` CI are required.

**Native Kotlin changes cannot be delivered in web-only OTA ZIP seq9.** To test this fix on the owner's phone, CI prepares an unsigned **com.aoqat.calendar.ownerpilot** APK under the existing B150 build; the owner must sign it LOCALLY using the existing `aoqat-apk-production-v2.p12` / AOQAT-APK-V2 certificate and install it over the ownerPilot app. Never use ADMIN P12, do not uninstall the normal prayer app and do not publish to users. With the same ownerPilot app ID, version code and trusted signing certificate, Android should allow in-place installation, preserving its local prefs and seq8 OTA snapshot; verify in-place behavior on owner's actual device.

Before future public release, construct a separate production-signed APK update using the validated stable production signing identity, check native build/version eligibility and OTA snapshots, run phone tests and require the owner's explicit approval. **No production APK or user channel changes from this branch.**
