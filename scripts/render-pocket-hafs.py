"""Render unchanged KFGQPC pocket pages and register existing ayah regions to the same calligraphy."""
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import hashlib,json,gzip,urllib.request,io,re,os
import fitz,cv2,numpy as np
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parent.parent
PDF=Path('/tmp/mushaf-pocket.pdf')
URL='https://cdn.quran.ws/KFGQPC/resources/quran-hafs/jaib/jaib.pdf'
SHA='70eba3d516823d54a9b001672c00a0403a25df937d52fe0a38731b915825aee4'
OUT=ROOT/'assets/mushaf-hafs-pocket'
BASE=json.loads(gzip.decompress((ROOT/'assets/mushaf-hafs-1441.json.gz').read_bytes()))
def ink(im):
    a=(np.all(im<150,axis=2)&((im.max(axis=2).astype(int)-im.min(axis=2))<20)).astype(np.uint8)*255
    a[:int(im.shape[0]*.1)]=0;a[int(im.shape[0]*.92):]=0
    return a

def render(n):
    cv2.setNumThreads(1)
    page=fitz.open(PDF)[n+2] # PDF front matter occupies indices 0..2; numbered page 1 is index 3.
    pix=page.get_pixmap(matrix=fitz.Matrix(3,3),alpha=False)
    native=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3)[:,:,::-1].copy()
    original=cv2.imread(str(ROOT/f'assets/mushaf-hafs-1441/{n:03}.webp'))
    a,b=ink(original),ink(native)
    orb=cv2.ORB_create(nfeatures=8000)
    k1,z1=orb.detectAndCompute(a,None);k2,z2=orb.detectAndCompute(b,None)
    pairs=cv2.BFMatcher(cv2.NORM_HAMMING).knnMatch(z1,z2,k=2)
    good=[m for m,nn in pairs if m.distance<.72*nn.distance]
    src=np.float32([k1[m.queryIdx].pt for m in good]);dst=np.float32([k2[m.trainIdx].pt for m in good])
    H,inliers=cv2.estimateAffine2D(src,dst,ransacReprojThreshold=3,maxIters=10000)
    if H is None or int(inliers.sum())<100:raise RuntimeError(f'Insufficient calligraphy matches on page {n}')
    if abs(H[0,1])>.005 or abs(H[1,0])>.005 or not(.77<H[0,0]<.81 and .77<H[1,1]<.81):raise RuntimeError(f'Unexpected page alignment {n}')
    # Opening pages have elaborate decorative backgrounds; compare only the
    # envelope of the existing ayah regions there, rather than the frame.
    if n<=2:
        source_page=BASE['pages'][n-1]
        aa,bb,cc,dd,ee,ff=map(float,re.findall(r'-?\d+(?:\.\d+)?',source_page['hitTransform']))
        coords=[]
        for hit in source_page['hits']:
            nums=list(map(float,re.findall(r'-?\d+(?:\.\d+)?',hit['polygon'])))
            coords.extend([(3*(aa*x+cc*y+ee),3*(bb*x+dd*y+ff)) for x,y in zip(nums[::2],nums[1::2])])
        coords=np.array(coords)
        x0,y0=np.floor(coords.min(axis=0)-8).astype(int);x1,y1=np.ceil(coords.max(axis=0)+8).astype(int)
        mask=np.zeros_like(a);mask[max(0,y0):y1,max(0,x0):x1]=255;a=cv2.bitwise_and(a,mask)
        region=cv2.warpAffine(mask,H,(native.shape[1],native.shape[0]))
        b=cv2.bitwise_and(b,region)
    warped=cv2.warpAffine(a,H,(native.shape[1],native.shape[0]))
    dilate=lambda x:cv2.dilate(x,np.ones((5,5),np.uint8))
    # Every page must match in both directions, not merely share a few words.
    old_overlap=float(np.count_nonzero((warped>0)&(dilate(b)>0))/max(1,np.count_nonzero(warped)))
    new_overlap=float(np.count_nonzero((b>0)&(dilate(warped)>0))/max(1,np.count_nonzero(b)))
    if old_overlap<.9 or (n>2 and new_overlap<.85):raise RuntimeError(f'Calligraphy coverage too low {n}: {old_overlap} {new_overlap}')
    p=dict(BASE['pages'][n-1]);oldmat=list(map(float,re.findall(r'-?\d+(?:\.\d+)?',p['hitTransform'])))
    aa,bb,cc,dd,ee,ff=oldmat
    old=np.array([[aa,cc,ee],[bb,dd,ff],[0,0,1]])
    native_transform=np.vstack([H,[0,0,1]]);native_transform[:2,2]/=3
    composed=native_transform@old
    p['hitTransform']='matrix('+ ' '.join(f'{v:.8f}' for v in [composed[0,0],composed[1,0],composed[0,1],composed[1,1],composed[0,2],composed[1,2]])+')'
    p['width'],p['height']=round(page.rect.width,4),round(page.rect.height,4)
    # Display excludes only blank paper; every printed mark and decoration is retained.
    im=Image.fromarray(native[:,:,::-1]);diff=ImageChops.difference(im,Image.new('RGB',im.size,'white'))
    x0,y0,x1,y1=diff.convert('L').point(lambda v:255 if v>8 else 0).getbbox()
    x0=max(0,x0/3-2);y0=max(0,y0/3-2);x1=min(p['width'],x1/3+2);y1=min(p['height'],y1/3+2)
    p['displayBox']=[round(x0,3),round(y0,3),round(x1-x0,3),round(y1-y0,3)]
    p['registration']={'matches':int(inliers.sum()),'oldInkCoverage':round(old_overlap,4),'newInkCoverage':round(new_overlap,4)}
    pix=page.get_pixmap(matrix=fitz.Matrix(4.5,4.5),alpha=False)
    data=io.BytesIO();Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(data,'WEBP',quality=92,method=4)
    target=OUT/f'{n:03}.webp';target.write_bytes(data.getvalue())
    with Image.open(target) as check:check.verify()
    if target.stat().st_size<10000:raise RuntimeError(f'Empty render {n}')
    return p

