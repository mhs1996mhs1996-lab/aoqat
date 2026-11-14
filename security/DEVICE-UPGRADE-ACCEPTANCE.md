# v2.10 -> hardened APK / V2 signer: acceptance matrix (SECURITY HOLD)

**Status:** planning and test criteria only. No public APK has been approved,
signed or released. The previously distributed signer is exposed in GitHub
history; the owner's final V2 APK signer is encrypted and stays on the owner's
device. The new certificate is available PUBLICLY as
`security/aoqat-apk-public-v2.crt`.

## Important: two distinct signer identities

| Identity | SHA-256 |
|---|---|
| Previously installed v2.10 APK signer | `aa72af7eb8b22501686b77e86f6c0bf1c6a1b61378cf67ca705076282357b496` |
| Owner's new V2 APK certificate | `9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765` |

The V2 ECDSA *partial-update* signing key is NOT an APK signing certificate.
Pinning it in Kotlin does not repair the old APK signer or give Android
permission to replace the installed package.

## Devices requiring independently witnessed install-over tests

| Android | API | Proposed check | Stop condition |
|---|---:|---|---|
| 8.0 | 26 | No v3 rotation; test owner-approved data export/import separately | Any claim of direct old->V2 APK upgrade |
| 8.1 | 27 | Same as 8.0 | Any user-data deletion or forced uninstall |
| 9 | 28 | Review v3 lineage and test genuine installed v2.10 -> candidate | Signature or installer error; data loss |
| 10 | 29 | Same as API 28 | Wrong signer, permissions loss |
| 11 | 30 | Same as API 28 | Downgrade acceptance, data loss |
| 12 | 31 | Independently verify lineage behavior | Any uncertain acceptance or signature mismatch |
| 12L | 32 | Independently verify lineage behavior | Any uncertain acceptance or signature mismatch |
| 13 | 33 | Validate v3.1/v3 rotation boundary | Wrong certificate selected, data loss |
| 14 | 34 | Validate install-over and persisted settings | Data loss or unsigned updates |
| 15 | 35 | Validate install-over and persisted settings | Offline Quran/timetable regression |
| 16 | 36 | Validate signing and OS permission behavior | Missing alarms or data loss |

The stock `apksigner` may use Android 13+ v3.1 by default; a deliberate
`--rotation-min-sdk-version 28` changes signer targeting. Follow official
documentation AND real-device tests. Do not assume an `apksigner verify`
success proves an installed old-signer package can be upgraded.

- https://developer.android.com/tools/apksigner
- https://source.android.com/docs/security/features/apksigning/v3
- https://source.android.com/docs/security/features/apksigning/v3-1

## Required evidence for EACH real-device test

1. Record model, Android API, exact installed app version and the observed
   original APK certificate SHA-256 **before** changing anything.
2. Confirm the original app is fully operational: prayer times for Hawija,
   next-prayer countdown, iqama counters, Quran pages, and offline mode.
3. Make an owner-approved user-data backup; independently verify its restore
   procedure **without disturbing the only installed copy**.
4. Record nonsecret sentinel settings: selected theme/font sizes, notification
   toggles, silent/DND configuration, adhan voice, Quran reading position,
   calendars and customizations, and relevant app permissions.
5. For a supported Android 9+ test **only**, try the candidate APK over
   v2.10 **without uninstalling**. Log the package-manager result, then verify
   installed certificate and persisted sentinel settings.
6. Confirm 604 Quran page fonts and the offline annual prayer timetable still
   load; verify no silent substitution of Quran/prayer data, even without
   internet. Re-check dawn/sunrise and Friday/iqama behavior.
7. Verify scheduled alarms, persistent notifications, lock-screen behavior,
   Android permission changes and one failed signed web update rollback.
8. For Android 8/8.1 do **not** attempt a new-key install-over release:
   demonstrate an independently reviewed consent-based data export/import
   transition before requesting any change to installed apps.
9. Keep the existing APK and data untouched on any test failure. Record
   evidence, block release, and repair in the isolated security branch.
10. Owner approval, at least two independent content/security reviewers, and
    enforced branch rules remain mandatory before release.

## Owner-only offline inspection — public signatures, no secret files

```sh
# Run on a trusted workstation equipped with Android SDK Build-Tools.
# This reads the already-signed candidate APK and an optional original APK.
python3 security/audit-apk-signatures.py \
    --apksigner /path/to/Android/Sdk/build-tools/XX.X.X/apksigner \
    --original-apk /safe/path/to/real-v210.apk \
    /safe/path/to/owner-signed-candidate.apk
```

This script reports the signing certificate visible at API levels
26/27/28/32/33/35. It does **not** require the PKCS#12 keystore or a
password; its results do not authorize an installation or a release.

### Final release gate (all mandatory)

- [ ] Final source code reviewed and CI green on **exact release SHA**
- [ ] New signer verified independently from the exported owner public cert
- [ ] Valid proof-of-rotation tested on targeted Android 9+ versions
- [ ] Android 8/8.1 data migration demonstrated, approved and documented
- [ ] Owner's actual v2.10 installs upgrade without clearing user data
- [ ] Offline Quran, prayer timetable, alarms, silent mode, adhkar and settings pass
- [ ] Signed update generated offline by owner; tampering/replay rejected
- [ ] No private APK / update signing material entered GitHub, Vercel or chat
- [ ] Enforced branch rules, reviewer approvals and owner authorization

**Until all items are satisfied: NO MERGE, NO APK RELEASE.**
