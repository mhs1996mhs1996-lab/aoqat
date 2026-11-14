# Publisher key custody for build 146 (security trial)

The **update signing key** is different from Android's APK signing certificate.

- Algorithm: ECDSA P-256 / SHA256withECDSA
- Public key SHA-256 (DER SPKI): `4f1b6cbdc46bc70647d3947a98e742f87037e6bcb80fc7f5846060b4896d9069`
- Public key is embedded in `WebUpdates.SIGNING_PUBLIC_KEY_B64`.
- Private key: **AES-256-CBC encrypted PKCS#8, 300,000 PBKDF iterations**.
- Private key and passphrase **MUST NOT** be committed to GitHub, uploaded to Vercel,
  placed in Android assets, or sent to CI logs.
- The encrypted private key and passphrase are furnished separately to the owner,
  who must save both offline to durable secure storage.
- A release cannot be published until a signed manifest exists with:
  `nativeBuild=146`, strictly increasing `sequence`, future
  `expiresAt`, correct canonical `revision`, and the matching `signature`.
  The updater must reject all unsigned manifests and stale/replayed revisions.
- For local signing, `security/signed-update-manifest.py sign` accepts
  `AOQAT_UPDATE_KEY_PASSPHRASE` in its environment for encrypted private keys.
- A future key change requires a separate explicitly reviewed app update and
  handover procedure; never automatically accept a server-provided public key.

## Independent APK signing incident

The old APK debug signing keystore appeared in this repository in public form.
It is **compromised by exposure**, irrespective of whether anyone used it.
The security branch deletes the tracked copy and hard-coded password, but cannot
erase Git history, clones, or already-distributed APKs.

Do not sign new public releases with that key. The new *update* ECDSA key does
**not** repair the old APK signing trust chain. Android certificate migration
must be tested across supported Android API versions; Android 8 devices cannot
rely on APK Signature Scheme v3 lineage like newer versions. Avoid instructing
users to uninstall; preserve their app data during any safe migration.

The owner must enable branch rules, required reviews and environment
protections before this security branch is considered deployable.
