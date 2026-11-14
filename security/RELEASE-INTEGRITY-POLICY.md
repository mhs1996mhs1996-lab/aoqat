# Religious-content integrity and release security

## Principle

This application displays Quran text, prayer times, adhan and religious reminders.
**No automatic update may silently change a sacred source or a prayer-time source.**
Functional changes to religious calculations and sources require independent review
by the project owner and a competent religious/timekeeping reviewer.

## Implemented in this isolated branch

- `security/check-sacred-content.py` compares tracked Quran sources and prayer
  schedule/calculation sources with the immutable `v2.10` release commit.
- The GitHub workflow tests both an unchanged snapshot and an intentionally
  modified (one-byte) Quran source. It runs in a temporary worker; no tampered
  content is published.
- The check proves that a release did not change protected bytes, **not** that
  the original bytes have been authenticated against an authoritative mushaf.
- No production APK or database is modified by this branch.

## Must complete before deploying a security release

1. **Repository signing key is exposed.** The public repository has a
   base64-encoded APK keystore with a known debug signing password. Assume it
   may have been copied. Deleting it now does not erase clones or Git history.
   Prevent new builds from using the public key and plan a safe signature
   transition. Verify signing lineage and install-over behavior across supported
   Android versions *before* changing signing keys; do not uninstall existing
   installations or erase data.
2. **Sign partial updates independently.** The APK must pin an offline public
   verification key. CI should sign a canonical manifest (build number,
   monotonic revision, expiry / timestamp, every file hash) with an offline or
   HSM-protected private key; never store the private key in Git or Vercel.
   The receiver must reject missing, invalid, replayed or stale signatures.
   SHA-256 checks alone do NOT authenticate who published a manifest.
3. **Fail-safe activation and rollback.** Keep the complete last-known-good
   web snapshot, activate a new one only after a successful launch/health
   acknowledgement, and disable a failed revision before retrying. Test offline
   cold-start, interrupted downloads, and a deliberately crashing web view.
4. **Limit the WebView trust boundary.** Move to secure appassets HTTPS only,
   then disable unrestricted `file://` access once legacy setting migration has
   been tested. Limit JavaScript bridge methods and block navigation to
   untrusted URLs in the privileged WebView.
5. **Enforce reviews on the server.** Require protected-branch pull requests,
   security-integrity CI, at least two trusted reviewers for Quran/prayer data,
   and no direct pushes or bypasses. The workflow alone cannot protect a
   repository controlled by an attacker with admin privileges.
6. **Validate sources independently.** Review each Qur'an source against a
   recognized printed/source edition. Review Hawija prayer timetable,
   madhhab choices, dates and Ramadan adjustments with the authorized source.
   Record source, date, reviewer, approved checksums and correction history.
   The frozen v2.10 release is a comparison baseline, **not** a certification.

## Release policy

- Never publish a Quran / prayer data modification on the same automatic
  pipeline as ordinary UI color, layout or notification changes.
- Separate web UI updates from sacred source and prayer schedule updates.
- Permit changes to Quran / prayer sources only after expert/owner sign-off,
  source re-verification and an explicit new reference baseline.
- Preserve user preferences and the installed offline prayer schedule on
  failed updates. Never silently substitute times from the network.
- Keep a known-good APK and update channel for rollback testing.
