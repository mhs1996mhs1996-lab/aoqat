const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const read=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));test('Responsive native source has 604 pages, all 6236 verses and verified page hashes',()=>{
 if(!fs.existsSync('assets/mushaf-phone-hafs-ready.json'))return;
 const m=read('assets/mushaf-phone-hafs.json.gz');assert.equal(m.sourceArchiveSha256,'077ee64d5bcb35bc6d07bca0b3a8faacd97add0c610b5ee72e0ccb3b457445a5');assert.equal(m.pages.length,604);assert.equal(m.versePages.length,6236);assert.equal(m.verseEndPages.length,6236);const seen=new Set();
 for(const p of m.pages){const path=`${m.directory}/${String(p.id).padStart(3,'0')}.json.gz`;assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),p.sha256);const data=read(path);assert.equal(data.page,p.id);assert.ok(data.lines.length>=8&&data.lines.length<=15);for(const row of data.lines)if(row.v){assert.ok(row.box[2]>0&&row.box[3]>0);for(const [i,d]of row.v){assert.ok(i>=0&&i<6236&&d.startsWith('M'));seen.add(i);assert.ok(p.id>=m.versePages[i]&&p.id<=m.verseEndPages[i]);}}}
 assert.equal(seen.size,6236);
});
