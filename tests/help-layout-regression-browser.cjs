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
    await page.waitForTimeout(450);
    const initial=await ad.evaluate(el=>({
      wrappers:el.querySelectorAll('.aoqat-help-holder').length,
      orphanBadges:el.querySelectorAll('.aoqat-help-badge').length,
      injectedIcons:el.querySelectorAll('.aoqat-help-eligible').length,
      sectionCount:el.querySelectorAll('.ad-section-toggle').length,
      contentHeight:el.scrollHeight,
      originalButtons:[...el.querySelectorAll('.ad-section-toggle')].every(b=>b.parentElement?.classList.contains('aoqat-help-holder')===false)
    }));
    assert.equal(initial.wrappers,0,'Broken help wrappers must no longer be rendered');
    assert.equal(initial.orphanBadges,0,'No detached help icons may remain in the prayer screen');
    assert.ok(initial.injectedIcons>=3,'Help icons use non-reparenting CSS on the original prayer buttons');
    assert.ok(initial.sectionCount>=3,'Prayer options remain intact');
    assert.equal(initial.originalButtons,true,'Original buttons stay in their original parents');
    assert.ok(initial.contentHeight<2600,'No oversized empty column in the collapsed prayer options');
    // Compare real pixel rectangles: original navigation arrows and the
    // Arabic help circles must never occupy the same screen space.
    const chevrons=await ad.evaluate(root=>[...root.querySelectorAll('#paAlertMenu > button.ad-section-toggle.aoqat-help-with-chevron')].map(button=>{
      const arrow=button.lastElementChild;
      const box=button.getBoundingClientRect(),arrowBox=arrow.getBoundingClientRect();
      const pseudo=getComputedStyle(button,'::before');
      return {text:button.textContent.trim().slice(0,50),
        circleRight:box.left+parseFloat(pseudo.left)+parseFloat(pseudo.width),
        arrowLeft:arrowBox.left,
        circleSize:parseFloat(pseudo.width),
        paddingLeft:parseFloat(getComputedStyle(button).paddingLeft)};
    }));
    assert.ok(chevrons.length>=2,'Method and Friday arrows must be recognized');
    for(const entry of chevrons){
      assert.ok(entry.arrowLeft>=entry.circleRight+7,
        'Help circle collided with navigation chevron: '+JSON.stringify(entry));
      assert.equal(entry.circleSize,20);
    }


    // The first button opens a full-screen leaf; its own back button
    // closes the leaf. It is not designed as a second-click toggle.
    const toggle=ad.locator('#paMethodOpen');
    await toggle.click({position:{x:140,y:25}});
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    await page.locator('#paMethodPanel > header button').click();
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');

    // The genuine prayer method still opens normally; help belongs to
    // eligible section headings, and must NOT wrap or relocate any buttons.
    const heading=ad.locator('.ad-section-toggle.aoqat-help-eligible').first();
    const style=await heading.evaluate(button=>{
      const pseudo=getComputedStyle(button,'::before');
      return {size:pseudo.width,content:pseudo.content,position:pseudo.position,
        height:button.getBoundingClientRect().height};
    });
    assert.equal(style.size,'20px','Help circle is legible without shifting the original controls');
    assert.equal(style.position,'absolute');
    assert.ok(style.content.includes('؟'));
    await heading.click({position:{x:20,y:25}});
    await page.locator('#aoqatHelpPage').waitFor({state:'visible'});
    assert.ok((await page.locator('#aoqatHelpPage .aoqat-help-description').textContent()).length>5);
    await page.locator('#aoqatHelpPage .aoqat-help-back').click();
    assert.equal(await page.locator('#aoqatHelpPage').count(),0);
    for(let n=0;n<4;n++){
      await toggle.click({position:{x:140,y:25}});
      await page.locator('#paMethodPanel > header button').click();
    }
    // Regression: never allow adding a visible wrapper below each control.
    const final=await ad.evaluate(el=>({
      wrappers:el.querySelectorAll('.aoqat-help-holder').length,
      orphanBadges:el.querySelectorAll('.aoqat-help-badge').length,
      contentHeight:el.scrollHeight
    }));
    assert.equal(final.wrappers,0);
    assert.equal(final.orphanBadges,0);
    assert.equal(await ad.locator('.aoqat-help-eligible').count(),initial.injectedIcons);
    assert.ok(final.contentHeight<2600);
    await page.screenshot({path:'/tmp/aoqat-help-adhan-safe.png',fullPage:false});
    // Inspect the compact interface menu from the same mobile viewport.
    // Earlier the title was auto-pushed left underneath the help circle.
    await page.evaluate(()=>{
      document.getElementById('adhanServicesBack')?.click();
      window.AoqatWebSettingsNavigation.drawer('settings');
      window.AoqatWebSettingsNavigation.panel('backgroundPanel','واجهة البرنامج');
    });
    await page.locator('#webInterfaceMenu [data-interface-page="elements"].aoqat-help-eligible')
      .waitFor({state:'visible'});
    const interfaceGeometry=await page.locator('#webInterfaceMenu [data-interface-page="elements"]').evaluate(button=>{
      const title=button.querySelector('span:last-child').getBoundingClientRect();
      const box=button.getBoundingClientRect();
      const style=getComputedStyle(button,'::before');
      return {textLeft:title.left,textRight:title.right,
        circleRight:box.left+parseFloat(style.left)+parseFloat(style.width),
        width:box.width,fontSize:getComputedStyle(button).fontSize,
        circleSize:parseFloat(style.width)};
    });
    assert.ok(interfaceGeometry.textLeft>=interfaceGeometry.circleRight+8,
      'Interface title overlaps its help circle: '+JSON.stringify(interfaceGeometry));
    assert.equal(interfaceGeometry.circleSize,20);
    const interfaceTitle=page.locator('#webInterfaceMenu [data-interface-page="elements"]');
    await interfaceTitle.click({position:{x:23,y:24}});
    await page.locator('#aoqatHelpPage').waitFor({state:'visible'});
    await page.locator('#aoqatHelpPage .aoqat-help-back').click();
    assert.equal(await page.locator('#aoqatHelpPage').count(),0);
    // The original button still opens its existing settings without reparenting.
    await interfaceTitle.click({position:{x:180,y:24}});
    await page.locator('#webInterfacePage').waitFor({state:'visible'});

    console.log('PASS: mobile prayer arrows and interface titles clear the themed help circle; original menus and page layout remain intact');
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1});
