"""Publish the small APK web layer; regenerate alongside web changes for build 91.
Native Kotlin, fonts, Quran and audio require a complete APK. Never mix native versions.
"""
from pathlib import Path
import tempfile, shutil, subprocess, json, hashlib, re
root=Path(__file__).resolve().parent.parent
out=root/'android-updates'
with tempfile.TemporaryDirectory() as temp:
    stage=Path(temp)
    for name in ('index.html','js','css','data'):
        source=root/name
        if source.is_dir():shutil.copytree(source,stage/name)
        else:shutil.copy2(source,stage/name)
    subprocess.run(['python3',str(root/'android-native/prepare-web-assets.py'),str(stage)],check=True)
    for name in ('android-ui-fixes.js','android-back-navigation.js'):
        shutil.copy2(root/'android-native/apk-overrides'/name,stage/'js'/name)
    index=stage/'index.html'
    index.write_text(index.read_text().replace('</body>','<script src="js/android-ui-fixes.js"></script><script src="js/android-back-navigation.js"></script></body>'))
    if out.exists():shutil.rmtree(out)
    files={}
    for path in [stage/'index.html',*sorted((stage/'js').glob('*.js')),*sorted((stage/'css').rglob('*.css'))]:
        relative=path.relative_to(stage).as_posix();data=path.read_bytes()
        dest=out/'files'/relative;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
        files[relative]=hashlib.sha256(data).hexdigest()
    canonical='\n'.join(f'{path}:{files[path]}' for path in sorted(files))
    build=int(re.search(r'versionCode (\d+)',(root/'android-native/app/build.gradle').read_text())[1])
    (out/'manifest.json').write_text(json.dumps(dict(nativeBuild=build,revision=hashlib.sha256(canonical.encode()).hexdigest(),files=files),separators=(',',':')))
    print('Small web update:',sum(p.stat().st_size for p in (out/'files').rglob('*') if p.is_file()),'bytes')
