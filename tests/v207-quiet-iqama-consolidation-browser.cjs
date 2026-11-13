'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
(async()=>{
 const server=spawn('python3',['-m','http.server','8987'],{stdio:'ignore'});
 let browser;
 try{
   await new Promise(r=>setTimeout(r,800));
   browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
   const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Baghdad',serviceWorkers:'block'});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
     window.__savedAdhan='{}';window.__iqamaCalls=[];
     window.AndroidNative={
       readAdhanSettings:()=>window.__savedAdhan,
       configureAdhan:json=>{window.__savedAdhan=json;},
       readIqamaTiming:()=>JSON.stringify({enabled:true,minutes:{fajr:20,dhuhr:15,asr:15,maghrib:7,isha:15},afterMinutes:{}}),
       configureIqamaTiming:(enabled,before,after)=>window.__iqamaCalls.push({enabled,before,after}),
       iqamaNotificationPermission:()=>true,
       readQuietModeStatus:()=>JSON.stringify({ringer:2,dnd:1,permission:true,exactAlarm:true,lastResult:'never'}),
       hasQuietPolicyAccess:()=>true
     };
   });
   await page.route('**/rest/**',r=>r.abort());
   await page.goto('http://127.0.0.1:8987/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.aoqatUIReady&&window.AoqatAlertsHub&&document.getElementById('iqamaNotificationToggle'),{timeout:45000});
   // In the APK, android-ui-fixes supplies this existing group, including
   // appearance and permission controls. Model the same original live nodes.
   await page.evaluate(()=>{
     const toggle=document.getElementById('iqamaNotificationToggle');
     const group=document.createElement('section');group.id='iqamaNotificationSettings';
     const header=document.createElement('h3');header.textContent='ظهور إشعار الإقامة';
     const appearance=document.createElement('select');appearance.id='iqamaAppearance';
     appearance.append(new Option('داكن','dark'));
     const access=document.createElement('button');access.id='iqamaBackgroundAccess';access.textContent='أذونات الإقامة';
     group.append(header,toggle,access,appearance);document.body.append(group);
     AoqatAlertsHub.adopt();
   });
   await page.addScriptTag({path:'android-native/apk-overrides/native-quiet-menu.js'});
   await page.locator('#quietPanel').waitFor({state:'attached'});
   assert.equal(await page.locator('#quietPanel .aq-quiet-help').count(),0,'No verbose explanations in quiet cards');
   const inputs=page.locator('#quietPanel input[data-quiet-prayer]');
   assert.equal(await inputs.count(),10,'Five prayers for each of two quiet modes');
   const sample=inputs.first();
   assert.equal(await sample.getAttribute('lang'),'en-US');
   assert.equal(await sample.getAttribute('dir'),'ltr');
   assert.ok((await sample.evaluate(x=>getComputedStyle(x).fontFamily)).includes('Arial'));
   assert.equal(await page.locator('#quietPanel [data-quiet-preset]').count(),0,'No hardcoded 5/10/15 minute presets');
   await page.evaluate(()=>document.body.classList.add('design-menu-open'));
   await page.locator('[data-drawer="alertSettings"]').click();
   assert.equal(await page.locator('[data-alert-section="iqama"]').count(),0,'No duplicate root Iqama entry');
   assert.equal(await page.locator('[data-alert-section="prayer"]').count(),1);
   await page.locator('[data-alert-section="prayer"]').click();
   await page.locator('#adhanServicesDialog').waitFor({state:'visible'});
   assert.equal(await page.locator('#adIqamaNoticeOpen').count(),1);
   const help=page.locator('#adAudibilityHelp');
   const circle=await help.evaluate(el=>{
     const s=el.querySelector('.ad-audibility-help-circle');
     const cs=getComputedStyle(s),b=s.getBoundingClientRect();
     return {width:Math.round(b.width),height:Math.round(b.height),border:cs.borderTopWidth,background:cs.backgroundColor,buttonWidth:Math.round(el.getBoundingClientRect().width)};
   });
   assert.equal(circle.width,20,'Help icon must match other small circles');
   assert.equal(circle.height,20);
   assert.equal(circle.buttonWidth,44,'Comfortable touch area is separate from the circle');
   await help.click();
   await page.locator('#aoqatHelpPage').waitFor({state:'visible'});
   await page.locator('#aoqatHelpPage .aoqat-help-back').click();
   await page.locator('#adIqamaNoticeOpen').click();
   const notice=page.locator('#adIqamaNoticeContent');
   await notice.locator('#iqamaNotificationToggle').waitFor({state:'visible'});
   assert.equal(await notice.locator('#iqamaAppearance').count(),1);
   assert.equal(await notice.locator('#iqamaBackgroundAccess').count(),1);
   assert.equal(await page.locator('#iqamaNotificationToggle').count(),1,'One ORIGINAL button, not a clone');
   await notice.locator('#iqamaNotificationToggle').click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('aoqatIqamaNotificationEnabledV1')),'0');
   await notice.locator('#iqamaNotificationToggle').click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('aoqatIqamaNotificationEnabledV1')),'1');
   await page.locator('#adIqamaNoticeBack').click();
   assert.equal(await page.locator('#adIqamaNoticeDetails').isVisible(),false);
   await page.locator('#adIqamaNoticeOpen').click();
   await notice.locator('#iqamaNotificationToggle').waitFor({state:'visible'});
   assert.equal(await notice.locator('#iqamaAppearance').count(),1,'Appearance setting survives navigation');
   // Force an original adhan rerender. The existing native toggle must not
   // be destroyed and its saved switch must be unchanged.
   await page.evaluate(()=>window.aoqatNativeAdhanSettings?.(JSON.parse(window.__savedAdhan)));
   await page.locator('#adIqamaNoticeContent #iqamaNotificationToggle').waitFor({state:'attached'});
   assert.equal(await page.locator('#iqamaNotificationToggle').count(),1);
   assert.equal(await page.evaluate(()=>localStorage.getItem('aoqatIqamaNotificationEnabledV1')),'1');
   await page.locator('#adIqamaQuietOpen').click();
   await page.locator('#webSubBody #quietPanel').waitFor({state:'visible'});
   assert.equal(await page.locator('#adhanServicesDialog').isVisible(),false);
   assert.equal(await page.locator('#quietPanel input[data-quiet-prayer]').count(),10);
   await page.screenshot({path:'/tmp/aoqat-v207-quiet-layout.png'});
   assert.deepEqual(errors,[],'Page errors');
   console.log('PASS: original notification/appearance settings are under prayer alerts with no duplicate or lost native controls; western digits, 20px help and safe quiet navigation.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
