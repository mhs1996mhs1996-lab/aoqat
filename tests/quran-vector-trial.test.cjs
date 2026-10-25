const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/quran-reader.js','utf8');
function reader(saved){
 const requests=[],storage={value:JSON.stringify(saved)};
 const context={window:{},document:{body:{},head:{appendChild(){}},createElement(){return {}; }},MutationObserver:class{observe(){}},localStorage:{getItem(){return storage.value},setItem(k,v){storage.value=v}},Response,Blob,DecompressionStream,TextDecoder,
 fetch:async path=>{requests.push(path);assert.ok(!/mushaf-hafs-(pocket|1441)|qcf-preview/.test(path),'new reader must not request old edition');try{return new Response(fs.readFileSync(path));}catch{return new Response('',{status:404})}}};
 vm.createContext(context);vm.runInContext(source.replace('  // Load the packaged text before', '  window.testReader={load,phonePage,pageHTML,pageOf,save,getState:()=>state};\n  // Load the packaged text before'),context);
 return {api:context.window.testReader,requests,storage};
}
test('vector trial opens independently of old images and retains personal data',async()=>{
 const saved={page:499,phoneRevision:1,theme:'ivory',font:66,fontCustomized:true,readingRevision:4,bookmarks:[{i:6100,page:599,color:'green',purpose:'حفظ',quick:true}],notes:[{i:6100,text:'مراجعة'}],days:{'2026-10-25':[499]}};
 const {api,requests,storage}=reader(saved);await api.load();await api.phonePage(499);
 assert.equal(api.getState().page,499);assert.equal(api.getState().theme,'ivory');assert.equal(api.getState().font,66);
 assert.match(api.pageHTML(499),/aq-native-line/);assert.doesNotMatch(api.pageHTML(499),/aq-original-art|<image/);
 api.save();const result=JSON.parse(storage.value);for(const key of ['bookmarks','notes','days'])assert.deepEqual(result[key],saved[key]);
 assert.ok(requests.includes('assets/mushaf-phone-hafs/499.json.gz'));assert.ok(api.pageOf(6100)>=1);
});
test('offline shell installs only the selected Quran edition',()=>{
 const sw=fs.readFileSync('sw.js','utf8'),shell=sw.slice(sw.indexOf('const APP_SHELL'),sw.indexOf('const PUSH_ACTION_URL'));
 assert.match(shell,/mushaf-phone-hafs\/001.json.gz/);assert.match(shell,/mushaf-phone-hafs\/604.json.gz/);assert.doesNotMatch(shell,/mushaf-hafs-pocket|mushaf-hafs-1441|qcf-preview/);
});

test('deployed page bypasses an older cached Quran reader',()=>{
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 const src=html.match(/<script src="(js\/quran-reader\.js[^"]*)"/)[1];
 assert.ok(src.includes('?v='));
 assert.ok(sw.includes('"/'+src+'"'),'offline shell must cache the same version requested by the page');
});
