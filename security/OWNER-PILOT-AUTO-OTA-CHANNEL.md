# Owner pilot automatic OTA channel (B150) — not yet published

## What is implemented
- The Android **ownerPilot** APK (`com.aoqat.calendar.ownerpilot`) now checks:
  `https://raw.githubusercontent.com/mhs1996mhs1996-lab/aoqat/owner-pilot-ota/android-updates/owner-pilot/build-150/manifest.json`
  when it starts/returns to foreground, at most once every five minutes.
- The normal app `com.aoqat.calendar` continues checking only its original
  `https://aoqat.vercel.app/android-updates/build-150/manifest.json` endpoint.
  Neither package ID nor native prayer/Quran feature code has been changed.
- The pilot receiver REQUIRES a distinct pilot-only P-256 public key (not the production OTA key), plus a signed JSON `"channel":"owner-pilot"` bound
  to cryptographic domain `AOQAT-WEB-UPDATE-OWNER-PILOT-V1`. A valid owner
  signature for the production domain does **not** grant access to the pilot.
  Production rejects the owner-pilot domain.
- SHA256, expiry, increasing sequence, nativeBuild 150, approved web-only
  index/JS/CSS paths and size limits still apply. Only a verified snapshot
  activates on the NEXT app launch; failure to signal startup-ready reverts to
  the last known good.
- Local ZIP manual import remains as a fallback, for both older V2 owner-signed
  local archives and new pilot-signed archives. It never publishes.

## Important: bootstrap install
The *already installed* owner-pilot APK deliberately returned early in
`WebUpdates.check()` and CANNOT automatically start receiving OTA by merely
publishing a manifest. The owner must **once** sign and update the new pilot
bootstrap APK with the same APK signing certificate as the previously
installed owner-pilot app. Do not uninstall the regular main app.
The new pilot APK is built by an isolated CI workflow, unsigned, for owner
review only. Private P12 is NEVER sent to GitHub or ChatGPT.

## Build a signed pilot OTA — locally on owner's phone
1. Obtain a fully reviewed **candidate ZIP** containing `index.html` and
   every JS/CSS override that should stay active. **Do not omit an older active
   override**; the receiver cannot safely interpret deletions. CI can export
   the initial `AOQAT-OWNER-PILOT-OTA-CANDIDATE-UNSIGNED.zip` for inspection.
2. On the owner's Termux, after reviewing exact candidate SHA256, run:
   ```sh
   python3 owner-pilot-auto-ota-sign.py \
     --candidate ~/storage/downloads/AOQAT-OWNER-PILOT-OTA-CANDIDATE-UNSIGNED.zip \
     --sequence 1 \
     --output ~/storage/downloads/AOQAT-OWNER-PILOT-OTA-SIGNED-seq1.zip
   ```
   This requires the separate **owner-pilot** OTA private PEM and public PEM
   under `~/aoqat-keys/`. The pilot key is unrelated to the APK P12 key and
   the production OTA V2 signing key.
3. Before deployment, verify the signed ZIP's `manifest.json`, file SHA256,
   build, channel, sequence, expiry and original file bytes. A manual
   owner-pilot ZIP test on the actual phone is required, covering startup,
   offline, prayer alarms, iqama, quiet-mode restore, Quran and preferences.
4. After the owner approves **that exact hash**, publish only the public
   ZIP's contents (not the ZIP wrapper) to the public GitHub `owner-pilot-ota`
   *feed branch*, never to `main` or the Vercel production site, at:
   ```text
   android-updates/owner-pilot/build-150/manifest.json
   android-updates/owner-pilot/build-150/files/index.html
   android-updates/owner-pilot/build-150/files/js/...
   ```
   Never publish at `android-updates/build-150`, which is the normal app's
   production path. This branch does not have a deployment workflow.
5. Open and close/reopen the pilot APK with internet access; it downloads
   only the approved changed JS/CSS bytes plus the small manifest and reuses
   matching cached/packaged files. Reopen again to activate; verify offline.
   If a later startup crashes, the next launch quarantines that snapshot.

## Holds
- No production, Vercel, GitHub Release or public APK publish action.
- Once the dedicated GitHub environment `owner-pilot-publish` holds the
  separate `AOQAT_PILOT_OTA_SIGNING_PEM` secret, an explicit owner command
  can update `security/owner-pilot-ota-request.json` to trigger the
  source-pinned, tested, fully signed feed publication workflow. Each request
  changes one file and selects the next sequence; no manual download required.
- Until that secret and one-time bootstrap APK installation are complete,
  automatic delivery is NOT active. The workflow refuses to publish unsigned
  or wrong-key updates. The protected feed is visible only to pilot apps.
- A GitHub success alone is not phone acceptance; owner must approve.
- If no signed pilot manifest is deployed, the app continues working offline
  as normal and the automatic check simply fails safely.
- Native Android, prayer database, and Quran asset changes require a separately
  signed APK and are not in the partial OTA allowlist.
- Any future Google Play build of the real app must retain
  `com.aoqat.calendar` and compatible official APK signing continuity.
