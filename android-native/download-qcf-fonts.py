"""Bundle all 604 QCF V2 page fonts locally: zero network dependency at prayer/Quran reading time."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import os, urllib.request, time

target = Path(__import__('sys').argv[1]) / 'assets' / 'qcf-v2-page-fonts'
target.mkdir(parents=True, exist_ok=True)
source = 'https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p{}.woff2'

def get(page):
    dest = target / f'p{page}.woff2'
    if dest.is_file() and dest.stat().st_size > 1000 and dest.open('rb').read(4) == b'wOF2':
        return page, dest.stat().st_size
    for attempt in range(5):
        try:
            req=urllib.request.Request(source.format(page),headers={'User-Agent':'Aoqat-Hawija-Offline-QCF/1.0'})
            with urllib.request.urlopen(req,timeout=40) as r:
                data=r.read(3000000)
            if len(data)<1000 or data[:4]!=b'wOF2':
                raise ValueError(f'QCF font {page} did not return a valid woff2: {len(data)} bytes')
            tmp=dest.with_suffix('.tmp')
            tmp.write_bytes(data)
            tmp.replace(dest)
            return page,len(data)
        except Exception:
            if attempt==4: raise
            time.sleep((attempt+1)*1.4)

with ThreadPoolExecutor(max_workers=12) as pool:
    futures=[pool.submit(get,p) for p in range(1,605)]
    total=0
    for future in as_completed(futures):
        page,length=future.result()
        total+=length
assert len(list(target.glob('p*.woff2')))==604, 'QCF 604 fonts are incomplete'
print(f'Bundled 604 verified local QCF V2 fonts: {total/1048576:.1f} MiB')
