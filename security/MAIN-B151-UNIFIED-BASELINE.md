# AOQAT unified main baseline — 2.13 / Android build 151

**Status: SOURCE + UNSIGNED APK VERIFIED — NOT YET SIGNED, INSTALLED, OR LIVE.**

This branch is the reviewed source baseline for the next main APK. Its web
content is derived solely from the signed, owner-tested **owner-pilot OTA #22**
at native pilot build 150, pinned revision:

`a4d9b9cb3256031ca7310b82d0b6d73bff6a365e1bd551a441e5b80e06916507`

## Required exact build

- Main Android package: `com.aoqat.calendar`
- Main version: `2.13`; versionCode: `151`
- Approved production-label and privacy splash-ready JS, same 88 source
  assets as pilot with only explicit main-only substitutions
- Exact release APK SHA-256: `0ddb011f6822aaf2e551f5a9103e132cb512285f94b09dcf2d7b731c4d48642f`
- The 88 production web assets in this APK were individually compared with
  the unsigned production OTA manifest: **88 matching, zero different**
- Quran 604 offline page fonts, 366 daily prayer records, original startup
  image, and unchanged persistent data paths
- Main-only native backup document save/share bridge, lock notification
  typography persistence/renderer and existing native signed updater
- Main APK CI test run: https://github.com/mhs1996mhs1996-lab/aoqat/actions/runs/45141897676
- Production OTA security gate rejects unsigned and unrelated signer:
  https://github.com/mhs1996mhs1996-lab/aoqat/actions/runs/45155442009

## Separate production OTA

- Release feed branch: `production-ota`
- URL: `android-updates/production/build-151/manifest.json`
- Publisher key: original owner V2 encrypted production OTA key,
  **NOT** the pilot key or the APK P12.
- Accepted signature: SHA256withECDSA with native V1 canonical manifest domain
  `AOQAT-WEB-UPDATE-SIGNATURE-V1`
- Release workflow: `.github/workflows/main-b151-prod-ota-signed-approval.yml`
- The publisher requires an owner-signed, original-key **public JSON proof**
  with exact 88 approved web files and build 151, sequence 1.
- **No public proof or manifest is published yet.** All production OTA changes
  stay on hold until base B151 APK is signed/installed/accepted on a real phone.

## Separate administration app

- Tested source branch in `aoqat-admin`:
  `feature/admin-production-channel-integration-b151-20261123`
- Package: `iq.hawija.aoqatadmin`, versionCode 30, standalone from AOQAT.
- Reviewed unsigned admin APK SHA-256:
  `75b65377a90ca95e29ba836c338a9804fd609e3cde79e30ac3bfba9d4270f329`
- Administration can inspect **the actual B151 production OTA feed**,
  check installed build compatibility, verify the original publisher signature
  before downloading index/assets, sign manifest locally on Android with the
  encrypted original OTA key, and block mixed pilot signatures.
- Admin CI: https://github.com/mhs1996mhs1996-lab/aoqat-admin/actions/runs/45154195107
- GitHub feed promotion requires the approved signed public manifest to be
  submitted; no unauthenticated client-side publishing is implemented.

## Release hold checklist (mandatory, owner device)

1. Sign the B151 main APK using **the existing main APK certificate P12**.
   Confirm the signed result has the same certificate as the installed
   production APK before updating it in place. Do not uninstall the original.
2. Sign the admin v30 APK using the existing, **separate admin P12**;
   confirm certificate compatibility before updating it in place.
3. Test startup picture, one-time privacy notice, notifications including
   lock fonts, iqama/silent timings, full Quran, backups (create/share/restore)
   and saved settings after a normal update-over install.
4. Only after owner approval: use the original encrypted V2 **production OTA**
   PEM to sign the canonical B151 manifest locally; the publication workflow
   verifies the public proof and **only then** publishes to `production-ota`.
5. For future work, test signed patches on **owner-pilot** first; never copy
   pilot manifests, owner-pilot private keys, native assets or user data into
   the production channel. Transfer the exact reviewed web-only changes and
   re-sign with the original production publisher key after approval.

**Do not treat CI build success as device install success. No user data,
`main`, `owner-pilot-ota` or `aoqat-admin/main` branch has been changed
by the release candidate.**
