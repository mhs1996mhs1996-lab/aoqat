'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
(async()=>{
  const server=spawn('python3',['-m','http.server','8833'],{stdio:'ignore'});
  let browser;
  try{
    await new Promise(resolve=>setTimeout(resolve,800));
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/rest/**',route=>route.abort());
    await page.goto('http://127.0.0.1:8833/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.aoqatUIReady);
    await page.locator('#designSideMenuBtn').click();
    await page.locator('[data-drawer="settings"]').click();
    const css=async locator=>locator.evaluate(el=>{
      const s=getComputedStyle(el);
      return {background:s.backgroundImage,color:s.color,border:s.borderTopColor};
    });
    const examples=['cream-gold','white-teal','dark-night','soft-rose'];
    for(const theme of examples){
      await page.evaluate(theme=>window.applyWebTheme(theme),theme);
      await page.waitForFunction(theme=>document.body.dataset.webTheme===theme,theme);
      const design=[];
      const designButtons=page.locator('#webSettingsTemp>button.main-action');
      assert.ok(await designButtons.count()>=2,'Design settings must still show original actions');
      for(let i=0;i<2;i++)design.push(await css(designButtons.nth(i)));
      await page.locator('[data-panel="backgroundPanel"]').click();
      const buttons=page.locator('#webInterfaceMenu>button.main-action');
      assert.equal(await buttons.count(),3,'The three interface actions are untouched');
      for(let i=0;i<2;i++){
        const actual=await css(buttons.nth(i));
        assert.deepEqual(actual,design[i],theme+' interface action '+i+' must exactly match design settings palette');
      }
      const badge=await buttons.first().evaluate(button=>{
        const buttonStyle=getComputedStyle(button);
        const pseudo=getComputedStyle(button,'::before');
        const label=button.querySelector('span:last-child')?.getBoundingClientRect();
        const rect=button.getBoundingClientRect();
        return {
          colorMatches:pseudo.color===buttonStyle.color,
          circleSize:parseFloat(pseudo.width),
          clearOfTitle:label.left >= rect.left+parseFloat(pseudo.left)+parseFloat(pseudo.width)+7
        };
      });
      assert.equal(badge.colorMatches,true,'Help indicator must inherit current text/contrast color');
      assert.equal(badge.circleSize,20);
      assert.equal(badge.clearOfTitle,true,'Help must not overlap the interface label');
      if(theme==='cream-gold')await page.screenshot({path:'/tmp/aoqat-interface-buttons-theme-gold.png'});
      await page.locator('#webInterfaceMenu [data-interface-page="elements"]').click({position:{x:190,y:22}});
      assert.equal(await page.locator('#webSubTitle').textContent(),'إظهار عناصر واجهة البرنامج');
      await page.locator('.web-back').click();
      await page.locator('.web-back').click();
    }
    assert.deepEqual(errors,[],'No JavaScript exceptions while changing themes');
    console.log('PASS: all three interface buttons share the unchanged design-settings theme across gold, teal, dark and rose, with readable help and working navigation.');
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
