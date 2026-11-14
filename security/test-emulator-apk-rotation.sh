#!/usr/bin/env bash
# Disposable Android emulator signing-lineage migration test.
# Uses ONLY two freshly generated, throwaway test keystores and an empty fake
# package. Does NOT touch real AOQAT apps, data, signing keys or users.
set -euo pipefail
trap 'rc=$?; echo "EMULATOR_FIXTURE_FAILURE: exit=$rc line=$LINENO" >&2' ERR
: "${ANDROID_HOME:?Android SDK required}"
api="$(adb shell getprop ro.build.version.sdk | tr -d '\r')"
case "$api" in 26|27|28|33) ;; *) echo "Unsupported fixture API: $api"; exit 1 ;; esac
aapt="$(find "$ANDROID_HOME/build-tools" -type f -name aapt | sort -V | tail -1)"
signer="$(find "$ANDROID_HOME/build-tools" -type f -name apksigner | sort -V | tail -1)"
echo "FIXTURE_DEBUG: SDK=$ANDROID_HOME API=$api aapt=$aapt signer=$signer"
test -x "$aapt" && test -x "$signer"
platform="$ANDROID_HOME/platforms/android-$api/android.jar"
echo "FIXTURE_DEBUG: platform jar=$platform"
test -s "$platform"
pkg='com.example.aoqat.rotationfixture'
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"; unset FIXTURE_PASS' EXIT
umask 077
FIXTURE_PASS="DISPOSABLE_EMULATOR_${GITHUB_RUN_ID:-LOCAL}_$$"
export FIXTURE_PASS

# Two version codes of the same harmless, debuggable, no-code app.
for version in 1 2; do
  cat > "$tmp/AndroidManifest.xml" <<MANIFEST
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="$pkg" android:versionCode="$version" android:versionName="fixture-$version">
    <uses-sdk android:minSdkVersion="26" android:targetSdkVersion="28" />
    <application android:label="Throwaway Migration Fixture"
        android:debuggable="true" android:hasCode="false" />
</manifest>
MANIFEST
  "$aapt" package -f -M "$tmp/AndroidManifest.xml" -I "$platform" -F "$tmp/unsigned-$version.apk"
done

echo "FIXTURE_DEBUG: manifest-only APKs created"
for identity in old new; do
  keytool -genkeypair -noprompt -keystore "$tmp/$identity.p12" -storetype PKCS12 \
    -alias "$identity" -keyalg RSA -keysize 3072 -validity 7 \
    -dname "CN=AOQAT Throwaway Emulator $identity, O=Test Only, C=IQ" \
    -storepass "$FIXTURE_PASS" >/dev/null 2>&1
done

echo "FIXTURE_DEBUG: disposable test keystores created"
# Baseline fake package signed by old THROWAWAY identity.
"$signer" sign --ks "$tmp/old.p12" --ks-type PKCS12 \
  --ks-pass env:FIXTURE_PASS --out "$tmp/old.apk" "$tmp/unsigned-1.apk"

# Proper v3 signing lineage using disposable keys only.
"$signer" rotate --out "$tmp/disposable.lineage" \
  --old-signer --ks "$tmp/old.p12" --ks-type PKCS12 --ks-pass env:FIXTURE_PASS \
  --new-signer --ks "$tmp/new.p12" --ks-type PKCS12 --ks-pass env:FIXTURE_PASS
"$signer" sign --ks "$tmp/old.p12" --ks-type PKCS12 \
  --ks-pass env:FIXTURE_PASS --next-signer \
  --ks "$tmp/new.p12" --ks-type PKCS12 --ks-pass env:FIXTURE_PASS \
  --lineage "$tmp/disposable.lineage" --rotation-min-sdk-version 28 \
  --out "$tmp/rotated.apk" "$tmp/unsigned-2.apk"

echo "FIXTURE_DEBUG: disposable old/new lineage and candidate APK created"
sha_of_public_cert() {
  keytool -exportcert -rfc -keystore "$tmp/$1.p12" -storetype PKCS12 \
    -alias "$1" -storepass "$FIXTURE_PASS" 2>/dev/null | \
    openssl x509 -outform DER | sha256sum | awk '{print $1}'
}
old_sha="$(sha_of_public_cert old)"
new_sha="$(sha_of_public_cert new)"
"$signer" verify --verbose --print-certs --min-sdk-version "$api" \
    --max-sdk-version "$api" "$tmp/rotated.apk" > "$tmp/verify.log"
