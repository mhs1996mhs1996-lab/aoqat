#!/data/data/com.termux/files/usr/bin/bash
# AOQAT APK 149: offline local owner signing only. No private key on GitHub.
set -euo pipefail
set +x
umask 077

EXPECTED_APK='f1260475f619d03c0045148c781a0fc9defaf1f84791f4c69b86058496bc769c'
EXPECTED_CERT='9f981c7e29488599aab146de4aaf6cf305fe30b06fcec31a7a6345783c3ae765'
DOWNLOADS="$HOME/storage/downloads"
KEYSTORE="$HOME/aoqat-keys/aoqat-apk-production-v2.p12"
OUTPUT="$DOWNLOADS/aoqat-b149-v2-qcf-uniform-signed.apk"

for name in python3 sha256sum apksigner; do
  command -v "$name" >/dev/null 2>&1 || { echo "STOP: missing $name"; exit 1; }
done
[[ -t 0 ]] || { echo 'STOP: run interactively in Termux'; exit 1; }
[[ -f "$KEYSTORE" && -d "$DOWNLOADS" ]] || {
  echo 'STOP: owner V2 key or Downloads directory missing'; exit 1;
}
[[ ! -e "$OUTPUT" ]] || { echo 'STOP: signed output already exists; not overwriting'; exit 1; }
WORK="$(mktemp -d)"
PASSWORD=''
cleanup(){ unset PASSWORD; rm -rf -- "$WORK"; }
trap cleanup EXIT

# Supports the full file, the 4 parts, or GitHub Actions artifact ZIP.
# Always verify the ENTIRE APK SHA-256 before requesting the key passphrase.
python3 - "$DOWNLOADS" "$WORK/unsigned.apk" "$EXPECTED_APK" <<'PY'
import hashlib,sys
from pathlib import Path
from zipfile import ZipFile,BadZipFile

download,dest,expected=Path(sys.argv[1]),Path(sys.argv[2]),sys.argv[3]
def valid(chunks):
    digest=hashlib.sha256()
    with dest.open('wb') as output:
        for chunk in chunks:
            digest.update(chunk);output.write(chunk)
    return digest.hexdigest()==expected
def file_chunks(file):
    with file.open('rb') as src:
        while block:=src.read(1024*1024):yield block

for file in (download/'AOQAT-149-Unsigned-Verified.apk',
             download/'AOQAT-149-APK-Verified-For-Termux.apk'):
    if file.is_file() and valid(file_chunks(file)):
        print('PASS: reviewed APK 149 verified (single file)');sys.exit(0)

parts=[download/f'AOQAT-149.part{i:02}' for i in range(1,5)]
if all(p.is_file() and p.stat().st_size>0 for p in parts):
    def merged():
        for part in parts:yield from file_chunks(part)
    if valid(merged()):
        print('PASS: reviewed APK 149 verified (four parts)');sys.exit(0)

member='android-native/app/build/outputs/apk/release/app-release-unsigned.apk'
archives=[download/'AOQAT-149-QCF-UNIFORM-UNSIGNED-OWNER-REVIEW.zip']
archives+=sorted((p for p in download.glob('*149*.zip') if p not in archives),reverse=True)
for archive in archives:
    if not archive.is_file():continue
    try:
        with ZipFile(archive) as z:
            if member not in z.namelist():continue
            def zip_chunks():
                with z.open(member) as src:
                    while block:=src.read(1024*1024):yield block
            if valid(zip_chunks()):
                print('PASS: reviewed APK 149 verified (GitHub ZIP)');sys.exit(0)
    except (OSError,BadZipFile):continue
dest.unlink(missing_ok=True)
raise SystemExit('STOP: exact verified build 149 not found in Downloads')
PY
test -s "$WORK/unsigned.apk"
ACTUAL="$(sha256sum "$WORK/unsigned.apk" | cut -d' ' -f1)"
[[ "$ACTUAL" == "$EXPECTED_APK" ]] || { echo 'STOP: APK SHA-256 mismatch'; exit 1; }
echo 'PASS: exact approved unsigned APK SHA-256.'
echo 'V2 private signing key remains on this phone.'
IFS= read -r -s -p 'Enter V2 APK PKCS12 passphrase (hidden): ' PASSWORD
printf '\n'
[[ -n "$PASSWORD" ]] || { echo 'STOP: empty passphrase'; exit 1; }
if ! printf '%s\n%s\n' "$PASSWORD" "$PASSWORD" | apksigner sign \
  --ks "$KEYSTORE" --ks-type PKCS12 \
  --ks-key-alias aoqat-production-v2 \
  --ks-pass stdin --key-pass stdin \
  --out "$OUTPUT" "$WORK/unsigned.apk"; then
  rm -f -- "$OUTPUT"; echo 'STOP: APK signing failed'; exit 1;
fi
unset PASSWORD

if ! apksigner verify --verbose --print-certs --min-sdk-version 26 \
  "$OUTPUT" > "$WORK/verification.txt" 2>&1; then
  rm -f -- "$OUTPUT"; echo 'STOP: APK signature verification failed'; exit 1;
fi
if ! python3 - "$WORK/verification.txt" "$EXPECTED_CERT" <<'PY'
from pathlib import Path
import re,sys
result=Path(sys.argv[1]).read_text(errors='replace')
found={v.replace(':','').lower() for v in re.findall(
    r'certificate SHA-256 digest:\s*([0-9a-fA-F:]+)',result)}
if found!={sys.argv[2]}:
    raise SystemExit('STOP: APK signer certificate is NOT approved owner V2')
print('PASS: owner V2 APK signing certificate verified.')
PY
then
  rm -f -- "$OUTPUT";exit 1
fi
chmod 600 "$OUTPUT"
echo 'PASS: signed APK 149 verified for Android 8+.'
sha256sum "$OUTPUT"
echo "SIGNED APK FOR OWNER TESTING ONLY: $OUTPUT"
echo 'NOT FOR PUBLIC RELEASE: offline performance test on real phone required.'
