const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn('python3',['-m','http.server','8973'],{stdio:'ignore'});
 let browser;
 try{
  await new Promise(r=>setTimeout(r,800));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:780},serviceWorkers:'block'});
  await page.route('**/rest/**',route=>route.abort());
  await page.goto('http://127.0.0.1:8973',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.AoqatHelpSupport&&!!document.querySelector('#webDrawerMain'),{timeout:40000});
  await page.locator('#designSideMenuBtn').click();
  const entry=page.locator('#webDrawerMain [data-drawer="helpSupport"]');
  assert.equal(await entry.count(),1,'Exactly one help entry in the main settings drawer');
  await page.waitForFunction(()=>document.body.classList.contains('design-menu-open'));
  const info=await entry.evaluate(e=>{const main=document.getElementById('webDrawerMain');const c=getComputedStyle(e);const rect=e.getBoundingClientRect();return{row:rect.toJSON(),display:c.display,visibility:c.visibility,mainDisplay:getComputedStyle(main).display,mainScroll:main.scrollTop,mainRect:main.getBoundingClientRect().toJSON(),bodyClass:document.body.className,parent:e.parentElement?.id};});
  console.log('HELP_MENU_DIAGNOSTICS',JSON.stringify(info));
  // Match the real scrollable settings drawer: users can reach the item even
  // when the host UI initially paints outside the viewport.
  await entry.scrollIntoViewIfNeeded({timeout:7000});
  assert.equal(await entry.isVisible(),true,'Help must be reachable after scrolling into view');
  assert.equal(await entry.textContent().then(x=>x.includes('المساعدة والتواصل')),true);
  assert.equal(await entry.evaluate(e=>e.parentElement.children[1]===e),true,'Help should be the second visible menu row');
  await entry.click();
  assert.equal(await page.locator('#webSubTitle').textContent(),'المساعدة والتواصل');
  assert.equal(await page.locator('#webSubBody .ah-nav-row').count(),2,'Home must contain real styled guide and contact buttons');
  assert.equal(await page.locator('#webSubBody .ah-hero').count(),1,'A clear ivory/gold introduction is shown');
  await page.locator('#webSubBody button').filter({hasText:'شرح استخدام التطبيق'}).click();
  assert.equal(await page.locator('#webSubTitle').textContent(),'شرح استخدام التطبيق');
  assert.equal(await page.locator('#webSubBody details.ah-section').count(),9);
  assert.equal(await page.locator('#webSubBody details .ah-icon').count(),9,'Each guide has a visible app-like icon');
  const first=page.locator('#webSubBody details').first();
  await first.locator('summary').click();
  assert.equal(await first.evaluate(el=>el.open),true);
  assert.equal(await first.locator('.ah-step').count(),3,'A concise numbered guide appears under each topic');
  assert.ok((await first.textContent()).includes('الحويجة'));
  assert.ok((await first.locator('.ah-example').textContent()).includes('بيانات التاريخ و الصلاة'),'Button illustration uses the real menu name');
  const fourth=page.locator('#webSubBody details').nth(3);
  await fourth.locator('summary').click();
  assert.ok((await fourth.textContent()).includes('باقي على الإقامة'));
  assert.ok((await fourth.textContent()).includes('عدم الإزعاج'));
  assert.equal(await page.locator('#webSubBody .ah-example button').count(),0,'Illustrations are never inert buttons');
  const overflows=await page.locator('#webSubBody .aoqat-help').evaluate(el=>({
    content:el.scrollWidth,view:el.clientWidth
  }));
  assert.ok(overflows.content<=overflows.view+2,'Guide must have no sideways overflow on 390px Android screen');
  await page.locator('#settingsContentDialog .web-back').click();
  assert.equal(await page.locator('#webSubTitle').textContent(),'المساعدة والتواصل');
  await page.locator('#webSubBody button').filter({hasText:'تواصل معنا عبر واتساب'}).click();
  assert.equal(await page.locator('#webSubTitle').textContent(),'تواصل معنا');
  assert.ok((await page.locator('#webSubBody .ah-contact-number').textContent()).includes('964 785 799 4000'));
  const contact=page.locator('#webSubBody .ah-button');
  assert.equal(await contact.isDisabled(),false,'New WhatsApp number must enable support');
  await page.evaluate(()=>{window.AndroidNative={openSupportWhatsApp:url=>window.testWhatsappUrl=url};});
  await contact.click();
  const opened=await page.evaluate(()=>window.testWhatsappUrl);
  assert.equal(new URL(opened).origin,'https://wa.me');
  assert.equal(new URL(opened).pathname,'/9647857994000');
  assert.ok(new URL(opened).searchParams.get('text').includes('أوقات الصلاة في الحويجة'));
  assert.equal(opened.includes('9647832764696'),false,'Old support number never opens');
  await page.locator('#settingsContentDialog .web-back').click();
  assert.equal(await page.locator('#webSubTitle').textContent(),'المساعدة والتواصل');
  await page.locator('#settingsContentDialog .web-back').click();
  assert.equal(await page.locator('#settingsContentDialog').isVisible(),false);
  assert.equal(await entry.isVisible(),true,'Help remains visible after returning');
  await page.locator('[data-drawer="settings"]').click();
  assert.equal(await page.locator('#webSettingsTemp').getByText('المساعدة والتواصل').count(),0,'Never bury help in nested design settings');
  await page.locator('#settingsContentDialog .web-back').click();
  console.log('PASS: redesigned help second in menu, 9 app-like guides, mobile fit, back navigation, new WhatsApp URL');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});