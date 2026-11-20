#!/usr/bin/env python3
"""Verify an already owner-signed public pilot seq4 manifest; never access private keys.

The accepted manifest is the public manifest.json extracted from the owner's
offline-signed ZIP. Rebuild the exact APK-integrated assets, verify every hash
and the pinned pilot ECDSA signature, then stage ONLY the pilot feed. This is
the same pre-signed release principle used by pilot seq2/seq3.
"""
import argparse
import base64
import hashlib
import importlib.util
import json
import re
import subprocess
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / 'android-native/app/src/main/assets/www'
SIGNED = ROOT / 'security/owner-pilot-seq4-signed-public.json'
SOURCE = ROOT / 'android-native/app/src/main/java/com/aoqat/calendar/WebUpdates.kt'
EXPECTED_PIN = 'a0acf8f0464bad18392073c47166937e68f72b732efa3e1299331d0bc43307ea'
FEED_ROOT = Path('android-updates/owner-pilot/build-150')


def fail(msg):
    raise ValueError(msg)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def no_duplicate_keys(pairs):
    result = {}
    for k, v in pairs:
        if k in result:
            fail('Duplicate JSON key: ' + k)
        result[k] = v
    return result


def verify(previous_file: Path, destination: Path):
    spec = importlib.util.spec_from_file_location('pilot_signer', ROOT / 'security/owner-pilot-auto-ota-sign.py')
    signer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(signer)
    prior = json.loads(previous_file.read_text(encoding='utf-8'), object_pairs_hook=no_duplicate_keys)
    signed_bytes = SIGNED.read_bytes()
    m = json.loads(signed_bytes, object_pairs_hook=no_duplicate_keys)
    assert set(m) == {'nativeBuild', 'sequence', 'channel', 'expiresAt', 'revision', 'files', 'signature'}
    assert (prior['nativeBuild'], prior['sequence'], prior['channel']) == (150, 3, 'owner-pilot')
    assert (m['nativeBuild'], m['sequence'], m['channel']) == (150, 4, 'owner-pilot')
    assert type(m['expiresAt']) is int
    assert int(time.time()*1000)+300000 < m['expiresAt'] < int(time.time()*1000)+15*86400000
    assets = {'index.html': (WEB/'index.html').read_bytes()}
    for dirname, extension in [('js', '.js'), ('css', '.css')]:
        for path in sorted((WEB/dirname).rglob('*')):
            if path.is_file() and path.suffix == extension:
                name = path.relative_to(WEB).as_posix()
                assert signer.allowed(name)
                assets[name] = path.read_bytes()
    assert len(assets) == 88
    assert set(assets) == set(prior['files']) == set(m['files'])
    checksums = {key: sha(value) for key, value in assets.items()}
    assert checksums == m['files'], 'The signed manifest does not match the APK-integrated content'
    changed = {key for key, digest in checksums.items() if digest != prior['files'][key]}
    assert changed == {'js/web-menu-order.js', 'js/apk-startup-bundle.js'}, f'Unexpected non-profile differences: {changed}'
    assert all(len(data) <= signer.MAX_FILE for data in assets.values())
    assert sum(map(len, assets.values())) <= signer.MAX_TOTAL
    assert 'الملف الشخصي'.encode() in assets['js/web-menu-order.js']
    assert b'aoqatPersonalProfile' in assets['js/apk-startup-bundle.js']
    assert b'privacyPolicy' in assets['js/apk-startup-bundle.js']
    assert b'aoqatOwnerSeq4Buttons' not in assets['js/apk-startup-bundle.js']
    assert b'aoqatOwnerSeq4Buttons' not in assets['js/web-menu-order.js']
    assert b'js/apk-startup-bundle.js' in assets['index.html']
    matched = re.search(r'const val PILOT_SIGNING_PUBLIC_KEY_B64\\s*=\\s*"([^"]+)"', SOURCE.read_text())
    assert matched, 'Pinned owner-pilot public key not found'
    der = base64.b64decode(matched.group(1), validate=True)
    assert sha(der) == EXPECTED_PIN == signer.PINNED_PUBLIC_KEY_SPKI
    with tempfile.TemporaryDirectory(prefix='verify-owner-pilot-signed-') as directory:
        derfile = Path(directory) / 'pilot.der'
        pubfile = Path(directory) / 'pilot.pem'
        derfile.write_bytes(der)
        pubfile.write_bytes(signer.openssl('pkey','-pubin','-inform','DER','-in',str(derfile),'-pubout'))
        signer.verify_signature(m, pubfile)
    target = destination / FEED_ROOT
    assert not target.exists(), 'Refuse to overwrite staged signed feed'
    target.mkdir(parents=True)
    # Keep the user's public signed bytes unchanged (including signature), NEVER private key material.
    (target/'manifest.json').write_bytes(signed_bytes)
    for name, data in assets.items():
        p = target / 'files' / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        assert sha(p.read_bytes()) == checksums[name]
    print('PASS: owner-pilot seq4 signed public manifest VERIFIED against pinned APK key')
    print('PASS: exactly two permitted profile JS changes; all 86 other APK web files identical to seq3')
    print('PASS: ready for owner-pilot-ota feed ONLY; never main, Vercel or admin')
    print('MANIFEST_SHA256=' + sha(signed_bytes))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--previous', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    verify(args.previous, args.output)
