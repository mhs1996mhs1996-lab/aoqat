const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
(async()=>{
 const server=spawn('python3',['-m','http.server','8926'],{stdio:'ignore'});
 let browser;
 try {
  await new Promise(r=>setTimeout(r,1400));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,timezoneId:'Asia/Baghdad',serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/rest/**',r=>r.abort());
  await page.goto('http://127.0.0.1:8926/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.aoqatUIReady&&window.AoqatSettingsHelp&&document.querySelector('[data-drawer="adhanIqama"]'),null,{timeout:60000});
  await page.locator('#designSideMenuBtn').click();
  await page.locator('[data-drawer="adhanIqama"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#webSubBody .aqh-trigger').length>=3);
  const count=await page.locator('#webSubBody .aqh-trigger').count();
  assert.equal(count,3,'All three internal iqama/adhan buttons must have help marks');
  const circle=await page.locator('#webSubBody .aqh-dot').first().evaluate(e=>{
   const s=getComputedStyle(e);return {width:s.width,height:s.height,text:e.textContent,bg:s.backgroundColor,border:s.borderColor};
  });
  assert.equal(circle.width,'20px');
  assert.equal(circle.height,'20px');
  assert.equal(circle.text,'؟','Arabic punctuation, not Latin question mark');
  const original=page.locator('#webSubBody [data-panel="iqamaPanel"]');
  await original.locator('xpath=..').locator('.aqh-trigger').click();
  await page.waitForSelector('#aoqatHelpPage');
  assert.ok((await page.locator('#aoqatHelpPage .aqh-description').textContent()).includes('الأذان والإقامة'));
  assert.equal(await page.locator('.aoqat-help-info:visible').count(),0,'Old inline text must not return');
  await page.screenshot({path:'/tmp/aoqat-theme-help-page.png',fullPage:true});
  await page.locator('#aoqatHelpPage .aqh-back').click();
  assert.equal(await page.locator('#aoqatHelpPage').count(),0);
  assert.ok((await page.locator('#webSubTitle').textContent()).includes('الإقامة'));
  await page.screenshot({path:'/tmp/aoqat-theme-help-buttons.png',fullPage:true});
  // Check the dedicated button-theme preference, not just the app theme.
  const appSurface=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--wt-surface').trim());
  await page.evaluate(()=>{
    localStorage.setItem('aoqatWebButtonAppearanceV1',JSON.stringify({target:'buttons',theme:'white-lavender',style:'solid'}));
    window.applyWebTheme('white-lavender');
  });
  const lavender=await page.locator('#webSubBody .aqh-dot').first().evaluate(e=>getComputedStyle(e).borderColor);
  await page.evaluate(()=>window.applyWebTheme('cream-gold'));
  const gold=await page.locator('#webSubBody .aqh-dot').first().evaluate(e=>getComputedStyle(e).borderColor);
  assert.notEqual(lavender,gold,'Circle border must follow independently selected theme accent');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--wt-surface').trim()),appSurface,
    'Changing only button themes must never change the app surface');
  // The original button still opens its exact setting without triggering help.
  await page.locator('#webSubBody [data-panel="iqamaPanel"]').click();
  await page.waitForFunction(()=>document.querySelector('output[data-iqama="fajr"]'));
  assert.equal(await page.locator('#aoqatHelpPage').count(),0);
  await page.locator('#settingsContentDialog .web-back').click();
  await page.locator('#settingsContentDialog .web-back').click();
  await page.locator('[data-drawer="alertSettings"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#webSubBody [data-alert-section]').length===8);
  await page.waitForFunction(()=>document.querySelectorAll('#webSubBody .aqh-trigger').length>=8);
  assert.equal(await page.locator('#webSubBody [data-alert-section]').count(),8);
  await page.locator('#webSubBody [data-alert-section="azkar"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#webSubBody [data-alert-azkar]').length>=6);
  await page.waitForFunction(()=>document.querySelectorAll('#webSubBody .aqh-trigger').length>=6);
  await page.locator('#webSubBody [data-alert-azkar="salawat"]').locator('xpath=..').locator('.aqh-trigger').click();
  assert.ok((await page.locator('#aoqatHelpPage .aqh-description').textContent()).includes('الجمعة'));
  await page.locator('#aoqatHelpPage .aqh-back').click();
  assert.equal(await page.locator('#webSubTitle').textContent(),'تنبيهات الأذكار');
  const changed=await page.evaluate(()=>({
   dotSize:document.querySelector('.aqh-dot')&&getComputedStyle(document.querySelector('.aqh-dot')).width,
   originalButtons:document.querySelectorAll('#webSubBody [data-alert-azkar]').length,
   helperButtons:document.querySelectorAll('#webSubBody .aqh-trigger').length
  }));
  assert.equal(changed.originalButtons,7);
  assert.equal(changed.helperButtons>=7,true);
  console.log('PASS: 20px Arabic help icon; all nested settings; separate help page and back; icon follows theme; original buttons intact; '+JSON.stringify({count,circle,lavender,gold,changed,errors:errors.slice(0,3)}));
 } finally {await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
