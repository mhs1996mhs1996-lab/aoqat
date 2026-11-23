# AOQAT production OTA — separate signed channel

**Status: SAFE HOLD — NO MANIFEST OR RELEASE PUBLISHED YET.**

This branch hosts **only owner-approved, separately signed production web updates** for
the stable package `com.aoqat.calendar`, starting with native build 151.
The receiver for build 151 reads
`android-updates/production/build-151/manifest.json` and accepts **only** ECDSA P-256
signatures under the legacy production cryptographic domain
`AOQAT-WEB-UPDATE-SIGNATURE-V1` (no `channel` field) with the trusted V2
production public key SHA-256
`8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d`.

The **owner-pilot** private key cannot sign this production channel. The
production owner's encrypted V2 OTA private PEM must remain **off GitHub and out
of this branch**, and must be used only on the owner's trusted signing device.
APK release certificate P12 is a different secret and must not be used here.

Publishing protocol:
1. Freeze and review exact pilot-tested web-only payload and base APK version.
2. Verify every index/JS/CSS byte, nativeBuild=151, strictly increasing sequence,
   expiry, SHA-256 and canonical manifest revision.
3. Sign offline with the owner V2 production OTA key, verify against pinned public key.
4. Obtain explicit owner approval of the **same exact signed manifest digest**
   after real-device startup, offline, alarms, iqama/quiet, Quran and saved-state tests.
5. Upload only the approved signed manifest and complete permitted web snapshot
   to this branch, never application data, prayer source, native files or Quran resources.
6. Verify published bytes. On any failure **STOP**; no unapproved auto-promotion.

**Nothing in this file authorizes deployment.** The channel does not exist for users
until a V2-signed B151 base APK has been accepted on the owner's phone. A missing
manifest is a safe no-update condition.
