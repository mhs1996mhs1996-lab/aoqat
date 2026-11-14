# Android APK signing certificate migration — not deployed

Existing installed v2.10 signed certificate SHA-256:
`aa72af7eb8b22501686b77e86f6c0bf1c6a1b61378cf67ca705076282357b496`.

A NEW private APK signing key, stored OFF GITHUB as password-protected PKCS#12,
has been prepared for the owner:
- Alias: `aoqat-release-2026`
- Key algorithm: RSA 3072
- New certificate SHA-256:
  `8BD2356AD3599E1C0443C0E43E9B7E2FECACE86B4E98CAFEF336962BC3DBC54B`
- Its private key and passphrase are supplied in **separate protected files**.
- The new APK signing private key is **NOT** the update-OTA ECDSA key.

## Do NOT replace the existing v2.10 APK signer in production yet

The old APK signer was in public Git history; treat as compromised. A new
certificate alone will not be accepted as an in-place update by all devices.

On Android 9+ (API 28+) Android supports certificate lineage / APK Signature
Scheme v3 key rotation. Default v3.1 behavior targets Android 13+ unless
rotation minSdk is explicitly set. Validate `apksigner rotate` lineage, its
capability grants, and real install-over with an actual phone for each relevant
Android API tier.

**Android 8 / 8.1 (API 26–27)** lack native v3 signing rotation. A changed
signer normally cannot update the existing installed package directly.
Do NOT tell these users to uninstall without backing up and verifying their
settings and prayer data export/import. Alternatively maintain a legacy signer
for existing versions during an explicit transition; because that signer is
publicly exposed this remains a SECURITY EXCEPTION, not a fix.

## Required staged tests

1. Produce new encrypted key and store it only with the app owner.
2. Produce test signing lineage using the old and new signers **in temporary
   isolated signing environment**, never adding private keys to Git.
3. Sign a test APK with appropriate v2/v3/v3.1 blocks.
4. `apksigner verify --verbose --print-certs --min-sdk-version 26` and
   targeted checks against API 26, 28, 31, 33, 35.
5. On real devices, test installation OVER signed 2.10 with localStorage,
   notifications, exact alarms, countdowns and Mushaf intact; never first
   uninstall during the upgrade test.
6. Approve production signing migration only after release review and backups.

Official Android references:
- https://developer.android.com/tools/apksigner
- https://source.android.com/docs/security/features/apksigning/v3
- https://source.android.com/docs/security/features/apksigning/v3-1

No final APK has been released by this security branch.
