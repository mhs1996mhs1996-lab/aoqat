# Owner review: AOQAT APK 2.12 (build 150) — empty profile page, OTA sequence 3

## Approved UI change

The **main Settings list** must retain its last item `👤 الملف الشخصي`, immediately after WhatsApp. When that item is opened, retain the page title `الملف الشخصي` and existing return button, but **remove the previously published experiment description**. The interior is empty, reserved for buttons the owner may choose to add in a later version. Do not create accounts, forms, storage keys or buttons yet.

This is an OTA **index.html-only** patch; the already-installed B150 APK and original hosted web site stay unchanged. Preserve all existing Quran, prayer times, iqama counters, alerts, calendars, settings and layouts.

Source: public owner-approved signed seq2 ZIP `AOQAT-150-OTA-V2-PROFILE-REVIEW-seq2.zip`, already on the owner's phone. Verified ZIP SHA256:

`1ffa80b24840eae399f3c0b432238fddcd5bb714d1290385bfcbc4c75f0429b7`

- Signed seq2 manifest SHA256: `89902ded97e8777b0517a1128e8f32067a3cf212437d245f230354e4436a0233`
- Signed seq2 index SHA256: `86f2e701ba65a0cf2e0dcebe862ea15d77b64bfe08748136511798463936f75a`
- **Unsigned new seq3 index SHA256**: `9cc9ba4313ad9df1ece2142b1a19dafb5bb81591483b3d0aa51b077351e65658`

CI reconstructs the candidate by **deleting only the five exact JS lines that create the test heading and paragraph**. Everything before/after, including last-row placement, click action and existing back navigation, is byte-identical to the signed seq2 page.

## Signing and release

Use `security/owner-ota-v2-build150-profile-empty-seq3.py`, locally on Termux. The owner must first verify the helper's SHA256 against the independently reviewed GitHub commit, with network off at signing time.

- `--self-test` uses ONLY temporary test P-256 keys and checks data/signature tamper rejection.
- `--owner-stage` reads and independently authenticates the old owner seq2 ZIP, removes exactly the approved text, verifies the new index hash, and prompts for the **OTA V2 private PEM** passphrase in Termux. No private PEM, password or APK PKCS#12 gets uploaded.
- The public output file is `AOQAT-150-OTA-V2-PROFILE-EMPTY-REVIEW-seq3.zip`, containing exactly the manifest and updated index under `android-updates/build-150/` and targeting `nativeBuild=150`, `sequence=3`.
- Verify this public ZIP independently again after the owner uploads it. Do **not** publish an unsigned candidate, reuse the signature for seq2, or bypass anti-replay.
- Only after that review, replace the two existing public OTA files in `main`, and verify production Vercel serves the exact signed seq3 manifest and index. No changing other project files.
- Run on-phone check with and without internet. The profile item should remain last, its page should have no body text, and all other features remain unchanged.

**Status:** candidate code only until owner signs seq3. No live OTA sequence 3 has been published.
