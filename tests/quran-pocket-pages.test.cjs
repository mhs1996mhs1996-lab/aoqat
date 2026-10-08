const fs=require('node:fs'),zlib=require('node:zlib'),{test}=require('node:test'),assert=require('node:assert/strict');
const load=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));
const o=load('assets/mushaf-hafs-1441.json.gz'),p=load('assets/mushaf-hafs-pocket.json.gz');
test('all 604 pocket publication pages retain the original complete ayah sequence and registered calligraphy',()=>{
 assert.equal(p.sourcePdfSha256,'70eba3d516823d54a9b001672c00a0403a25df937d52fe0a38731b915825aee4');assert.equal(p.pages.length,604);
 for(const [i,page] of p.pages.entries()){
  assert.equal(page.id,i+1);assert.deepEqual(page.hits,o.pages[i].hits);assert.ok(page.registration.matches>=100);assert.ok(page.registration.oldInkCoverage>=.9);if(i>1)assert.ok(page.registration.newInkCoverage>=.85);
  assert.match(page.hitTransform,/^matrix\(/);assert.ok(page.width>280&&page.height>410);
  const [x,y,w,h]=page.displayBox;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=page.width+.002&&y+h<=page.height+.002);
  assert.ok(fs.statSync(`${p.imageDirectory}/${String(page.id).padStart(3,'0')}.webp`).size>10000);
 }
 assert.equal(p.pages.flatMap(page=>page.hits).length,6236);
});
