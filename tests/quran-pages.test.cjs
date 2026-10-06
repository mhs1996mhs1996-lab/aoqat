const fs=require('node:fs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const q=require('../assets/quran.json'),m=require('../assets/quran-pages.json');
test('604 canonical pages partition all 6236 unchanged verses in order',()=>{
 const verses=q.flatMap(s=>s.verses.map(v=>({s:s.id,a:v.id})));assert.equal(verses.length,6236);assert.equal(m.pages.length,604);assert.equal(m.juzs.length,30);
 let total=0;for(const [i,p]of m.pages.entries()){assert.equal(p.id,i+1);const end=m.pages[i+1]?.start||6236;assert.ok(end>p.start);total+=end-p.start;}assert.equal(total,6236);
 assert.deepEqual(m.pages.slice(0,3).map(p=>verses[p.start]),[{s:1,a:1},{s:2,a:1},{s:2,a:6}]);assert.deepEqual(verses[m.pages[603].start],{s:112,a:1});
 assert.deepEqual(verses[m.juzs[1].start],{s:2,a:142});assert.deepEqual(verses[m.juzs[29].start],{s:78,a:1});
});

 test('canonical line layout preserves every original verse word once on its page',()=>{
 const q=JSON.parse(fs.readFileSync('assets/quran.json')),m=JSON.parse(fs.readFileSync('assets/quran-pages.json')),v=q.flatMap(s=>s.verses),seen=v.map(()=>[]);
 assert.equal(m.lines.length,604);
 for(let p=0;p<604;p++)for(const line of m.lines[p])for(const [i,a,b] of line.v||[]){assert.ok(i>=m.pages[p].start&&i<(m.pages[p+1]?.start||6236));seen[i].push(...Array.from({length:b-a},(_,n)=>a+n));}
 for(let i=0;i<v.length;i++)assert.deepEqual(seen[i],v[i].text.split(/\s+/).map((_,n)=>n));
 });
