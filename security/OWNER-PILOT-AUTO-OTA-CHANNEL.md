# Owner-pilot automatic OTA channel (B150) — seq4 successfully published

## SUCCESSFUL OTA7 — PERMANENT SIGNING/RELEASE PLAYBOOK (2026-11-21)

**Status verified**: existing `owner-pilot-ota` channel, nativeBuild **150**, sequence **7**, fully signed, 88 files. GitHub Actions successful release [run 44880288303](https://github.com/mhs1996mhs1996-lab/aoqat/actions/runs/44880288303). Public signed manifest source commit `444c941ac37399f9f6835479e2779acb0c9eae31` on `feature/owner-pilot-lockscreen-phases-20261121`. This release was produced without a GitHub private signing secret, without an APK rebuild, and without production/admin writes.

**DO NOT LOSE THIS REFERENCE — ORIGINAL KEY LOCATION CONFIRMED**:
- The actual original owner-pilot signing private key is retained in the **owner's private ChatGPT personal File Library at the root path `/aoqat-pilot-ota-private.pem`**, exact filename `aoqat-pilot-ota-private.pem` (227 bytes as of this check). It is NOT the different production V2 OTA key, APK P12, or another similarly named PEM. This exact existing key was recovered and successfully used for OTA7.
- CRITICAL FILE DISCOVERY TIP: the private-key file has `model_generated=true`. **`files.search` missed it, and `files.list(include_generated=false)` hid it.** To find it again, iterate **`files.list(surface="library", recursive=true, include_generated=true, sort="name")`** through every cursor and find the **exact** filename. It existed in the root of the owner's Library; do not conclude it is missing from a filtered search or from a different Google Drive account. Use the returned authorized `file_id` in `files.materialize` to make a transient local copy for signing; do not hard-code an opaque file ID in the repository.
- The only acceptable pinned **public SPKI SHA-256 fingerprint** is `a0acf8f0464bad18392073c47166937e68f72b732efa3e1299331d0bc43307ea`. Validate this by deriving the SPKI public key from the original PEM before any sign/publish. Use `security/owner-pilot-auto-ota-sign.py`, which already validates this pinned fingerprint and verifies the generated ECDSA signature. **Never regenerate or replace the key.**
- The private PEM remains **only in the user's private file Library** (and transient signing workspace if needed). NEVER put it, a password, or any private key data into this GitHub repo, a commit, artifact, workflow log, Vercel, chat response, or signed public manifest. Do not duplicate unencrypted copies into publicly accessible storage. The path/filename and public fingerprint recorded here are identifiers, not the private key itself.

**Repeat the EXACT successful delivery process for OTA8 onward**:
1. Verify `owner-pilot-ota/android-updates/owner-pilot/build-150/manifest.json` current sequence; use **current sequence + 1**. Inspect APK-integrated web assets and ensure all previously published override paths remain present; scope changes tightly to owner-approved code and protect all other assets.
2. Build a complete 88-path (or current exact path set) **unsigned** OTA candidate ZIP via the approved isolated candidate workflow and Gradle `:app:syncWebAssets`; verify hashes against the last published manifest.
3. Recover **the same private Library PEM** using the procedure above and verify the pinned public fingerprint. Sign locally using `security/owner-pilot-auto-ota-sign.py` (or its verified `sign_candidate()` function) with the correct next sequence; verify all hashes and the ECDSA signature. Private key never leaves secure local signing context.
4. Commit **only the public already-signed `manifest.json`** to a new sequence-specific isolated source branch and trigger a **presigned** publication workflow patterned on `.github/workflows/owner-pilot-backup-presigned-seq7-publish.yml` and `security/owner-pilot-backup-seq7-verify-presigned.py`. This existing workflow is sequence-7-specific: adjust monotonic sequence checks and allowlist for the NEXT release rather than rerunning 7.
5. CI rebuilds exact APK web bytes, checks original pinned public key / ECDSA signature, hashes and scope, and pushes **only approved changed web asset files and signed manifest** to `owner-pilot-ota`. After CI success, read back the LIVE feed sequence; only then report published. The installed ownerPilot APK checks on launch/resume and periodically while foreground, activates downloaded web OTA on a subsequent launch.
6. **NEVER use the failed secret-based auto-sign variant** `.github/workflows/owner-pilot-backup-auto-seq7-publish.yml` (removed) or `AOQAT_PILOT_OTA_SIGNING_PEM` GitHub environment secret requirement. That variant failed and was reverted. Do not claim automatic receipt by the owner's handset without an on-device confirmation; verified feed publication only proves the server release.
7. Do not touch `main`, normal APK/production channel, Vercel, `aoqat-admin`, Android signing certificates, or unrelated functionality. Native changes still need a signed APK; this OTA only ships web resources.

---



## Proven release method: PRE-SIGNED OTA (keep this for future owner-pilot updates)
**User-approved operating rule:** the owner-pilot Android test APK receives OTA automatically for QA. Do not change the receiver, channel, APK package ID, signing keys, main/production or admin project merely to send a web UI change. Ship to the owner-pilot channel first; promote to the main app only after the owner approves the tested changes.

Successful reference release: **sequence 4**, commit `cfb39491e4c2cc1bc28a894a8b6b2ba4dabba832` on `owner-pilot-ota`, GitHub Actions run [44802311395](https://github.com/mhs1996mhs1996-lab/aoqat/actions/runs/44802311395). The feed advanced from sequence 3 to 4 with **only** the signed manifest, `files/js/web-menu-order.js`, and `files/js/apk-startup-bundle.js` changing. The other 86 APK web assets are unchanged.

For the next owner-requested test update:
1. Make **only** the owner-requested source edits on an isolated branch. Review the diff against the current published owner-pilot feed. Maintain exact APK-specific integrated web bytes via `gradle -p android-native --no-daemon :app:syncWebAssets`. Never substitute Vercel's web HTML for the APK-specific HTML.
2. Export a complete **unsigned signing candidate** with every currently active APK `index.html`, `js/*.js`, `css/*.css` file, not merely the changed files. Example CI workflow used for seq4: `.github/workflows/owner-pilot-seq4-presigned-candidate.yml` (run [44797303794](https://github.com/mhs1996mhs1996-lab/aoqat/actions/runs/44797303794)). Assert prior active paths are preserved, the only changed file hashes are explicitly approved, and no native, prayer data, Quran content or other user settings changed.
3. **Sign locally/securely with the EXISTING pilot-only private P-256 key** matching the public certificate pinned inside the installed pilot APK; verify key fingerprint `a0acf8f0464bad18392073c47166937e68f72b732efa3e1299331d0bc43307ea`. The private key was recovered from the owner's private file library during seq4; for later updates request access to that existing private file through the authorized file tool, *not* a new key and *not* Termux or a user upload unless necessary. NEVER commit the private key, password or a generated new key. Sign with `security/owner-pilot-auto-ota-sign.py` using the **next** monotonic sequence and the candidate ZIP.
4. Commit **only the public signed manifest** to the isolated pilot source branch and trigger a pre-signed publish workflow like `.github/workflows/owner-pilot-presigned-seq4-publish.yml`, adapting its sequence guards and previous-sequence checks for the next release. Rebuild exact assets in CI; validate signature against the **already pinned** pilot public key, `nativeBuild=150`, `channel=owner-pilot`, full file hashes and expiry. No GitHub signing secret is required with this proven method. Failed validation must block publication.
5. Publish **only** `android-updates/owner-pilot/build-150/manifest.json` and the approved changed `files/...` paths into the **existing `owner-pilot-ota` feed branch**, leaving unchanged assets byte-for-byte identical. Confirm the live raw GitHub manifest advanced to the next sequence and public signature/hash checks succeed. No push to `main`, no production Vercel release, no APK rebuild/install for a web-only change.
6. The installed `com.aoqat.calendar.ownerpilot` APK automatically checks this feed on open/resume and while foreground (up to once every five minutes). The verified update activates on the next app launch. This is **not** silent APK replacement; native changes require separate signed APK handling. Owner tests the pilot and explicitly approves before promotion to production.

The older instructions below describe earlier/bootstrap alternatives. **Do not fall back to the newer secret-based GitHub auto-sign path** unless the owner explicitly asks to change release architecture. The approved, proven approach is **prepare candidate → sign with existing pilot key → public signed manifest → pinned-key CI validation → publish isolated feed → automatic pilot reception**.

---



## Automatic updates on explicit owner request
- The owner says "حدّث التجريبية OTA". The maintainer reviews code/tests and
  updates **only** `security/owner-pilot-ota-request.json` on
  `feature/owner-pilot-auto-ota-bootstrap-20261120`. The request pins its
  parent source commit, native build 150 and next monotonically increasing
  sequence.
- GitHub Actions `.github/workflows/owner-pilot-ota-on-request.yml` verifies
  this isolated release request, sacred-content and privacy policy checks;
  signs a **complete snapshot** of the approved `index.html` + all safe
  `js/*.js`, `css/*.css` with a **separate pilot-only P-256 key** stored
  as the environment secret `AOQAT_PILOT_OTA_SIGNING_PEM` under the
  `owner-pilot-publish` environment. No signatures are bypassed and no key
  is uploaded or typed on each update.
- The workflow pushes ONLY verified, signed public bytes into the
  `owner-pilot-ota` GitHub branch. The ownerPilot APK fetches them from
  `raw.githubusercontent.com`. **Neither `main` nor Vercel production is
  changed**. This is an explicit requested publish, not every source push.
- A fresh update is checked when the pilot app opens/resumes with network
  access, and every five minutes while **the pilot app remains in the foreground**.
  The download is staged and activated **on the next launch**. No real-time
  push to a closed phone or silent APK upgrades.
- **One-time setup required**: owner installs the reviewed/signed pilot
  bootstrap APK once; in GitHub repository Settings → Environments creates
  `owner-pilot-publish`, restricts it to this trusted pilot branch, adds
  the **separate pilot** PEM in secret `AOQAT_PILOT_OTA_SIGNING_PEM`, and
  enables GitHub Actions `GITHUB_TOKEN` write permission for the isolated
  feed branch. This key has no permission to sign production updates.
  Do not use the normal APK P12 or production V2 OTA private PEM.
- This workflow does not auto-deploy until bootstrap, environment secret,
  and real-device QA pass. Do not run a release request earlier.


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
- New `web_updates_v3_owner_pilot` preferences and `web-updates-v3-owner-pilot`
  storage prevent an older owner QA update (such as signed sequence 4) from
  blocking fresh pilot sequence 1. Existing prayer settings/data and the
  previous test's snapshot are NOT deleted; the old V2 test snapshot is simply
  never trusted in the new dedicated pilot channel.
- SHA256, expiry, increasing sequence, nativeBuild 150, approved web-only
  index/JS/CSS paths and size limits still apply. Only a verified snapshot
  activates on the NEXT app launch; failure to signal startup-ready reverts to
  the last known good.
- Local ZIP manual import remains as a fallback for ZIPs signed by the
  **separate pilot key**. Older ZIPs signed by the production V2 key are
  deliberately incompatible with the new pilot bootstrap. It never publishes.

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
  or wrong-key updates. The feed branch is publicly readable (no secrets or
  private user data are stored there); only the ownerPilot APK can **accept**
  its pinned, signed manifests. This is not an access-controlled private feed.
- A GitHub success alone is not phone acceptance; owner must approve.
- If no signed pilot manifest is deployed, the app continues working offline
  as normal and the automatic check simply fails safely.
- Native Android, prayer database, and Quran asset changes require a separately
  signed APK and are not in the partial OTA allowlist.
- Any future Google Play build of the real app must retain
  `com.aoqat.calendar` and compatible official APK signing continuity.
