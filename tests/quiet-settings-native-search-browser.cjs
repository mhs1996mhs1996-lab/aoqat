'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent('<div class="sidebar"><div class="main-panel"></div></div><div id="webExactDrawer"><h2 id="webSettingsHeading"></h2><div id="webDrawerMain"></div></div>');
  await page.evaluate(()=>{
    window.quietSaved={enabled:false,sound:'4',volume:53,
      atAdhanSilent:{enabled:false,minutes:{fajr:10,dhuhr:10,asr:10,maghrib:10,isha:10}},
      afterIqamaSilent:{enabled:true,minutes:{fajr:11,dhuhr:13,asr:15,maghrib:12,isha:12}}};
    window.quietCalls=[];
    window.quietStatus={permission:true,exactAlarm:true,ringer:0,dnd:3,appOwnsQuiet:false,lastResult:'already_silent'};
    window.AndroidNative={
      configureAdhan:(json)=>{window.quietSaved=JSON.parse(json);window.quietCalls.push(json)},
      readAdhanSettings:()=>JSON.stringify(window.quietSaved),
      readQuietModeStatus:()=>JSON.stringify(window.quietStatus),
      hasQuietPolicyAccess:()=>true,requestQuietPolicyAccess:()=>{},
      openDeviceSoundSettings:()=>{window.openedSoundSettings=true},
      stopAutomaticQuietNow:()=>{window.stoppedQuiet=true}
    };
    window.AoqatAdhanCore={normalize:s=>structuredClone(s)};
    window.AoqatWebSettingsNavigation={alert:(kind)=>{
      window.lastNavigation=kind;
      window.AoqatApkQuietSettings.render(true);
    }};
  });
  await page.addScriptTag({path:'android-native/apk-overrides/native-quiet-menu.js'});
  const roots=page.locator('#quietPanel');
  await roots.waitFor({state:'attached'});
  assert.equal(await roots.locator('input[name="aqQuietMode"]').count(),4);
  assert.equal(await roots.locator('input[name="aqQuietMode"]:checked').inputValue(),'iqama');
  assert.equal(await roots.locator('output[data-quiet-key="afterIqamaSilent"][data-quiet-prayer="dhuhr"]').textContent(),'13 دقيقة');
  assert.equal(await roots.locator('[data-quiet-section="atAdhanSilent"]').count(),0);
  // Radio updates only two existing quiet switches, preserving other adhan options.
  await roots.locator('input[name="aqQuietMode"][value="both"]').check();
  assert.equal(await page.evaluate(()=>quietSaved.atAdhanSilent.enabled && quietSaved.afterIqamaSilent.enabled),true);
  assert.equal(await page.evaluate(()=>quietSaved.volume),53);
  assert.equal(await roots.locator('[data-quiet-section]').count(),2);
  const step=roots.locator('[data-quiet-step="1"][data-quiet-key="afterIqamaSilent"][data-quiet-prayer="fajr"]');
  const calls=await page.evaluate(()=>quietCalls.length);
  await step.click();await step.click();
  assert.equal(await roots.locator('output[data-quiet-key="afterIqamaSilent"][data-quiet-prayer="fajr"]').textContent(),'13 دقيقة');
  assert.equal(await page.evaluate(()=>quietCalls.length),calls,'Rapid minute changes must not block on the native bridge');
  await page.waitForFunction(()=>quietSaved.afterIqamaSilent.minutes.fajr===13,{timeout:2500});
  // User-owned pre-existing silent must offer system sound settings, never force a ringer change.
  await roots.locator('.aq-quiet-status summary').click();
  assert.equal(await roots.locator('.aq-quiet-recovery').textContent(),'فتح إعدادات صوت الهاتف');
  await roots.locator('.aq-quiet-recovery').click();
  assert.equal(await page.evaluate(()=>openedSoundSettings),true);
  await page.evaluate(()=>{quietStatus.appOwnsQuiet=true;AoqatApkQuietSettings.render(true);});
  await roots.locator('.aq-quiet-status summary').click();
  await roots.locator('.aq-quiet-recovery').click();
  assert.equal(await page.evaluate(()=>stoppedQuiet),true);
  // Simulate the exact APK build's removal of the web-only source guard.
  const source=fs.readFileSync('js/web-settings-search-calendar.js','utf8')
    .replace('if(window.AndroidNative?.configureAdhan)return;','');
  await page.addScriptTag({content:source});
  await page.waitForSelector('#webSettingsSearch',{state:'attached'});
  await page.locator('#webSettingsSearch').fill('الصامت العصر');
  const results=page.locator('#webSettingsSearchResults button');
  assert.ok(await results.count()>=2);
  await results.filter({hasText:'عند الإقامة'}).first().click();
  assert.equal(await page.evaluate(()=>lastNavigation),'quiet');
  await page.waitForFunction(()=>document.activeElement?.dataset?.quietPrayer==='asr' || document.querySelector('[data-quiet-prayer="asr"][data-quiet-key="afterIqamaSilent"]'));
  const rendered=await roots.locator('output[data-quiet-prayer="asr"][data-quiet-key="afterIqamaSilent"]').count();
  assert.equal(rendered,1,'Search must reveal the real quiet setting, not the adhan voice page');
  await page.locator('#webSettingsSearch').fill('الصامت عند الأذان');
  await page.locator('#webSettingsSearchResults button').filter({hasText:'الصامت عند الأذان'}).first().click();
  assert.equal(await page.evaluate(()=>lastNavigation),'quiet');
  assert.deepEqual(errors,[]);
  console.log('PASS native silent mode choices, saved values, quick minute controls, safe recovery, and native APK search routing');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
