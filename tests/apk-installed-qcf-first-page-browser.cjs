const {chromium}=require('playwright');
const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),zlib=require('node:zlib');
const assert=require('node:assert/strict');
(async()=>{
 const apk=path.resolve('android-native/app/build/outputs/apk/debug/app-debug.apk');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aq-qcf-apk-'));
 let server,browser;
 try{
  execFileSync('unzip',['-q',apk,'assets/www/*','-d',tmp]);
  const root=path.join(tmp,'assets/www');
  const text=p=>fs.readFileSync(path.join(root,p),'utf8');
  const decode=p=>zlib.gunzipSync(fs.readFileSync(path.join(root,p))).toString('utf8');
  const assets={
   'quran.json':text('assets/quran.json'),
   'quran-pages.json':text('assets/quran-pages.json'),
   'mushaf-phone-hafs.json.gz':decode('assets/mushaf-phone-hafs.json.gz.bin'),
   'qcf604-web-verse-layouts.json.gz':decode('experiments/qcf604-web-verse-layouts.json.gz.bin')
  };
  for(const [name,body] of Object.entries(assets)) assert.ok(body.length>50,'Missing native Quran data '+name);
  server=spawn('python3',['-m','http.server','8796'],{cwd:root,stdio:'ignore'});
  await new Promise(r=>setTimeout(r,700));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(assetData=>{
    window.AndroidNative={
      configureAdhan:()=>{},
      readQuranAsset:name=>assetData[name]??'null',
      readPrayerRows:()=> '[]',
      readIqamaAppearance:()=> 'transparent',
      readAdhanSettings:()=> '{}'
    };
  },assets);
  await page.route('**/*',route=>{
    const u=new URL(route.request().url());
    return (u.hostname==='127.0.0.1' || u.hostname==='localhost')?route.continue():route.abort();
  });
  await page.goto('http://127.0.0.1:8796/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.aoqatUIReady,{timeout:30000});
  await page.waitForSelector('[data-drawer="quran"]',{timeout:30000});
  await page.evaluate(()=>document.body.classList.add('design-menu-open'));
  await page.locator('[data-drawer="quran"]').click();
  await page.waitForFunction(()=>document.querySelector('#aqReader')?.dataset.ready==='true',{timeout:45000});
  assert.equal(await page.locator('#aqReader').getAttribute('data-edition'),'qcf2-font');
  assert.ok(await page.locator('.aq-qcf-line').count()>0,'No Quran QCF rows');
  assert.ok(await page.locator('#adVerses').innerText().then(x=>!x.includes('تعذر فتح ملفات المصحف')),'User-reported Quran failure');
  assert.equal(await page.locator('#aqRenderingMode').count(),0,'Old edition selector must be absent');
  assert.equal(await page.locator('#aqTheme').count(),0,'Settings only after open');
  await page.locator('[data-qr-panel="settings"]').click();
  assert.equal(await page.locator('#aqTheme').count(),1,'Preserve Quran appearance');
  assert.deepEqual(errors.filter(x=>/Cannot read|TypeError|ReferenceError/.test(x)),[]);
  console.log('VERIFIED installed APK opens actual QCF Quran page 1, no network, no SVG dropdown');
 }finally{await browser?.close();server?.kill();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(err=>{console.error(err);process.exitCode=1});
