'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const PORT=8872;
const server=spawn('python3',['-m','http.server',String(PORT),'--directory','android-updates/owner-pilot/build-150/files'],{stdio:'ignore'});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>setTimeout(resolve,900));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:390,height:800},serviceWorkers:'block'});
  await context.addInitScript(()=>{
    // Only the owner pilot app has this bridge method; don't simulate native splash.
    window.AndroidNative={readOwnerPilotOtaState:()=>'{"lastSequence":21}'};
  });
  const page=await context.newPage();
  await page.route(/https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  await page.goto('http://127.0.0.1:'+PORT+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.aoqatUIReady===true&&document.body.classList.contains('aoqat-ready'),{timeout:30000});
  await page.locator('#aoqatPilotPrivacyWelcome').waitFor({state:'visible',timeout:15000});
  const modal=page.locator('#aoqatPilotPrivacyWelcome');
  assert.equal(await modal.getAttribute('aria-modal'),'true');
  assert.equal(await modal.locator('#aoqatPilotPrivacyWelcomeTitle').innerText(),'خصوصيتك تهمنا');
  assert.ok(await page.locator('#webExactDrawer').count(),'main app navigation remains mounted');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pilotPrivacyWelcomeSeenV1')),null,'not marked accepted merely by being displayed');
  // Existing policy is rendered offline and without an external request.
  await context.setOffline(true);
  await modal.locator('#aoqatPilotPrivacyRead').click();
  assert.equal(await modal.locator('.pilot-privacy-details section').count(),7);
  assert.ok(await modal.getByText('الإنترنت وخدمات الجهات الأخرى').isVisible());
  assert.equal(await page.evaluate(()=>localStorage.getItem('pilotPrivacyWelcomeSeenV1')),null,'reading policy is not consent');
  await modal.locator('#aoqatPilotPrivacyBack').click();
  assert.ok(await modal.locator('#aoqatPilotPrivacyContinue').isVisible());
  await modal.locator('#aoqatPilotPrivacyContinue').click();
  assert.equal(await modal.count(),0,'continue dismisses only privacy overlay');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pilotPrivacyWelcomeSeenV1')),'1');
  assert.ok(await page.locator('#webExactDrawer').count(),'app remains usable');
  await context.setOffline(false);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.aoqatUIReady===true,{timeout:30000});
  await page.waitForTimeout(4300);
  assert.equal(await page.locator('#aoqatPilotPrivacyWelcome').count(),0,'does not repeat after continuing');
  // No bridge means ordinary web/production style preview does not show pilot-only intro.
  const webContext=await browser.newContext({viewport:{width:390,height:800},serviceWorkers:'block'});
  const webPage=await webContext.newPage();
  await webPage.route(/https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  await webPage.goto('http://127.0.0.1:'+PORT+'/index.html',{waitUntil:'domcontentloaded'});
  await webPage.waitForFunction(()=>window.aoqatUIReady===true,{timeout:30000});
  await webPage.waitForTimeout(4300);
  assert.equal(await webPage.locator('#aoqatPilotPrivacyWelcome').count(),0,'web app unchanged');
  await webContext.close();
  await context.close();
  console.log('PASS: pilot only, after web-ready/native-splash boundary, offline policy (7 sections), continue, one-time, existing app intact');
 }finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
 }
})().catch(err=>{console.error(err);process.exitCode=1;});