if __name__=='__main__':
    if not PDF.exists():urllib.request.urlretrieve(URL,PDF)
    digest=hashlib.sha256()
    with PDF.open('rb') as f:
        for block in iter(lambda:f.read(8*1024*1024),b''):digest.update(block)
    if digest.hexdigest()!=SHA:raise RuntimeError('Pocket publication checksum mismatch')
    if len(fitz.open(PDF))!=640:raise RuntimeError('Unexpected publication length')
    OUT.mkdir(exist_ok=True)
    with ProcessPoolExecutor(max_workers=min(4,os.cpu_count() or 2)) as pool:
        pages=[]
        for p in pool.map(render,range(1,605)):
            pages.append(p)
            if p['id']%50==0:print('Registered and rendered',p['id'],flush=True)
    metadata={'edition':'KFGQPC pocket Hafs publication','sourcePdfUrl':'https://qurancomplex.gov.sa/wp-content/uploads/isdarat/hafs/jaib.pdf','sourcePdfSha256':SHA,'sourceMetadataArchiveSha256':BASE['sourceArchiveSha256'],'imageDirectory':'assets/mushaf-hafs-pocket','cacheName':'aoqat-mushaf-hafs-pocket','pages':pages}
    (ROOT/'assets/mushaf-hafs-pocket.json.gz').write_bytes(gzip.compress(json.dumps(metadata,separators=(',',':')).encode(),mtime=0))
    (ROOT/'assets/mushaf-hafs-pocket-ready.json').write_text(json.dumps({'edition':metadata['edition'],'pages':604,'pdfSha256':SHA}))
    print('All 604 unchanged pocket pages ready',flush=True)
