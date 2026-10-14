const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs');
module.exports=async function(){
 let phase=1,browser;const source=fs.readFileSync('sw.js','utf8');
 const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/sw.js'){res.setHeader('Content-Type','application/javascript');res.end(source.replace(/const CACHE_NAME = "[^"]+"/,'const CACHE_NAME = "aoqat-pwa-upgrade-test-'+phase+'"').replace(/const APP_SHELL = \[[\s\S]*?\];/,'const APP_SHELL = ["/","/index.html"];'));return;}
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><p id="version">'+phase+'</p>');
 });
 await new Promise(r=>server.listen(8779,'127.0.0.1',r));
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const context=await browser.newContext(),page=await context.newPage();
  await page.goto('http://127.0.0.1:8779/');
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await page.evaluate(async()=>{localStorage.setItem('aoqatActiveDesignIdV1','design3');localStorage.setItem('aoqatDhikrProgressV1','saved');await caches.open('aoqat-mushaf-phone-hafs');});
  phase=2;await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
  await page.waitForFunction(()=>document.querySelector('#version')?.textContent==='2');
  assert.equal(await page.evaluate(()=>localStorage.aoqatActiveDesignIdV1),'design3');
  assert.equal(await page.evaluate(()=>localStorage.aoqatDhikrProgressV1),'saved');
  const keys=await page.evaluate(()=>caches.keys());assert.ok(keys.includes('aoqat-mushaf-phone-hafs'));assert.ok(!keys.includes('aoqat-pwa-upgrade-test-1'));
  await context.setOffline(true);await page.reload();assert.equal(await page.locator('#version').textContent(),'2');
  console.log('Installed web upgrade refreshes old document once, preserves preferences/Quran cache and works offline');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
};
