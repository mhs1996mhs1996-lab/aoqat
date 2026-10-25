// Trial-only regression guard: do not change production reader until approved.
const fs=require('node:fs'),assert=require('node:assert/strict'),{test}=require('node:test');
const paths=['assets/MUSHAF-SOURCES.md','assets/QURAN-READER-SOURCES.md','assets/mushaf-hafs-pocket-ready.json','scripts/render-pocket-hafs.py','scripts/render-responsive-hafs.py','tests/quran-responsive-browser.cjs'];
test('official page sources and independent responsive reader tests remain present',()=>{
 for(const p of paths)assert.ok(fs.existsSync(p),p+' missing');
 const ready=JSON.parse(fs.readFileSync('assets/mushaf-hafs-pocket-ready.json','utf8'));
 assert.equal(ready.pages,604);
 assert.equal(ready.pdfSha256,'70eba3d516823d54a9b001672c00a0403a25df937d52fe0a38731b915825aee4');
 const browserTest=fs.readFileSync('tests/quran-responsive-browser.cjs','utf8');
 for(const expected of ['qcf2-phone','aoqatQuranReaderV1','aqQuickSave','aqJump','aqTheme','data-qr-verse'])assert.ok(browserTest.includes(expected),'Missing reader test: '+expected);
});
