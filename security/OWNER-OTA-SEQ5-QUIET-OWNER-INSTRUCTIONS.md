# OTA V2 B150 — owner-only experimental seq5: quiet controls

## Scope and trust boundary
This update is **for the separate owner-pilot app only**, not the normal prayer app, website, admin repository or remote OTA publication path. It uses the approved existing Android build **150** and the owner's own OTA V2 signing key. No APK replacement, no native code modification, no scheduled user rollout.

The **owner already installed and opened signed seq4**, confirming the new three buttons in the profile screen. Seq5 retains that full, byte-for-byte checked signed seq4 index and adds only:

1. An extra `<script src="js/owner-quiet-seq5.js"></script>` immediately after all original packaged JS and the seq4 profile script, as a scoped override.
2. The `js/owner-quiet-seq5.js` file, strictly copied from reviewed quick-quiet code with one essential OTA detail: bind the existing Android `quietPanel` instead of returning early, replace the old CSS and re-render one time. Subsequent checkbox and +/- clicks update ONLY their own elements.

No changed Quran text/fonts, prayer data, dates, adhan scheduling/native ringtone engine, notification permissions, settings menu order or profile button internals. Both JS and index are hashed and **pinned** in the signer. The signing manifest explicitly lists only `index.html` and `js/owner-quiet-seq5.js`. On import, native code verifies ECDSA + SHA256, sequence **5**, exact build 150 and expiry, and its existing anti-deletion guard requires seq4's index to remain.

## Owner local steps
Download exactly these TWO files from the successful seq5 owner-only QA artifact to the phone's `Download` folder:
- `owner-ota-v2-b150-quiet-seq5.py`
- `owner-ota-b150-seq5-quiet-ui.js`

Keep the **previously signed seq4 file** there too: `AOQAT-B150-OWNER-SEQ4-SIGNED-TEST-ONLY.zip`. Do **not** use an unsigned CI review ZIP. Existing `~/aoqat-keys/aoqat-update-private-v2.pem` and `aoqat-update-public-v2.pem` remain in Termux. The script accepts only an authentic seq4 manifest/HTML that matches the pinned checksum/public key.

In Termux:
```sh
python ~/storage/downloads/owner-ota-v2-b150-quiet-seq5.py --owner-stage
```
Enter the password for **AOQAT-OTA-V2**, not the APK V2 P12 or admin P12. It is not displayed or copied to GitHub. Result is `~/storage/downloads/AOQAT-B150-OWNER-SEQ5-QUIET-FIX-SIGNED-TEST-ONLY.zip`, plus local hash/verification printouts.

In the `أوقات الصلاة — تجريبي` app, select **اختيار ZIP موقّع وتجربته** and this **new signed seq5 ZIP**; **restart the experimental app** when prompted. Verify read-only status says last sequence 5, open `ضبط التنبيهات > تنبيهات أوقات الصلاة > تفعيل وضع الصامت` and test both checkboxes, 20 quick +/- taps, manual numeric edit, no spontaneous keyboard on +/-; restart to confirm saved values. Check alert timing, ringer restore and DND permission behavior on at least the owner's handset. If any crash appears, report model, Android version and which action triggers it; don't use seq5 as a production release.

## Verification and limitations
The GitHub Action validates JavaScript syntax and DOM behavior with a simulated Android bridge, then reconstructs the reviewed seq4 index independently from pinned published seq3 and tests exact seq5 contents using disposable test keys. It **never has the owner private signing key**, never signs publishable owner updates and never uploads to a user channel. CI test success is not proof of actual OEM crashes/no crashes; only owner phone test can establish UI correctness.

Safety gate: NO automatic distribution; a future user-facing release requires separate functional QA and explicit owner approval of exactly identical signed bytes. Do not merge this draft into the published prayer source or admin application.
