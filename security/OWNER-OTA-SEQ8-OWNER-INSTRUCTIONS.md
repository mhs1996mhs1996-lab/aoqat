# Owner-only B150 OTA sequence 8 — visibly smaller +/- buttons

## Why
Owner screenshot from sequence 7 confirms that although the blue frame narrowed, both cyan buttons and number are still visually oversized in proportion to the "دقيقة" unit and prayer names.

## Exact scope
- This is an owner-only **style correction**, not new features or change to behavior.
- Same exact **signed seq7** HTML/index (which includes the owner's test profile buttons); unchanged native build 150, no other file path.
- Only CSS added inside the already signed quiet script path `js/owner-quiet-seq5.js`. Functional JS, click handlers, durations, save frequency, checkbox and accessibility labels remain identical to seq7.
- Remove the pale blue wrapper background/border, and paint a smaller **34×34 visual background** centered within each existing **44×44 interactive +/- button**. Numeric textbox retains a centered 37×34 light fill inside its unchanged 44×44 focus area. "دقيقة" remains adjacent, not inside an oversized group. Responsive controls stay within the phone width.
- The GitHub unit test removes the new seq8 CSS section and asserts exact byte-for-byte identity with seq7, and confirms old click performance tests still pass.
- None of the following change: prayer data, Quran content, app/server/website release, Android main APK, administration APK, publisher keys, native DND logic or other menu settings.

## Owner phone instructions
1. Download and extract `aoqat-owner-seq8-signing-files.zip`, moving BOTH files directly to **Download**: `owner-ota-v2-b150-quiet-seq8.py` and `owner-ota-b150-seq8-quiet-ui.js`.
2. Leave your already signed seq7 ZIP in Download: `AOQAT-B150-OWNER-SEQ7-STEPPER-BALANCED-SIGNED-TEST-ONLY.zip`. Never use the unsigned CI review ZIP.
3. Use Termux:
   `python ~/storage/downloads/owner-ota-v2-b150-quiet-seq8.py --owner-stage`
4. Enter the `AOQAT-OTA-V2` password on-device, **not** an APK/ADMIN P12 password. The script checks signer fingerprint, seq7 signature, timestamp, build number, and exact HTML/old JS hashes, and signs only the pinned new JS bytes.
5. It creates `AOQAT-B150-OWNER-SEQ8-STEPPER-VISUAL-SIGNED-TEST-ONLY.zip` in Download. In the **separate** `أوقات الصلاة — تجريبي` app, import that ZIP, restart, and inspect both visuals and unchanged +/- touch behavior. Do not share to users.

## Transferring accepted changes to normal users (NOT DONE)
The owner-only seq4..8 ZIP files **must not be simply posted to the public update folder**. Test-only profile buttons and pilot-only version assumptions are embedded in those cumulative snapshots.

The eventual release candidate must be independently assembled from the real production baseline for each supported Android build. It includes ONLY owner-approved changes, a complete list of all signed override paths required by the snapshot, a new publisher-signed manifest, approved file digests/sequence/expiry and a fixed version/build compatibility gate. Validate APK and offline fallback, application startup confirmation and rollback (rollback covers startup failure, not all delayed functional bugs). Test against real production APK(s), back up relevant settings and obtain the owner's explicit approval of the *exact candidate hash*, before uploading it to the production OTA path. Native service updates or incompatible builds instead require a full APK signed with the stable production APK V2 key. A publisher approval control is a separate release-gate task, not built merely by successful ownerPilot ZIP imports.

**NEVER publish from this branch, modify main or admin, or access the owner's private keys from CI.**
