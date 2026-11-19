# Owner-gated OTA pilot — staged implementation (B150)

This is a READ-ONLY comparison gate added to the signed build-150 development line. It is **not** a publish workflow or a completed phone-test feature.

## Safe order
1. Prepare a **complete** candidate OTA snapshot under `manifest.json` plus `files/`, signed **offline** with the existing V2 owner OTA private key (never commit private keys).
2. Compare it against the last installed/approved, owner-signed production snapshot using:
   `python3 security/owner-ota-preflight.py --build 150 --baseline previous.zip --candidate proposed.zip --report owner-review.json`.
3. Inspect the report: changed files are classified as `add`, `modify`, and `delete`; only allowlisted `index.html`, `js/*.js`, `css/*.css` qualify for partial OTA. The scanner validates pinned ECDSA publisher key, native build, strictly increasing sequence, expiry, all SHA-256 checksums and exact package contents.
4. **Deletion is BLOCKED for OTA**, because an omitted override could fall back to the old APK copy; deletions require a separately tested new full APK. Updates to prayer data, Quran assets, native code, alarms and package permissions likewise require the appropriate reviewed APK.
5. A passing comparison is only `READY_FOR_OWNER_PHONE_TEST` — it is never approval, a phone test, or permission to publish.
6. Test the *exact same SHA-256 candidate* on the owner's real phone via a separately provisioned pilot route; obtain a human acceptance result for startup, Fajr/all prayers, iqama, silent/DND restore, lockscreen, Quran, navigation, offline use and retained settings.
7. After successful owner testing, generate a separately reviewed, auditable approval tied to the exact signed manifest SHA256 and content hashes. Publish **only** approved unchanged bytes using a protected deployment workflow with verified identity and no auto-deploy path.
8. Keep a stop-publishing switch, compatible last-known-good rollback and live status check. Native updater may roll back a startup crash, but cannot prove alarms work hours later.

## Current non-goals
No GitHub action publishes, no Vercel or Supabase changes, no APK build, no user data, no automatic installation to the owner's phone, no production switch. The user must not interpret green CI checks as real-device acceptance.

## Trust boundaries
- `aoqat` source and official OTA channel remain unchanged by this review-only branch.
- `aoqat-admin` is separate; access to it does not confer permission to change the user-facing app.
- Public verification key can be in repository; private signing PEM/P12 stays on owner's phone.
- Do not place a candidate under `android-updates/build-150` on a production-connected branch before phone testing and explicit owner approval.
