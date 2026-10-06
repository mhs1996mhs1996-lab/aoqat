const {chromium}=require('playwright'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
(async()=>{const server=spawn('python3',['-m','http.server','8771'],{stdio:'ignore'});let browser;try{
 await new Promise(r=>setTimeout(r,700));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8771',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>navigator.serviceWorker.controller);
 await page.evaluate(async()=>{const c=await caches.open('aoqat-pwa-v19');for(const path of ['/js/quran-reader.js','/assets/quran.json','/assets/quran-pages.json','/assets/fonts/uthmanic-hafs.woff2','/js/web-menu-order.js?v=22'])if(!await c.match(path))throw Error('Missing cached resource: '+path);});
 // First Quran visit and subsequent reload both work without any network.
 await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('[data-drawer="quran"]',{state:'attached'});await page.evaluate(()=>document.body.classList.add('design-menu-open'));await page.locator('[data-drawer="quran"]').click();
 await page.waitForSelector('#aqReader[data-page]');assert.equal(await page.locator('#aqReader').getAttribute('data-page'),'1');
 assert.equal(await page.locator('#adService .ad-card').count(),0);assert.equal(await page.locator('[data-qr-verse]').count(),7);
 await page.locator('[data-qr-panel="index"]').click();await page.locator('#aqJump').fill('604');await page.locator('#aqJumpForm button').click();assert.equal(await page.locator('#aqReader').getAttribute('data-page'),'604');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('[data-drawer="quran"]',{state:'attached'});await page.evaluate(()=>document.body.classList.add('design-menu-open'));await page.locator('[data-drawer="quran"]').click();await page.waitForSelector('#aqReader[data-page]');
 assert.equal(await page.locator('#aqReader').getAttribute('data-page'),'604');await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>[...document.fonts].some(f=>f.family==='AoqatQuran'&&f.status==='loaded')));
 assert.deepEqual(errors.filter(e=>!/fetch|network|offline/i.test(e)),[]);console.log('Quran opens directly on first offline visit, 604 pages and font cached, last page restored offline');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exit(1);});
