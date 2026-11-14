#!/usr/bin/env bash
# Disposable key-rotation compatibility smoke test.
# NEVER touches the owner's APK signer, OTA signer, Android app package or
# production APK. Tests official apksigner lineage mechanics on a tiny fake app.
set -euo pipefail

: "${ANDROID_HOME:?Android SDK is required}"
aapt_bin="${AOQAT_AAPT:-$(find "$ANDROID_HOME/build-tools" -type f -name aapt | sort -V | tail -1)}"
signer_bin="${AOQAT_APKSIGNER:-$(find "$ANDROID_HOME/build-tools" -type f -name apksigner | sort -V | tail -1)}"
test -x "$aapt_bin"
test -x "$signer_bin"
platform="$ANDROID_HOME/platforms/android-35/android.jar"
test -s "$platform"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"; unset ROTATION_FIXTURE_PASS' EXIT
umask 077
ROTATION_FIXTURE_PASS="THROWAWAY_TEST_ONLY_${GITHUB_RUN_ID:-LOCAL}_$$"
export ROTATION_FIXTURE_PASS

cat > "$tmp/AndroidManifest.xml" <<'MANIFEST'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.aoqat.rotationfixture">
    <uses-sdk android:minSdkVersion="26" android:targetSdkVersion="34" />
    <application android:label="Discardable Rotation Test" android:hasCode="false" />
</manifest>
MANIFEST

"$aapt_bin" package -f -M "$tmp/AndroidManifest.xml" \
    -I "$platform" -F "$tmp/unsigned.apk"
test -s "$tmp/unsigned.apk"

for name in old new; do
    keytool -genkeypair -noprompt \
        -keystore "$tmp/$name.p12" -storetype PKCS12 \
        -alias "$name" -keyalg RSA -keysize 3072 -validity 7 \
        -dname "CN=AOQAT Ephemeral $name Key, O=Test Only, C=IQ" \
        -storepass "$ROTATION_FIXTURE_PASS" \
        >/dev/null 2>&1
done

"$signer_bin" rotate --out "$tmp/disposable.lineage" \
    --old-signer --ks "$tmp/old.p12" --ks-type PKCS12 \
    --ks-pass env:ROTATION_FIXTURE_PASS \
    --new-signer --ks "$tmp/new.p12" --ks-type PKCS12 \
    --ks-pass env:ROTATION_FIXTURE_PASS
test -s "$tmp/disposable.lineage"

"$signer_bin" sign \
    --ks "$tmp/old.p12" --ks-type PKCS12 --ks-pass env:ROTATION_FIXTURE_PASS \
    --next-signer \
    --ks "$tmp/new.p12" --ks-type PKCS12 --ks-pass env:ROTATION_FIXTURE_PASS \
    --lineage "$tmp/disposable.lineage" --rotation-min-sdk-version 28 \
    --out "$tmp/rotated.apk" "$tmp/unsigned.apk"

# Signing is verified by the same SDK tool the real release would use.
# SUCCESS DOES NOT PROVE an install-over update from the actual v2.10 APK.
for api in 26 27 28 32 33 35; do
    "$signer_bin" verify --verbose --print-certs \
        --min-sdk-version "$api" --max-sdk-version "$api" \
        "$tmp/rotated.apk" > "$tmp/verify-$api.log"
    grep -Fq 'Verifies' "$tmp/verify-$api.log"
    echo "EPHEMERAL_ROTATION_SIGNATURE_VERIFIED_API_$api"
done
echo "PASS: disposable v3 lineage creation/signing and per-API signature verification"
echo "NO REAL OWNER KEY USED. NO REAL APK CREATED OR PUBLISHED."
