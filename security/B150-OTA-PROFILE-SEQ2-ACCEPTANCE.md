# AOQAT 2.12 / B150 — signed OTA V2 sequence 2, profile visual proof

The owner requested a visible icon **«الملف الشخصي»** at the **bottom of the main Settings drawer**, after **«تواصل معنا عبر واتساب»**, to verify that an actual signed OTA update was activated. This is a test tile, not a real account/profile feature.

## Exact scope
- Entire hosted website and the installed B150 APK must remain byte-for-byte unchanged.
- The single OTA file `index.html` gets one appended inline script, after the original app bundle and existing scripts, before the closing `</body>`. No other JS/CSS files, Quran fonts, religious text, prayer times, alarms, widgets, storage or native code changed.
- The script waits for the actual main drawer to exist, appends one `web-drawer-row` with the standard theme's own icon/text classes, icon 👤, label «الملف الشخصي». It never deletes/reorders existing rows.
- Clicking the row uses the existing `AoqatWebSettingsNavigation.sub` API to show a short test-only confirmation with the existing back arrow and states B150 / OTA seq2. It collects/sends no personal data.
- Original verified `index.html` SHA256: `e9a045f8acf0fd6f66bfa6bbdd36dfb3a014a6474d700d840186f7fba682be1f`.
- Candidate modified `index.html` SHA256: `86f2e701ba65a0cf2e0dcebe862ea15d77b64bfe08748136511798463936f75a`.

## Owner-only cryptographic stage
Use reviewed public `security/owner-ota-v2-build150-profile-seq2.py` on Termux. `--self-test` uses disposable keys, then `--owner-stage` **offline** extracts the exact owner-signed B150 APK, verifies its original SHA and V2 APK cert, applies ONLY the exact reviewed index UI injection, insists the resulting hash matches the pinned profile SHA, signs manifest `nativeBuild=150`, `sequence=2` using the **separate encrypted OTA V2 PEM** stored only on the owner's phone, and independently verifies both file hash and signature.

Expected public output: `AOQAT-150-OTA-V2-PROFILE-REVIEW-seq2.zip`. **Do not upload the private PEM or any password**. This zip has ONLY `android-updates/build-150/manifest.json` and `android-updates/build-150/files/index.html`.

## Go/no-go
1. CI owner-only review passes, including no-source-changes and exact packaged-page comparison.
2. The owner signs locally and supplies ONLY the public ZIP; independent review verifies SHA/signature, expiry, and sequence 2 with prior sequence 1.
3. Only with explicit owner approval, publish the two files to `android-updates/build-150/`, replacing the previously approved sequence-1 manifest and exact path only. No merge of experimental app code, no public web UI changes, no unreviewed files.
4. Verify HTTP 200 exact signed bytes from Vercel, then test on the owner's two B150 phones after opening, allowing update check, and restarting; «الملف الشخصي» must appear **last** after WhatsApp. The UI is a visual indication of activation, not independent proof of anti-replay/rollback.
5. Check next launch/offline Quran/prayer times/settings/adhan/widgets remain functional. Restore seq1 only if professionally signed with a NEW sequence (cannot replay an older seq1 manifest); the old APK packaged page remains the offline fallback if no active signed update.

**Status: unsigned candidate and CI only. No profile update has yet been signed by the owner or deployed.**
