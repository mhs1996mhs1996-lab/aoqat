const {chromium}=require('playwright');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{const server=spawn('python3',['-m','http.server','8766'],{stdio:'ignore'});let browser;try{await new Promise(r=>setTimeout(r,700));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});for(const browserPermission of ['denied','default']){
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.addInitScript(permission=>{window.iqamaCalls=[];window.Notification={permission,requestPermission:async()=>{throw Error('Must never ask browser permission in APK')}};window.AndroidNative={readIqamaTiming:()=>JSON.stringify({enabled:true,minutes:{fajr:25,dhuhr:15},afterMinutes:{fajr:20,dhuhr:25}}),configureIqamaTiming:(enabled,before,after)=>window.iqamaCalls.push({enabled,before:JSON.parse(before),after:JSON.parse(after)}),iqamaNotificationPermission:()=>true};},browserPermission);
 await page.route('**/rest/v1/annual_prayer_times**',r=>r.fulfill({json:[{gregorian_month:10,gregorian_day:1,fajr:'4:43',sunrise:'6:04',dhuhr:'11:59',asr:'3:22',maghrib:'5:53',isha:'7:13'}]}));await page.goto('http://127.0.0.1:8766',{waitUntil:'domcontentloaded'});
 // Reproduce the old insertion failure: the status exists, but belongs to another container.
 await page.evaluate(()=>{const status=document.getElementById('tomorrowSwitchStatus');if(status)document.body.appendChild(status);});
 await page.waitForSelector('#iqamaNotificationToggle',{state:'attached'});
 assert.equal(await page.evaluate(()=>localStorage.aoqatIqamaNotificationEnabledV1),'1');assert.equal(await page.locator('#iqamaNotificationToggle').getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>document.getElementById('iqamaNotificationToggle').click());assert.equal(await page.evaluate(()=>localStorage.aoqatIqamaNotificationEnabledV1),'0');
 await page.evaluate(()=>document.getElementById('iqamaNotificationToggle').click());assert.equal(await page.evaluate(()=>localStorage.aoqatIqamaNotificationEnabledV1),'1');
 assert.ok(await page.evaluate(()=>iqamaCalls.at(-1).enabled&&iqamaCalls.at(-1).before.fajr===25&&iqamaCalls.at(-1).after.fajr===20));

 // Every button in both panels must change the visible value BEFORE native scheduling.
 const firstTap=await page.evaluate(()=>{
  const out=document.querySelector('output[data-after-iqama="fajr"]');
  const nativeBefore=iqamaCalls.length;
  out.parentElement.querySelector('[data-minute-step="1"]').click();
  return {display:out.querySelector('strong').textContent,nativeBefore,nativeAfter:iqamaCalls.length};
 });
 assert.equal(firstTap.display,'21');
 assert.equal(firstTap.nativeBefore,firstTap.nativeAfter,'A single tap may not synchronously schedule Android services');
 await page.waitForFunction(()=>iqamaCalls.at(-1)?.after.fajr===21);
 const rapidAfter=await page.evaluate(()=>{
  const out=document.querySelector('output[data-after-iqama="fajr"]');
  const callsBefore=iqamaCalls.length;
  const minus=out.parentElement.querySelector('[data-minute-step="-1"]');
  for(let n=0;n<8;n++)minus.click();
  return {display:out.querySelector('strong').textContent,callsBefore,callsAfter:iqamaCalls.length};
 });
 assert.equal(rapidAfter.display,'13');
 assert.equal(rapidAfter.callsAfter,rapidAfter.callsBefore,'Rapid taps must not repeatedly enter the native bridge');
 await page.waitForFunction(()=>iqamaCalls.at(-1)?.after.fajr===13);
 const rapidBefore=await page.evaluate(()=>{
  const out=document.querySelector('output[data-iqama="dhuhr"]');
  const callsBefore=iqamaCalls.length;
  const minus=out.parentElement.querySelector('[data-minute-step="-1"]');
  for(let n=0;n<3;n++)minus.click();
  return {display:out.querySelector('strong').textContent,callsBefore,callsAfter:iqamaCalls.length};
 });
 assert.equal(rapidBefore.display,'12');
 assert.equal(rapidBefore.callsAfter,rapidBefore.callsBefore,'Before-iqama taps must remain independent from Android scheduling');
 await page.waitForFunction(()=>iqamaCalls.at(-1)?.before.dhuhr===12);
 // Any final pending edit must be flushed on WebView lifecycle transitions.
 await page.evaluate(()=>document.querySelector('output[data-iqama="dhuhr"]').parentElement.querySelector('[data-minute-step="1"]').click());
 assert.equal(await page.locator('output[data-iqama="dhuhr"] strong').textContent(),'13');
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 assert.equal(await page.evaluate(()=>iqamaCalls.at(-1)?.before.dhuhr),13);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#iqamaNotificationToggle',{state:'attached'});assert.equal(await page.locator('output[data-after-iqama="fajr"] strong').textContent(),'13');assert.equal(await page.locator('output[data-iqama="dhuhr"] strong').textContent(),'13');assert.equal(await page.evaluate(()=>localStorage.aoqatIqamaNotificationEnabledV1),'1');assert.equal(await page.locator('#iqamaNotificationToggle').getAttribute('aria-pressed'),'true');await page.close();}
 console.log('Native iqama permissions, settings recovery, persistence and nested status regression passed');}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exit(1)});
