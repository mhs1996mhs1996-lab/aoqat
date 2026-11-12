'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');

(async()=>{
  const server=spawn('python3',['-m','http.server','8873'],{stdio:'ignore'});
  let browser;
  try{
    await new Promise(resolve=>setTimeout(resolve,900));
    browser=await chromium.launch({
      executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
      args:['--no-sandbox','--disable-dev-shm-usage']
    });
    const page=await browser.newPage({
      viewport:{width:390,height:760},
      timezoneId:'Asia/Baghdad',
      serviceWorkers:'block'
    });
    await page.goto('http://127.0.0.1:8873/',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-drawer="alertSettings"]',{state:'attached'});
    await page.evaluate(()=>document.body.classList.add('design-menu-open'));
    await page.locator('[data-drawer="alertSettings"]').click();
    await page.locator('[data-alert-section="prayer"]').click();
    await page.locator('#adhanServicesDialog').waitFor({state:'visible'});
    const ad=page.locator('#adhanServicesBody');
    await ad.locator('.ad-section-toggle').first().waitFor({state:'visible'});
    await page.waitForTimeout(1400);
    console.log('HELP_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({
      helpApi:typeof window.aoqatOpenSettingsHelp,
      script:!!document.querySelector('script[src*="settings-help-live.js"]'),
      style:!!document.getElementById('aoqatWebHelpLiveStyle'),
      root:!!document.getElementById('adhanServicesBody'),
      toggles:document.querySelectorAll('#adhanServicesBody .ad-section-toggle').length,
      decorated:document.querySelectorAll('#adhanServicesBody .ad-section-toggle.aoqat-help-eligible').length,
      wrappers:document.querySelectorAll('#adhanServicesBody .aoqat-help-holder').length
    }))));
    await page.waitForFunction(()=>{const root=document.getElementById('adhanServicesBody');return root&&root.querySelectorAll('.ad-section-toggle.aoqat-help-eligible').length===root.querySelectorAll('.ad-section-toggle').length;},null,{timeout:2500});
    const initial=await ad.evaluate(el=>({
      wrappers:el.querySelectorAll('.aoqat-help-holder').length,
      orphans:el.querySelectorAll('.aoqat-help-badge').length,
      toggles:el.querySelectorAll('.ad-section-toggle').length,
      eligible:el.querySelectorAll('.ad-section-toggle.aoqat-help-eligible').length,
      maxScroll:el.scrollHeight
    }));
    assert.equal(initial.wrappers,0,'Never wrap adhan controls in new layout containers');
    assert.equal(initial.orphans,0,'No abandoned help circles');
    assert.ok(initial.toggles>2,'Original mode panels are still present');
    assert.equal(initial.eligible,initial.toggles,'Every original submenu toggle has one nonstructural help icon');
    assert.ok(initial.maxScroll<2600,'The unexpanded adhan view must not gain a blank multi-screen column');

    // Click the original action away from its help icon: it must still expand.
    const toggle=ad.locator('.ad-section-toggle').first();
    await toggle.click({position:{x:140,y:25}});
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    await toggle.click({position:{x:140,y:25}});
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');

    // Clicking the tiny circle opens a separate help page without changing
    // the action's aria-expanded state or adding DOM siblings around it.
    const box=await toggle.boundingBox();
    assert.ok(box&&box.width>180);
    await page.mouse.click(box.x+21,box.y+box.height/2);
    await page.locator('#aoqatHelpPage').waitFor({state:'visible'});
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    assert.equal(await ad.locator('.aoqat-help-holder').count(),0);
    await page.locator('#aoqatHelpPage .aoqat-help-back').click();

    // Updating the underlying adhan controls should never leave behind
    // help wrappers or duplicate assistance elements.
    for(let n=0;n<4;n++){
      await toggle.click({position:{x:140,y:25}});
      await toggle.click({position:{x:140,y:25}});
    }
    const after=await ad.evaluate(el=>({
      wrappers:el.querySelectorAll('.aoqat-help-holder').length,
      orphans:el.querySelectorAll('.aoqat-help-badge').length,
      high:el.scrollHeight
    }));
    assert.equal(after.wrappers,0);
    assert.equal(after.orphans,0);
    assert.ok(after.high<2600,'Adhan page cannot grow into blank space');

    const buttonStyle=await toggle.evaluate(button=>{
      const pseudo=getComputedStyle(button,'::before');
      const own=getComputedStyle(button);
      return {content:pseudo.content,color:pseudo.color,textColor:own.color,width:pseudo.width};
    });
    assert.ok(buttonStyle.content.includes('؟'));
    assert.equal(buttonStyle.width,'17px');
    assert.equal(buttonStyle.color,buttonStyle.textColor,'Help color follows current theme text color');
    await page.screenshot({path:'/tmp/aoqat-help-adhan-safe.png',fullPage:false});
    console.log('PASS: intact native adhan submenus, no orphan columns, 17px themed help, working help/back');
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1});
