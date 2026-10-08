const fs=require('node:fs'),zlib=require('node:zlib'),{test}=require('node:test'),assert=require('node:assert/strict');
const q=require('../assets/quran.json'),m=require('../assets/quran-pages.json'),o=JSON.parse(zlib.gunzipSync(fs.readFileSync('assets/mushaf-hafs-1441.json.gz'))),v=q.flatMap(s=>s.verses.map(a=>({s:s.id,a:a.id})));
test('original 604-page hit regions match every unchanged verse on its canonical page',()=>{
 assert.equal(o.sourceArchiveSha256,'280c5d71ca16aaeeb3a343be1b92c76fa6df71d0671e202c026fde12402d9eef');assert.equal(o.pages.length,604);const all=[];
 for(const [i,p]of o.pages.entries()){assert.equal(p.id,i+1);assert.ok(p.width>300&&p.height>500);assert.match(p.hitTransform,/^matrix\(/);all.push(...p.hits);if(fs.existsSync('assets/mushaf-hafs-1441-ready.json'))assert.ok(fs.statSync(`assets/mushaf-hafs-1441/${String(p.id).padStart(3,'0')}.webp`).size>10000);}
 assert.equal(all.length,6236);assert.deepEqual(all.map(h=>({s:h.surahNumber,a:h.ayahNumber})),v);assert.deepEqual(o.pages[119].hits.map(h=>h.ayahNumber),[71,72,73,74,75,76,77]);
});
