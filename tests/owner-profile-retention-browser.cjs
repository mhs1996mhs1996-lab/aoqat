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
    assert.equal(await page.locator('#aoqatOwnerSeq4Buttons').count(),0,
      'Old three OTA test buttons must be removed');
    assert.equal(await page.locator('#aoqatPersonalProfile').count(),1);
    assert.ok(await page.locator('#aoqatProfileDisplayName').isVisible());
    assert.match(await page.locator('#aoqatProfileDisplayName').innerText(),/مستخدم التطبيق/);
    assert.ok((await page.locator('#aoqatProfileCard').innerText()).includes('الحويجة وضواحيها'));
    const input=page.locator('#aoqatProfileNickname');
    await input.fill('  مستخدم الحويجة  ');
    await page.locator('#aoqatProfileSave').click();
    assert.match(await page.locator('#aoqatProfileSaveStatus').innerText(),/تم حفظ/);
    assert.equal(await page.locator('#aoqatProfileDisplayName').innerText(),'مستخدم الحويجة');
    assert.equal(await page.locator('#aoqatProfileAvatar').innerText(),'م');
    assert.equal(await page.evaluate(()=>localStorage.getItem('aoqatLocalProfileNameV1')),'مستخدم الحويجة');
    await page.locator('#webDrawerSub .web-back').click();
    await page.locator('[data-drawer="profile"]').click();
    assert.equal(await page.locator('#aoqatProfileDisplayName').innerText(),'مستخدم الحويجة',
      'Name must persist locally when reopening page');
    await page.locator('#aoqatProfileClear').click();
    assert.equal(await page.locator('#aoqatProfileDisplayName').innerText(),'مستخدم التطبيق');
    assert.equal(await page.evaluate(()=>localStorage.getItem('aoqatLocalProfileNameV1')),null);
    await page.locator('#aoqatProfilePrivacy').click();
    assert.equal(await page.locator('#aoqatPrivacyPolicy section').count(),7);
    await page.locator('#webDrawerSub .web-back').click();
    assert.ok(await page.locator('[data-drawer="profile"]').isVisible(),
      'Back from profile must return to the main menu');
    const privacy=page.locator('[data-drawer="privacyPolicy"]');
    assert.equal(await privacy.count(),1);
    await context.setOffline(true);
    await privacy.click();
    assert.ok(await page.locator('#aoqatPrivacyPolicy').isVisible());
    assert.equal(await page.locator('#aoqatPrivacyPolicy section').count(),7);
    console.log('PASS: main-menu profile, local nickname save/clear and offline privacy; old test buttons absent');
  }finally{
    if(browser)await browser.close();
    server.kill('SIGTERM');
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
