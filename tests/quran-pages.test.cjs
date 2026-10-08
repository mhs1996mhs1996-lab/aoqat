const fs=require('node:fs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const q=require('../assets/quran.json'),m=require('../assets/quran-pages.json');
test('all 114 surah headings occur exactly once before their own first verse',()=>{
 const verses=q.flatMap(s=>s.verses.map(v=>({s:s.id,a:v.id}))),lines=m.lines.flat(),headings=[];
 for(let k=0;k<lines.length;k++)if(lines[k].s){
  const next=lines.slice(k+1).find(l=>l.v?.length);
  assert.ok(next,'heading must have following text');
  assert.deepEqual(verses[next.v[0][0]],{s:lines[k].s,a:1},'heading '+lines[k].s);
  assert.equal(next.v[0][1],0);headings.push(lines[k].s);
 }
 assert.deepEqual(headings,Array.from({length:114},(_,i)=>i+1));
 for(const s of q){
  const i=verses.findIndex(v=>v.s===s.id&&v.a===1),k=lines.findIndex(l=>l.v?.some(([j,a])=>j===i&&a===0));
  const prefix=[];for(let j=k-1;j>=0&&!lines[j].v;j--)prefix.unshift(lines[j]);
  assert.deepEqual(prefix.filter(l=>l.s).map(l=>l.s),[s.id]);
  assert.equal(prefix.filter(l=>l.b).length,s.id===1||s.id===9?0:1);
 }
 assert.deepEqual(m.lines[497].at(-1),{s:45});
 assert.equal(verses[m.pages[498].start].s,45);
});
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