echo "FIXTURE_DEBUG: apksigner certificate output (public only):"
cat "$tmp/verify.log"
# Build-Tools 37 uses "V2 Signer:" / "V3.0 Signer:" instead of the
# historical "Signer #1" label. Require EXACTLY ONE API-specific signer.
mapfile -t api_sha < <(
  sed -nE 's/^(Signer #[0-9]+|V[0-9]+([.][0-9]+)? Signer:)[[:space:]]+certificate SHA-256 digest:[[:space:]]*([[:xdigit:]]{64})$/\3/p' "$tmp/verify.log" |
    tr '[:upper:]' '[:lower:]'
)
test "${#api_sha[@]}" -eq 1
signed_sha="${api_sha[0]}"
echo "FIXTURE_DEBUG: fingerprint observed=$signed_sha old=$old_sha new=$new_sha"
test -n "$signed_sha"
if (( api < 28 )); then
  # Android 8 cannot use the new v3 key. Even a technically accepted
  # legacy-key update is NOT considered a safe production transition.
  test "$signed_sha" = "$old_sha"
  echo "PASS: API $api signs legacy fallback with disposable old identity"

  # Safer Android 8/8.1 transition proof: a separately identified NEW-signer
  # fake app can install beside the old fake app without replacing its package
  # or disturbing the old package's private data. No automatic migration is
  # claimed; the production app still needs reviewed export/import or manual
  # user-consented setup, without silently losing excluded adhan settings.
  second_pkg='com.example.aoqat.rotationfixture.newsigner'
  cat > "$tmp/AndroidManifest.xml" <<MANIFEST_ALT
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="$second_pkg" android:versionCode="2" android:versionName="side-by-side-test">
    <uses-sdk android:minSdkVersion="26" android:targetSdkVersion="28" />
    <application android:label="Throwaway Separate-Signer Fixture"
        android:debuggable="true" android:hasCode="false" />
</manifest>
MANIFEST_ALT
  "$aapt" package -f -M "$tmp/AndroidManifest.xml" -I "$platform" -F "$tmp/alternate-unsigned.apk"
  "$signer" sign --ks "$tmp/new.p12" --ks-type PKCS12 \
    --ks-pass env:FIXTURE_PASS --out "$tmp/alternate-new.apk" "$tmp/alternate-unsigned.apk"
  "$signer" verify --print-certs --min-sdk-version "$api" \
    --max-sdk-version "$api" "$tmp/alternate-new.apk" > "$tmp/alternate-cert.log"
  grep -Fqi "$new_sha" "$tmp/alternate-cert.log"

  adb install "$tmp/old.apk"
  adb shell "run-as $pkg sh -c 'mkdir -p files && echo legacy-keep-me > files/fixture-sentinel'"
  test "$(adb shell "run-as $pkg cat files/fixture-sentinel" | tr -d '\r')" = 'legacy-keep-me'
  adb install "$tmp/alternate-new.apk"
  adb shell pm path "$pkg" | grep -Fq 'package:'
  adb shell pm path "$second_pkg" | grep -Fq 'package:'
  test "$(adb shell "run-as $pkg cat files/fixture-sentinel" | tr -d '\r')" = 'legacy-keep-me'
  echo "PASS: API $api independent new-signer fixture installed beside old; old data untouched"
  echo "MANDATORY SECURITY HOLD: Android 8 users still need consent-based settings migration"
  exit 0
fi
test "$signed_sha" = "$new_sha"
echo "PASS: API $api selects disposable rotated new certificate"

# Exercise real package manager install-over and verify app-private data stays.
adb install "$tmp/old.apk"
adb shell "run-as $pkg sh -c 'mkdir -p files && echo persisted-test-data > files/fixture-sentinel'"
test "$(adb shell "run-as $pkg cat files/fixture-sentinel" | tr -d '\r')" = 'persisted-test-data'
adb install -r "$tmp/rotated.apk"
test "$(adb shell "run-as $pkg cat files/fixture-sentinel" | tr -d '\r')" = 'persisted-test-data'
adb shell "dumpsys package $pkg" | grep -F 'versionCode=2' > /dev/null

echo "PASS: API $api disposable old->rotated-new APK install-over retained private sentinel"
echo "NO REAL OWNER KEY, NO REAL APP, NO REAL USER DATA TOUCHED"
echo "STILL REQUIRES real v2.10 device upgrade tests before any production release"
