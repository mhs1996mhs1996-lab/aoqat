# Android APK signing certificate migration — SECURITY HOLD, NOT deployed

## Previously distributed v2.10 signer

The previously distributed APK certificate SHA-256 recorded in this repository is:
`aa72af7eb8b22501686b77e86f6c0bf1c6a1b61378cf67ca705076282357b496`.

The corresponding old signing keystore was exposed in public repository history.
Deleting the tracked key cannot reverse that exposure. Treat this certificate as
potentially compromised and **do not sign any new general release with it**.

## Owner-generated final V2 APK signing key (14 November 2026)

The owner created a **new** RSA-3072 key locally in Termux, independently from
the ECDSA/P-256 key for partial web updates.

- Private PKCS#12 filename (owner device only): `aoqat-apk-production-v2.p12`
- Key alias: `aoqat-production-v2`
- Distinguished name: `CN=Aoqat Prayer Times, OU=Application, O=Aoqat, L=Hawija, ST=Kirkuk, C=IQ`
- Reviewed **public certificate only**: `security/aoqat-apk-public-v2.crt`.
- SHA-256 X.509 certificate fingerprint independently calculated using OpenSSL
  from the public certificate exported by the owner and matched to the owner's
  local `keytool -list`:
  `9F:98:1C:7E:29:48:85:99:AA:B1:46:DE:4A:AF:6C:F3:05:FE:30:B0:6F:CE:C3:1A:7A:63:45:78:3C:3A:E7:65`
- The certificate is a self-signed X.509 certificate with an RSA-3072 public
  key, signed using SHA256withRSA. Its validity is 2026-11-14 through 2054-04-01
  (UTC). `security/check-signed-updater-trust.py` now rejects a modified
  public certificate fingerprint.
- A **matching certificate is not proof** of secure APK signing or upgrade
  compatibility. Every test APK must separately be inspected with `apksigner`.
- Private key, keystore and password stay with the owner, **not in GitHub or CI**.
- Owner archive: `AOQAT_FINAL_KEYS_V2.7z` (encrypted; stored separately).

**Superseded trial key records:** Earlier security prototypes mentioned the
alias `aoqat-release-2026` and fingerprint
`8BD2356AD3599E1C0443C0E43E9B7E2FECACE86B4E98CAFEF336962BC3DBC54B`.
Those values are **NOT** the owner's final V2 certificate. Never use them to
identify or verify a V2-signed APK.

## Do NOT switch the installed APK signer yet

Simply signing an APK with the owner's new certificate will normally cause
Android to reject an in-place upgrade of existing v2.10 installs.

- Android 9+ (API 28+) supports APK Signature Scheme v3 signing certificate
  rotation with a valid lineage, but lineage creation needs verification of
  the old and new signing material and careful capability choices.
- Android 13+ v3.1 behavior differs from older v3; explicitly test rotation
  min SDK and install-over results rather than assuming it supports Android 9+.
- Android 8/8.1 (API 26–27) cannot depend on v3 lineage. Plan a consent-based
  data export/import migration or other tested user-data-preserving transition.
- Existing v2.10 settings, prayer notifications, exact-alarm permissions,
  storage and offline Mushaf must be preserved or separately recoverable.
- Never instruct users to uninstall as a shortcut.

## Read-only migration certificate audit for a FUTURE signed APK

After the owner signs a test APK **outside GitHub**, an operator can audit its
actual public APK signature identity against Android API 26, 27, 28, 32, 33 and
35 without opening the owner's signing keys:

```sh
python3 security/audit-apk-signatures.py /path/to/owner-signed-candidate.apk \
  --apksigner /path/to/Android/Sdk/build-tools/VERSION/apksigner \
  --original-apk /path/to/previously-installed-v210.apk
```

`--original-apk` is optional, but strongly recommended: inspect an APK that
was actually installed on the target device, not an assumed download.
The audit identifies owner V2, exposed old, unknown or multiple signers and
signature verification failures. **A successful signature check is NOT proof
that `adb install -r` will preserve data or accept the rotation lineage.**
Manual install-over tests with backed-up user data remain mandatory.

For a valid migration trial, record signer fingerprints actually observed
for each platform version. Pay special attention to
`--rotation-min-sdk-version 28` vs the Android 13+ default v3.1 behavior.
Do not infer support for Android 8/8.1 from `apksigner verify`: those OS
versions cannot use v3 lineage to migrate from the old certificate to V2.

Source: https://developer.android.com/tools/apksigner

## Required pre-release checks (no private secrets in CI)

1. Owner confirms the V2 keystore fingerprint again with local `keytool`, and compares each signed APK certificate to `security/aoqat-apk-public-v2.crt`.
2. Evaluate any migration lineage in an isolated, trusted offline environment.
   The formerly exposed legacy signer remains a security risk even if used
   solely to build a lineage.
3. Sign a controlled test APK, inspect the v2/v3/v3.1 signature blocks and
   confirm APK certificate fingerprints using `apksigner`.
4. Test real upgrades on Android API 26, 27, 28, 31, 33 and 35, preserving
   user data; specifically ensure the fallback plan works on Android 8/8.1.
5. Test startup, offline Quran, offline prayer timetable, local settings,
   reminders, notifications and rollback.
6. Obtain owner approval, review and branch-protection verification before any
   production APK release.

Official platform documentation:
- https://developer.android.com/tools/apksigner
- https://source.android.com/docs/security/features/apksigning/v3
- https://source.android.com/docs/security/features/apksigning/v3-1

No V2 APK has been published from this security branch.
