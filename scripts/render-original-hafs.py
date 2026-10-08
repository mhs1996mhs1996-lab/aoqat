"""Render the unmodified KFGQPC 1441H Hafs masters; verify the complete archive first."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import hashlib, json, gzip, zipfile, urllib.request, os, io
import fitz
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
ARCHIVE=Path('/tmp/official-hafs-1441.zip')
URL='https://cdn.quran.ws/KFGQPC/resources/dm/1441-ai-hafs/1441-AI-hafs.zip'
SHA='280c5d71ca16aaeeb3a343be1b92c76fa6df71d0671e202c026fde12402d9eef'
OUT=ROOT/'assets/mushaf-hafs-1441'

def render(name):
    with zipfile.ZipFile(ARCHIVE) as archive: raw=archive.read(name)
    page=fitz.open(stream=raw,filetype='pdf')[0]
    n=int(Path(name).name[:3])
    pix=page.get_pixmap(matrix=fitz.Matrix(3,3),alpha=False)
    data=io.BytesIO();Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(data,'WEBP',quality=90,method=4)
    target=OUT/f'{n:03}.webp';target.write_bytes(data.getvalue())
    with Image.open(target) as check: check.verify()
    if target.stat().st_size<10000:raise RuntimeError('Empty page render')
    return n,round(page.rect.width,4),round(page.rect.height,4)

if __name__=='__main__':
    if not ARCHIVE.exists(): urllib.request.urlretrieve(URL,ARCHIVE)
    digest=hashlib.sha256()
    with ARCHIVE.open('rb') as source:
        for block in iter(lambda:source.read(8*1024*1024),b''):digest.update(block)
    if digest.hexdigest()!=SHA: raise RuntimeError('Official archive checksum mismatch')
    with zipfile.ZipFile(ARCHIVE) as archive: names=sorted(n for n in archive.namelist() if n.endswith('.ai'))
    if len(names)!=604: raise RuntimeError('Expected exactly 604 original page masters')
    metadata=json.loads(gzip.decompress((ROOT/'assets/mushaf-hafs-1441.json.gz').read_bytes()))
    OUT.mkdir(exist_ok=True)
    with ProcessPoolExecutor(max_workers=min(4,os.cpu_count() or 2)) as pool:
        for n,w,h in pool.map(render,names):
            expected=metadata['pages'][n-1]
            if (n,w,h)!=(expected['id'],expected['width'],expected['height']): raise RuntimeError('Page dimensions mismatch')
            if n%100==0: print('Rendered',n,flush=True)
    (ROOT/'assets/mushaf-hafs-1441-ready.json').write_text(json.dumps({'edition':'KFGQPC Madinah Hafs 1441H','pages':604,'archiveSha256':SHA}))
    print('Original 604 page images ready',flush=True)
