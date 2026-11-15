#!/data/data/com.termux/files/usr/bin/bash
# AOQAT 147 - offline local signing; ONLY the owner's encrypted V2 key on this phone.
# Public helper. Contains no private keys, passwords or network operations.
set -euo pipefail
set +x
umask 077
EXPECTED_APK='da63ddbbb6768711b28ee7ec7b486783f8aad23c2246d8e217d03237261c4cb3'
EXPECTED_CERT='9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765'
DOWNLOADS="$HOME/storage/downloads"
KEYSTORE="$HOME/aoqat-keys/aoqat-apk-production-v2.p12"
OUTPUT="$DOWNLOADS/aoqat-b147-v2-qcf-swipe-signed.apk"
ALIAS='aoqat-production-v2'
for executable in python3 sha256sum apksigner; do
  command -v "$executable" >/dev/null 2>&1 || { echo "STOP: missing $executable"; exit 1; }
done
[[ -t 0 ]] || { echo 'STOP: run interactively from Termux.'; exit 1; }
[[ -f "$KEYSTORE" ]] || { echo 'STOP: private V2 signer missing on this phone.'; exit 1; }
[[ ! -e "$OUTPUT" ]] || { echo 'STOP: output already exists; refusing overwrite.'; exit 1; }
[[ -d "$DOWNLOADS" ]] || { echo 'STOP: Termux downloads storage not set up.'; exit 1; }

TEMP_DIR="$(mktemp -d)"
PASSWORD=''
cleanup() {
  unset PASSWORD
  rm -rf -- "$TEMP_DIR"
}
trap cleanup EXIT

# Accept the verified standalone unsigned APK OR the official GitHub Actions
# artifact ZIP directly. Extract only the expected APK; ignore other archive files.
INPUT="$DOWNLOADS/AOQAT-147-QCF-SWIPE-Unsigned.apk"
if [[ ! -s "$INPUT" ]]; then
  INPUT="$TEMP_DIR/review-147.apk"
  python3 - "$DOWNLOADS" "$INPUT" "$EXPECTED_APK" <<'PY'
from pathlib import Path
from zipfile import ZipFile, BadZipFile
import hashlib, shutil, sys
folder,destination,expected = Path(sys.argv[1]),Path(sys.argv[2]),sys.argv[3]
member='android-native/app/build/outputs/apk/release/app-release-unsigned.apk'
archives=sorted((x for x in folder.glob('*.zip') if '147' in x.name),key=lambda p:p.stat().st_mtime,reverse=True)
for archive in archives:
    try:
        with ZipFile(archive) as z:
            if member not in z.namelist(): continue
            sha=hashlib.sha256()
            with z.open(member) as source, destination.open('wb') as output:
                for chunk in iter(lambda:source.read(1024*1024),b''):
                    sha.update(chunk)
                    output.write(chunk)
            if sha.hexdigest()==expected:
                print('PASS: exact build-147 APK recovered from reviewed GitHub artifact ZIP.')
                break
    except (BadZipFile, OSError):
        continue
else:
    raise SystemExit('STOP: reviewed 147 APK not found in Downloads. Download the GitHub artifact ZIP (name includes 147).')
PY
fi
[[ -s "$INPUT" ]] || { echo 'STOP: unsigned APK absent'; exit 1; }
ACTUAL="$(sha256sum "$INPUT" | cut -d ' ' -f 1)"
[[ "$ACTUAL" == "$EXPECTED_APK" ]] || { echo 'STOP: unsigned APK SHA-256 mismatch; no signing.'; exit 1; }
echo 'PASS: reviewed unsigned APK SHA-256.'
echo 'Owner V2 private key stays on this phone. Do not send your passphrase.'
read -r -s -p 'Enter owner V2 APK PKCS12 passphrase (hidden): ' PASSWORD
printf '\n'
[[ -n "$PASSWORD" ]] || { echo 'STOP: empty passphrase'; exit 1; }
if ! printf '%s\n%s\n' "$PASSWORD" "$PASSWORD" | apksigner sign \
   --ks "$KEYSTORE" --ks-type PKCS12 --ks-key-alias "$ALIAS" \
   --ks-pass stdin --key-pass stdin --out "$OUTPUT" "$INPUT"; then
  rm -f -- "$OUTPUT"
  echo 'STOP: signing failed.'
  exit 1
fi
unset PASSWORD
STATUS="$TEMP_DIR/verify.txt"
if ! apksigner verify --verbose --print-certs --min-sdk-version 26 "$OUTPUT" > "$STATUS" 2>&1; then
  rm -f -- "$OUTPUT"
  echo 'STOP: Android signature verification failed.'
  exit 1
fi
if ! python3 - "$STATUS" "$EXPECTED_CERT" <<'PY'
import pathlib, re, sys
output=pathlib.Path(sys.argv[1]).read_text(errors='replace')
found={value.replace(':','').lower() for value in re.findall(
    r'certificate SHA-256 digest:\s*([0-9a-fA-F:]+)',output)}
if found!={sys.argv[2]}:
    raise SystemExit('STOP: unexpected APK certificate. V2 owner identity not verified.')
print('PASS: exclusively the approved owner V2 signing certificate.')
PY
then
  rm -f -- "$OUTPUT"
  exit 1
fi
chmod 600 "$OUTPUT"
echo 'PASS: APK 147 owner-local signature verified for Android 8+.'
sha256sum "$OUTPUT"
echo "SIGNED APK FOR OWNER TEST DEVICE ONLY: $OUTPUT"
echo 'NOT YET APPROVED FOR PUBLIC RELEASE; Quran swipe and offline tests remain.'
