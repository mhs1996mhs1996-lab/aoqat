'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
(async()=>{
 const server=spawn('python3',['-m','http.server','8897'],{stdio:'ignore'});
 let browser;
 try{
   await new Promise(resolve=>setTimeout(resolve,900));
   browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
     args:['--no-sandbox','--disable-dev-shm-usage']});
   const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Baghdad',serviceWorkers:'block'});
   page.on('pageerror',e=>console.error('BROWSER:',e.message));
   await page.goto('http://127.0.0.1:8897/',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('[data-drawer="alertSettings"]',{state:'attached'});
   await page.evaluate(()=>document.body.classList.add('design-menu-open'));
   await page.locator('[data-drawer="alertSettings"]').click();
   assert.equal(await page.locator('#aoqatAlertSettings [data-alert-section="iqama"]').count(),0,
     'Iqama must not be duplicated in the top-level alert menu');
   const topLevel=await page.locator('#aoqatAlertSettings [data-alert-section]').count();
   assert.equal(topLevel,7,'Unrelated alert categories must remain unchanged');
   await page.locator('#aoqatAlertSettings [data-alert-section="prayer"]').click();
   await page.locator('#adhanServicesDialog').waitFor({state:'visible'});
   await page.locator('#paIqamaNotificationOpen').waitFor({state:'visible'});
   assert.equal(await page.locator('#paIqamaNotificationOpen').count(),1,'Exactly one iqama entry is allowed');
   const order=await page.locator('#paAlertMenu > button').evaluateAll(items=>items.map(x=>x.id));
   assert.ok(order.indexOf('paMethodOpen')>=0&&order.indexOf('paIqamaNotificationOpen')>order.indexOf('paMethodOpen'),
     'Iqama must follow the original prayer method in the same panel: '+JSON.stringify(order));
   const help=page.locator('#adAudibilityHelp');
   await help.waitFor({state:'visible'});
   const circle=await help.evaluate(el=>{
      const glyph=el.querySelector('.ad-audibility-help-circle');
      const style=getComputedStyle(glyph),outer=getComputedStyle(el);
      return {size:parseFloat(style.width),round:style.borderRadius,buttonBackground:outer.backgroundColor,
              inPanel:!!el.closest('#adAudibility')};
   });
   assert.equal(circle.size,20,'Audibility help circle must be the same 20px size as other help circles');
   assert.ok(circle.round==='50%'||parseFloat(circle.round)>=10,'Question-mark glyph must be circular');
   assert.equal(circle.inPanel,true);
   await help.click();
   await page.locator('#aoqatHelpPage').waitFor({state:'visible'});
   await page.locator('#aoqatHelpPage .aoqat-help-back').click();
   assert.equal(await page.locator('#aoqatHelpPage').count(),0);
   await page.locator('#paIqamaNotificationOpen').click({position:{x:160,y:25}});
   await page.waitForFunction(()=>document.getElementById('webSubTitle')?.textContent==='إشعار الإقامة');
   const original=await page.evaluate(()=>({
      web:!!document.querySelector('#webSubBody #iqamaNotificationSettings'),
      nativeToggle:!!document.querySelector('#webSubBody #iqamaNotificationToggle'),
      fallback:document.querySelector('#webSubBody')?.textContent.includes('تعتمد على إعدادات الإقامة الأصلية')
   }));
   assert.ok(original.web||original.nativeToggle||original.fallback,'Original iqama view must open');
   assert.equal(await page.locator('#adhanServicesDialog').isVisible(),false,
     'Original prayer dialog must be closed while nested iqama settings are open');
   await page.locator('#webDrawerSub .web-back').click();
   await page.locator('#adhanServicesDialog').waitFor({state:'visible'});
   assert.equal(await page.locator('#paIqamaNotificationOpen').count(),1);
   assert.equal(await page.locator('#aoqatAlertSettings [data-alert-section="iqama"]').count(),0);
   console.log('PASS: iqama exists only under prayer alerts, original controls remain intact, nested back works, and sound-help circle matches settings.');
 } finally {await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
