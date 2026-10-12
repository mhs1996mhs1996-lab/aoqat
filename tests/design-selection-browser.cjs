const {chromium}=require('playwright'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
(async()=>{const server=spawn('python3',['-m','http.server','8785'],{stdio:'ignore'});let browser;try{
await new Promise(r=>setTimeout(r,500));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/rest/v1/annual_prayer_times**',r=>r.abort());await page.goto('http://127.0.0.1:8785',{waitUntil:'domcontentloaded'});
const ready=async()=>{await page.waitForFunction(()=>window.aoqatUIReady&&document.querySelectorAll('[data-unified-dot]').length===4);await page.waitForTimeout(1900);};await ready();
assert.equal(await page.locator('.design-visibility-btn.is-on').count(),4);assert.equal(await page.evaluate(()=>window.__prayerActiveDesignElement.id),'designRef');
await page.locator('[data-unified-dot="2"]').click();assert.equal(await page.evaluate(()=>localStorage.aoqatActiveDesignIdV1),'design3');
for(let i=0;i<3;i++){await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal(await page.evaluate(()=>window.__prayerActiveDesignElement.id),'design3');assert.equal(await page.locator('#design3').isVisible(),true);}
await page.evaluate(()=>document.querySelectorAll('.design-visibility-btn')[1].click());await page.waitForFunction(()=>document.querySelectorAll('[data-unified-dot]').length===3);
assert.equal(await page.evaluate(()=>window.__prayerActiveDesignElement.id),'design3');
await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.aoqatUIReady&&document.querySelectorAll('[data-unified-dot]').length===3);await page.waitForTimeout(1900);
assert.equal(await page.evaluate(()=>window.__prayerActiveDesignElement.id),'design3');assert.equal(await page.evaluate(()=>document.getElementById('design2').closest('.design-slide').dataset.designDisabled),'true');
assert.equal(await page.locator('.design-visibility-btn.is-on').count(),3);assert.deepEqual(errors,[]);console.log('Fresh installs show all four designs; selected design and per-design visibility survive repeated offline reopen');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});