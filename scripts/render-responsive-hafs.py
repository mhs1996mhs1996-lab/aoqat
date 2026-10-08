"""Build responsive rows from original KFGQPC QCF2 outlines, without editing glyphs.
Requires fonttools, uharfbuzz. Input page/word codes: Quran Foundation API,
line decorations: pinned QUL-derived layout. All downloads are build-time only.
"""
import argparse, concurrent.futures, gzip, hashlib, io, json, subprocess, zipfile
from pathlib import Path
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
ROOT=Path(__file__).resolve().parents[1]
SHA='077ee64d5bcb35bc6d07bca0b3a8faacd97add0c610b5ee72e0ccb3b457445a5'
ARCHIVE='https://media.githubusercontent.com/media/manaf/KFGQPC-Madinah-Mushaf/main/Al_Madinah_Mushaf_Win_Setup-2.1.zip'
LAYOUT_COMMIT='dad9cf67588ab66c914c155924d8a3699704a03d'
def download(url,path):
 path.parent.mkdir(parents=True,exist_ok=True)
 if not path.exists():subprocess.run(['curl','--retry','4','--retry-all-errors','-fLsS','--max-time','180',url,'-o',str(path)],check=True)
 return path.read_bytes()
def pack(path,data):path.write_bytes(gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9,mtime=0))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--cache',default='/tmp/qcf2-oracle-cache');ap.add_argument('--archive',default='/tmp/qcf2-official-installer.zip');args=ap.parse_args();cache=Path(args.cache)
 raw=download(ARCHIVE,Path(args.archive));assert hashlib.sha256(raw).hexdigest()==SHA,'Original installer checksum mismatch';z=zipfile.ZipFile(io.BytesIO(raw))
 q=json.loads((ROOT/'assets/quran.json').read_text());indices={f'{s["id"]}:{v["id"]}':i for i,(s,v) in enumerate((s,v) for s in q for v in s['verses'])}
 out=ROOT/'assets/mushaf-phone-hafs';out.mkdir(exist_ok=True);ends={};starts={};pages=[]
 def fetch_chapter(chapter):
  result=[];part=1
  while True:
   url=f'https://api.quran.com/api/v4/verses/by_chapter/{chapter}?words=true&word_fields=code_v2,v2_page,line_v2,text_qpc_hafs&per_page=50&page={part}'
   data=json.loads(download(url,cache/f'chapter-{chapter:03}-{part}.json'));result.extend(data['verses'])
   if not data['pagination']['next_page']:return result
   part=data['pagination']['next_page']
 by_page={n:[] for n in range(1,605)};seen=set()
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  for chapter in pool.map(fetch_chapter,range(1,115)):
   for v in chapter:
    assert v['verse_key'] not in seen;seen.add(v['verse_key'])
    for n in sorted({w['v2_page'] for w in v['words']}):by_page[n].append(v)
 assert len(seen)==6236
 def fetch_layout(n):
  return n,json.loads(download(f'https://raw.githubusercontent.com/manaf/KFGQPC-Madinah-Mushaf/{LAYOUT_COMMIT}/data/pages/page-{n:03}.json',cache/f'layout-{n:03}.json'))
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  for n,layout in pool.map(fetch_layout,range(1,605)):
   a={'verses':by_page[n]}
   name=next(k for k in z.namelist() if k.endswith(f'QCF2{n:03}.ttf'));fontbytes=z.read(name);font=TTFont(io.BytesIO(fontbytes));glyphset=font.getGlyphSet();cmap=font.getBestCmap();order=font.getGlyphOrder();hfont=hb.Font(hb.Face(fontbytes));hb.ot_font_set_funcs(hfont)
   rowwords={};pageindices=[];codes=[]
   for v in a['verses']:
    i=indices[v['verse_key']]
    for w in v['words']:
     if w['v2_page']!=n:continue
     code=''.join(w['code_v2'].split());assert code and all(ord(c) in cmap for c in code),(n,v['verse_key'],code,'missing original glyph')
     rowwords.setdefault(w['line_v2'],[]).append((i,code,w['char_type_name']))
     starts.setdefault(i,n);pageindices.append(i);codes.append(code)
     if w['char_type_name']=='end':assert i not in ends,(n,i,'duplicate verse end');ends[i]=n
   rows=[]
   for line in layout['lines']:
    typ=line['type'];ln=line['line']
    if typ=='blank':continue
    if typ=='surah_name':assert ln not in rowwords;rows.append({'s':line['decor']['surah']});continue
    if typ=='basmallah':assert ln not in rowwords;rows.append({'b':1});continue
    words=rowwords.pop(ln);cursor=0;paths={};bounds=[]
    # Shape every native QCF word with its original OpenType tables. Keep the
    # shaped outlines intact; only place words and distribute complete rows.
    shaped=[]
    for i,code,kind in words:
     buf=hb.Buffer();buf.add_str(code);buf.direction='rtl';buf.script='arab';buf.language='ar';hb.shape(hfont,buf)
     assert all(g.codepoint for g in buf.glyph_infos),(n,i,'notdef')
     width=sum(p.x_advance for p in buf.glyph_positions);shaped.append((i,buf.glyph_infos,buf.glyph_positions,width))
    gap=font['head'].unitsPerEm*.16;total=sum(w for _,_,_,w in shaped)+gap*(len(shaped)-1);cursor=total
    for i,infos,positions,width in shaped:
     cursor-=width;x=cursor
     for info,pos in zip(infos,positions):
      glyph=order[info.codepoint];matrix=(1,0,0,-1,x+pos.x_offset,-pos.y_offset)
      pen=SVGPathPen(glyphset,ntos=lambda v:str(round(v,2)).rstrip('0').rstrip('.') if round(v,2)%1 else str(int(round(v,2))))
      glyphset[glyph].draw(TransformPen(pen,matrix));d=pen.getCommands()
      if d:
       paths.setdefault(i,[]).append(d);bp=BoundsPen(glyphset);glyphset[glyph].draw(TransformPen(bp,matrix));bounds.append(bp.bounds)
      x+=pos.x_advance
     cursor-=gap
    x0=min(b[0] for b in bounds)-30;y0=min(b[1] for b in bounds)-60;x1=max(b[2] for b in bounds)+30;y1=max(b[3] for b in bounds)+60
    rows.append({'box':[round(x0,2),round(y0,2),round(x1-x0,2),round(y1-y0,2)],'c':bool(line.get('centered')),'v':[[i,''.join(ds)] for i,ds in paths.items()]})
   assert not rowwords,(n,'unplaced original rows');assert pageindices
   common=max(r['box'][2] for r in rows if 'box' in r)
   for r in rows:
    if r.get('c'):r['box'][0]-=(common-r['box'][2])/2;r['box'][2]=common
   data={'page':n,'lines':rows};pack(out/f'{n:03}.json.gz',data)
   pages.append({'id':n,'start':min(pageindices),'end':max(pageindices)+1,'sha256':hashlib.sha256((out/f'{n:03}.json.gz').read_bytes()).hexdigest(),'fontSha256':hashlib.sha256(fontbytes).hexdigest(),'glyphSequenceSha256':hashlib.sha256(''.join(codes).encode()).hexdigest()})
   if n%50==0:print('Rendered verified native outline rows',n,flush=True)
 assert sorted(ends)==list(range(6236));assert sorted(starts)==list(range(6236));assert len(pages)==604
 manifest={'edition':'KFGQPC QCF2 Hafs 1421','sourceArchiveSha256':SHA,'layoutCommit':LAYOUT_COMMIT,'wordSource':'https://api.quran.com/api/v4/verses/by_chapter/{chapter}?words=true&word_fields=code_v2,v2_page,line_v2,text_qpc_hafs&per_page=50&page={part}','directory':'assets/mushaf-phone-hafs','cacheName':'aoqat-mushaf-phone-hafs','pages':pages,'versePages':[starts[i] for i in range(6236)],'verseEndPages':[ends[i] for i in range(6236)]}
 pack(ROOT/'assets/mushaf-phone-hafs.json.gz',manifest);(ROOT/'assets/mushaf-phone-hafs-ready.json').write_text(json.dumps({'pages':604,'verses':6236,'sourceArchiveSha256':SHA})+'\n');print('Verified 604 pages and all 6236 verse endings',flush=True)
if __name__=='__main__':main()
