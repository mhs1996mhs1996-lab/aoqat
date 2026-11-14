# AOQAT V2 first trusted signer: beta tester clean-install plan

## Scope of this decision

On 2026-11-14 the owner clarified that existing APK recipients are **few,
informed testers** of an **unfinished application**, not a broad public
production rollout. For this limited cohort, the owner accepts preparing a
**clean-install test release**, rather than investing in compatibility with
the previously exposed 2.10 signing certificate.

This is **not** a promise that any existing user data can be transferred.
It does not authorize publishing an APK before it is ready.

## Release strategy for this beta cohort

1. Leave current testers' APK unchanged until the **new candidate** has passed
   app-functional, offline, security and owner-private signing checks.
2. Sign the fresh beta candidate with the **owner's final V2 RSA-3072 signer**
   `aoqat-apk-production-v2.p12` using an owner-controlled local environment,
   never an uploaded GitHub secret or the compromised old keystore.
3. Independently confirm the signed APK certificate matches
   `security/aoqat-apk-public-v2.crt` (SHA-256
   `9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765`).
4. Explain **before uninstalling** that Android will generally delete the
   existing app's internal settings and local data (theme, notification
   preferences, custom adhan audio, Quran reading position, calendar
   customizations and any other app-private state). External files may survive,
   but their survival is not guaranteed. Android backup may omit adhan state.
   Testers must explicitly accept this loss or independently preserve relevant
   customizations; if they need data retention, stop and plan an export workflow.
5. Testers **uninstall the old test APK only after** the new APK has passed
   checks and its download has been independently verified. They then install
   the new **V2 signed beta APK**.
6. On first launch, grant the required Android permissions again and manually
   reconfigure adhan, prayer alerts, quiet mode, notification/lock-screen
   settings, prayer timetable preferences and Quran bookmarks as appropriate.
   Verify the Qur'an, Hawija prayer data and sound work *offline*.
7. All subsequent in-place APK updates must be **signed using this exact V2
   APK signing identity**, with increasing versionCode, compatible packageId
   and independently verified signature. A new keystore/alias would reintroduce
   the problem.
8. Separately test the **V2-signed partial-update path**, after the V2 base
   APK is installed. The partial-update signing key is the distinct owner-held
   ECDSA P-256 key, not the APK PKCS12 key.

## What this decision removes, and does not remove

- **No longer a blocker for the limited informed beta cohort:** Android 8/8.1
  legacy->new APK in-place signature rotation, legacy-private-key lineage,
  and fully automatic preservation of old trial data. The testers are not
  promised a migration.
- **Still required:** a fully functional V2 APK, offline Mushaf and prayer
  data integrity, native notifications/quiet-mode checks, signing verification,
  protection of owner secrets, manual device tests, and **explicit owner
  acceptance of the actual beta candidate before distribution**.
- **For any later broad public release:** establish a distinct reviewed release
  process, clear user-data policy, versioning, quality checks, access controls,
  and approval. Do not call this beta transition a transparent upgrade.

## Short instruction for beta testers (Iraqi Arabic)

> هذا إصدار تجريبي جديد من تطبيق أوقات الصلاة في الحويجة وما زال قيد الفحص.
> بسبب تغيير شهادة الحماية، لازم تحذف النسخة التجريبية القديمة قبل تثبيت
> الجديدة. **انتبِه:** الحذف راح يمسح إعدادات التطبيق والبيانات المحفوظة داخله،
> ومنها بعض التخصيصات وصوت الأذان الخاص إذا أضفته من جهازك.
> سجّل إعداداتك المهمة قبل الحذف، ولا تحذف النسخة القديمة إلا بعد ما
> نستلم ونتأكد من ملف الإصدار التجريبي الجديد. بعد التثبيت راح تحتاج
> تفعّل الأذونات والإشعارات وتضبط اختياراتك من جديد.

## Owner-only read-only certificate gate (after signing, before asking testers to uninstall)

An owner-signed V2 APK must pass the **clean-install** certificate audit with
Android SDK Build-Tools `apksigner` available locally:

```sh
python3 security/audit-apk-signatures.py --clean-install-beta \
  --apksigner apksigner /safe/path/to/owner-v2-signed.apk
```

This checks the **actual APK bytes**, for Android 8 (API 26), 8.1 (27),
9 (28), 12L-era (32), 13 (33), 15 (35) and 16 (36), and **only** accepts the
approved owner V2 certificate fingerprint
`9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765`.
Missing, old, mixed or unknown signers are rejected.

The original audit mode (without `--clean-install-beta`) intentionally rejects
legacy-to-new **in-place migration** for Android 8/8.1; do not use that mode
to judge the owner-approved clean reinstall. Do not combine
`--clean-install-beta` with `--original-apk`.

A PASS certifies the *signing identity only*, not app functionality or release
readiness. Test offline content, alarms, access permissions and the first run
on real devices and obtain owner approval **before** sending any installer.
Never send the private PKCS12, its password or the update-signing PEM to CI,
GitHub, Vercel or chat.

## Status

This file records a scoped migration decision, **not an APK release**.
The security branch remains a draft. Private PKCS12 and private update PEM
stay on the owner's Termux device. No secret credentials may be copied
into GitHub, Vercel, logs, chat or CI.
