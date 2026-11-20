'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
(async()=>{
  const server=spawn('python3',['-m','http.server','8803'],{stdio:'ignore'});
  let browser;
  try{
    await new Promise(r=>setTimeout(r,650));
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:390,height:780},serviceWorkers:'block'});
    const page=await context.newPage();
    await page.route('**/rest/**',route=>route.abort());
    await page.goto('http://127.0.0.1:8803/index.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.aoqatUIReady,{timeout:30000});
    await page.locator('#designSideMenuBtn').click();
    const menu=page.locator('#webDrawerMain');
    const order=await menu.locator('[data-drawer]').evaluateAll(nodes=>nodes.map(node=>node.dataset.drawer));
    assert.deepEqual(order.slice(-3),['contactWhatsApp','profile','privacyPolicy'],
      'Privacy is appended after the existing profile; neither item is relocated into design settings');
    assert.equal(await menu.locator('[data-drawer="profile"]').count(),1);
    assert.equal(await menu.locator('[data-drawer="privacyPolicy"]').count(),1);
    await page.locator('[data-drawer="settings"]').click();
    assert.equal(await page.locator('#aoqatOwnerProfileOpen').count(),0,
      'Profile must not be moved inside design settings');
    await page.locator('#webDrawerSub .web-back').click();
    const open=page.locator('[data-drawer="profile"]');
    assert.ok(await open.isVisible(),'Profile remains a main menu item');
    await open.click();
    assert.equal(await page.locator('#webSubTitle').innerText(),'الملف الشخصي');
    assert.match(await page.locator('#aoqatOwnerSeq4Result').innerText(),/لم تضغط/);
    const profile=page.locator('#aoqatOwnerSeq4Buttons');
    assert.equal(await profile.locator('button').count(),3);
    await profile.getByRole('button',{name:'✓ فحص وصول التحديث رقم 4'}).click();
    assert.match(await page.locator('#aoqatOwnerSeq4Result').innerText(),/نجح ظهور/);
    await profile.getByRole('button',{name:'+ زيادة عداد الاختبار'}).click();
    await profile.getByRole('button',{name:'+ زيادة عداد الاختبار'}).click();
    assert.match(await page.locator('#aoqatOwnerSeq4Result').innerText(),/عداد الاختبار فقط: 2/);
    await profile.getByRole('button',{name:/تصفير عداد الاختبار/}).click();
    assert.match(await page.locator('#aoqatOwnerSeq4Result').innerText(),/عداد الاختبار فقط: 0/);
    await page.locator('#webDrawerSub .web-back').click();
    assert.ok(await page.locator('[data-drawer="profile"]').isVisible(),
      'Back from profile must return to the main menu');
    const privacy=page.locator('[data-drawer="privacyPolicy"]');
    assert.equal(await privacy.count(),1);
    await context.setOffline(true);
    await privacy.click();
    assert.ok(await page.locator('#aoqatPrivacyPolicy').isVisible());
    assert.equal(await page.locator('#aoqatPrivacyPolicy section').count(),7);
    console.log('PASS: profile restored after WhatsApp in main menu; all 3 old test buttons and offline privacy preserved');
  }finally{
    if(browser)await browser.close();
    server.kill('SIGTERM');
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
