# Publisher key custody for build 146 (isolated security trial)

The **partial-update signing key** is separate from Android's APK signing certificate.

## Owner-controlled V2 update key (14 November 2026)

- Public key: `security/aoqat-update-public-v2.pem` (safe to distribute).
- Algorithm: ECDSA P-256 / `SHA256withECDSA`.
- Public key SHA-256 fingerprint (DER SubjectPublicKeyInfo): `8f6f63bd3074209fa3b375adc455ecc5eeed96abca9e4a52144b49ddd8d7737d`.
- Same public key is pinned as Base64 DER SPKI in `WebUpdates.SIGNING_PUBLIC_KEY_B64`.
- `security/check-signed-updater-trust.py` fails if the PEM, embedded Kotlin key or reviewed SHA-256 fingerprint differ.
- The owner generated `aoqat-update-private-v2.pem` locally using OpenSSL, encrypted at rest with `-aes-256-cbc`. **Do not assume or advertise a specific PBKDF iteration count** without inspecting the owner's actual encrypted key.
- Owner also generated a separate RSA-3072 Android signer `aoqat-apk-production-v2.p12` with a distinct passphrase. It is **not** part of the signed partial-update verification key.
- The owner maintains the encrypted archive `AOQAT_FINAL_KEYS_V2.7z` separately. That archive and both private keys are **not stored in this repository**.

**Never commit or send to GitHub, Vercel, CI logs, or chat:** either private-key file, the PKCS#12 keystore, their passwords, or the backup archive.
Only the public PEM may be uploaded to this repository.
Keep independently verified offline backups, and keep passphrases separate.

## Signed partial-update release gate

- Build 146 is an **unpublished trial**, not an update to already-installed 2.10 APKs.
- A manifest needs `nativeBuild=146`, monotonically increasing `sequence`, a future `expiresAt`, canonical `revision`, file hashes, and a verified ECDSA signature from the owner's matching V2 private key.
- `security/signed-update-manifest.py sign` accepts an owner-local encrypted private key via `--private-key`, the public PEM via `--public-key`, and `AOQAT_UPDATE_KEY_PASSPHRASE` in its **local process environment** (never as a repository secret or in public logs).
- Unsigned, altered, wrong-publisher, expired and replayed manifests must fail closed. Updating the public-key pin is a reviewed **APK change**, not a server-side override.
- Pinning V2 invalidates signatures from the former test publisher key intentionally. No signed OTA is deployed to users by this commit.
- Do not merge or publish the trial until CI, device testing, branch protections and release approval are complete.

## Independent APK signing incident and migration

The previous APK debug signing keystore was exposed in public repository history.
Deleting it from this branch cannot erase historical copies or make it trustworthy again.

The owner's new Android APK signer (V2) is different from the OTA key. It must
**not** silently replace the signer for already installed versions.
Test Android signing-lineage migration on Android 9+, and design a safe migration
for Android 8/8.1, which cannot rely on APK Signature Scheme v3 lineage.
Preserve user data. Do not instruct an uninstall as a shortcut.
Branch protections, required reviewers and an owner-approved production release
remain mandatory.
