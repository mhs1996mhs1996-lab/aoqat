# Android 8 / 8.1 — safe signer-change options (NO RELEASE DECISION)

**Purpose:** prevent silent loss of user prayer settings when moving the app
from the known compromised legacy APK signing certificate to the owner's
independent, private V2 signer.

## Platform boundary

Android 8.0 (API26) and 8.1 (API27) do not support APK Signature Scheme v3
certificate lineage. A new certificate for the **same** package ID cannot
normally be installed over an existing APK signed with the old certificate.

**Never ask users to uninstall before a verified backup and migration route
exists.** Cloud and device-transfer backup exclude:
`adhan_settings.xml`, `adhan_ringer.xml`, `adhan_audio_volume.xml`
and `custom-adhan/`. Other app-private state may include the WebView
localStorage origin, Quran position, alarm settings and scheduled reminders.

## Persistent user choice versus runtime recovery state (verified in code)

**Do not blindly export/restore every excluded preference XML file.**
A migration must separate user-selected options from device-specific,
in-progress Android sound/alarm state:

- `adhan_settings.xml` contains the user-selected `settings` JSON, but it
  also holds transient `delivered_*`, `started_*`, `retryAt_*`,
  `retryCount_*` and `enabledAt` scheduling markers. Only reviewed
  user-selected settings should be copied, then native alarms re-scheduled.
- `adhan_ringer.xml` stores the previous ringer/DND mode, mute state and
  temporary restore deadline. This is *runtime rollback state*, not a user
  preference. **Never import it to a different phone or separate app.**
- `adhan_audio_volume.xml` stores previous/applied Android stream volume for
  restoring audio after playback; it is also transient. User-chosen adhan
  volume belongs in the reviewed `settings` JSON, not a restored stream state.
- `adhan_resume.xml` stores a temporary playback position. Do not transfer
  it; start fresh. Android scheduled `PendingIntent` alarms, permission
  grants, battery policy and notification channels must be configured anew.
- `filesDir/custom-adhan` is **one user-provided audio file**, not a directory.
  It is limited to 25 MiB by the native audio picker and must be expressly
  selected, validated and copied with consent if the user still has it.
- WebView localStorage, fonts, Quran bookmarks, calendar choices and prayer
  design preferences require their own inventory. The existing origin
  migration works only within the **same installed application**.

Restore should be a reviewed, versioned user-consent process with a dry-run
preview and safe rollback; never overwrite a working installed app's data
automatically.

## Conservative option A: distinct-package side-by-side transition

Use an **explicitly identified and separately signed** Android 8/8.1
transition APK that has its **own package ID** and uses the new owner's V2
certificate, with the original APK left installed and fully functional.

- The original package, private files and preferences are left **untouched**.
- **No automatic data sharing or backup restoration is implied.** Android
  isolates private data between package IDs. A reviewed, consent-based export
  from the old app or guided manual setup must be provided and tested.
- User must be able to compare each setting, imported custom audio and Quran
  bookmark before deciding to disable old app reminders. Two concurrently
  active apps would otherwise duplicate azan/notification schedules.
- Old app remains installed until user confirms that the new app works offline
  and all essential data has been independently checked. Never auto-uninstall.
- Separate package IDs also have distinct notification permission, exact alarm
  permission, DND, battery optimization, shortcuts and app links. Explain
  every difference before consent.

**This is only a candidate plan, not an approved APK or automatic upgrade.**
The owner must approve the separate-package approach and test real devices
before implementing and publishing user-facing migration UI.

## Alternative B: legacy-signed export bridge — security exception, not approved

A transition APK signed with the compromised historical signer could in
principle update the old package and add a protected export workflow, but this
extends trust in a previously exposed key. It requires explicit incident
response and owner/security review and must NOT be published merely to bypass
Android 8's signature incompatibility. Do not fetch, upload or use the exposed
private keystore in CI or in this conversation.

## Testing in this branch

The fake APK matrix at
`security/test-emulator-apk-rotation.sh` tests the Android platform mechanics
only. For API26/API27 it:
1. Verifies that v3 rotated APK selection falls back to **old** synthetic cert.
2. Installs a disposable legacy fake package with a private data marker.
3. Installs a disposable **different package ID** with a new synthetic signer.
4. Confirms both packages remain installed and old private marker remains
   unchanged. It does not copy the marker into the new package.

API28 and API33 test old->rotated-new certificate install-over (same package)
and preservation of a private marker using two disposable signing keys.

Evidence and result statuses are in
`security/EMULATOR-V2-TEST-REPORT.md` and the GitHub Actions workflow
`security-emulator-apk-rotation.yml`.

**Hard release block:** Side-by-side synthetic APK installation, if successful,
does not solve the user's actual adhan/custom audio export, permissions, or
the need for a reviewed migration UI. A real owner-signed distribution cannot
proceed solely on these tests.
