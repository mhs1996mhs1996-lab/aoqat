'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
(async()=>{
 const server=spawn('python3',['-m','http.server','8893'],{stdio:'ignore'});
 let browser;
 try{
  await new Promise(resolve=>setTimeout(resolve,700));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/rest/**',r=>r.abort());
  await page.goto('http://127.0.0.1:8893/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.aoqatUIReady && !!window.AoqatWebQuietSettings && !!window.AoqatWebSettingsNavigation);
  await page.locator('#designSideMenuBtn').click();
  await page.evaluate(()=>AoqatWebSettingsNavigation.alert('quiet'));
  await page.locator('#aoqatQuietWebPanel input[name="aoqatQuietMode"]').first().waitFor();
  assert.equal(await page.locator('#aoqatQuietWebPanel input[name="aoqatQuietMode"]').count(),4);
  assert.equal(await page.locator('#aoqatQuietWebPanel input[name="aoqatQuietMode"]:checked').inputValue(),'off');
  await page.locator('#aoqatQuietWebPanel input[name="aoqatQuietMode"][value="both"]').check();
  assert.equal(await page.evaluate(()=>AoqatWebQuietSettings.read().afterAdhanSilent.enabled && AoqatWebQuietSettings.read().afterIqamaSilent.enabled),true);
  const dur=page.locator('#aoqatQuietWebPanel input[data-web-quiet-minutes="asr"][data-quiet-kind="iqama"]');
  await dur.fill('13');await dur.press('Tab');
  assert.equal(await page.evaluate(()=>AoqatWebQuietSettings.read().afterIqamaSilent.minutes.asr),13);
  await page.evaluate(()=>AoqatWebSettingsNavigation.main());
  await page.locator('#webSettingsSearch').fill('الصامت العصر');
  const target=page.locator('#webSettingsSearchResults button').filter({hasText:'عند الإقامة'});
  await target.first().click();
  await page.locator('#aoqatQuietWebPanel input[data-web-quiet-minutes="asr"][data-quiet-kind="iqama"]').waitFor({state:'visible'});
  assert.equal(await page.locator('#aoqatQuietWebPanel input[data-web-quiet-minutes="asr"][data-quiet-kind="iqama"]').inputValue(),'13');
  assert.equal(await page.locator('#adSection-sound.ad-leaf-window:visible').count(),0);
  console.log('PASS: web quiet mode options and 13-minute setting persist; search opens quiet page, not adhan voice');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
