'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
(async()=>{
 const server=spawn('python3',['-m','http.server','8796'],{stdio:'ignore'});
 let browser;
 try{
  await new Promise(resolve=>setTimeout(resolve,600));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:780},serviceWorkers:'block'});
  const page=await context.newPage();
  await page.route('**/rest/**',route=>route.abort());
  await page.goto('http://127.0.0.1:8796/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.aoqatUIReady,{timeout:30000});
  await page.locator('#designSideMenuBtn').click();
  const policy=page.locator('[data-drawer="privacyPolicy"]');
  assert.equal(await policy.count(),1,'exactly one main-menu policy icon');
  assert.ok(await policy.isVisible(),'policy icon visible in main menu');
  assert.match(await policy.innerText(),/سياسة الخصوصية/);
  // Offline proof: after initial app loading, policy is an embedded view with no fetch.
  await context.setOffline(true);
  await policy.click();
  assert.equal(await page.locator('#webSubTitle').innerText(),'سياسة الخصوصية');
  const panel=page.locator('#aoqatPrivacyPolicy');
  assert.ok(await panel.isVisible(),'full privacy text visible while offline');
  assert.equal(await panel.locator('section').count(),7,'all policy sections visible');
  for(const heading of ['ما الذي يحتفظ به التطبيق على الجهاز؟','الموقع والاتجاه إلى القبلة','الإنترنت وخدمات الجهات الأخرى','أذونات الهاتف','خياراتك وطلبات الحذف']){
   assert.ok(await panel.getByRole('heading',{name:heading}).isVisible(),heading);
  }
  await page.locator('#webDrawerSub .web-back').click();
  assert.ok(await policy.isVisible(),'back returns to main menu');
  assert.equal(await page.locator('#aoqatPrivacySettings').count(),0,'no duplicate shortcut');
  console.log('PASS: single privacy icon, 7 full sections offline, back navigation works');
 }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1});
