const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
  // Compare the actual icon markup in hosted web source with the APK preview.
  // APK uses the exact same transformed web-settings-search-calendar.js.
  const web=fs.readFileSync('js/web-settings-search-calendar.js','utf8');
  const match=web.match(/b\.innerHTML='(<span class="ico"><svg[\s\S]*?<\/svg><\/span><span class="txt">التقاويم<\/span>)'/);
  assert.ok(match,'Canonical web calendars icon SVG exists');
  const original=match[1];
  assert.match(original,/viewBox="0 0 32 32"/);
  assert.match(original,/width="28" height="28"/);

  const browser=await chromium.launch({
    executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
    args:['--no-sandbox']
  });
  try{
    const page=await browser.newPage({viewport:{width:390,height:780}});
    await page.setContent('<div id="webDrawerMain"><button type="button" class="web-drawer-row" data-drawer="calendar">'+original+'</button></div><main id="app"></main>');
    await page.evaluate(()=>{
      let screen=true;
      window.AndroidNative={
        readScreenWakeEnabled:()=>screen,
        configureScreenWake:v=>{screen=!!v},
        screenWakeStatus:()=>JSON.stringify({enabled:screen,notifications:true,fullScreen:true,requiresGrant:true}),
        requestScreenWakeAccess:()=>{window.permissionRequested=true}
      };
      window.AoqatWebSettingsNavigation={sub:(title,element)=>{
        window.lastScreenTitle=title;document.getElementById('app').replaceChildren(element)
      }};
    });
    await page.addScriptTag({content:fs.readFileSync('android-native/apk-overrides/native-screen-alerts.js','utf8')});
    await page.evaluate(()=>window.AoqatScreenAlerts.open());
    assert.equal(await page.evaluate(()=>window.lastScreenTitle),'إضاءة شاشة الهاتف');
    const toggle=page.locator('#androidWakeScreenToggle');
    assert.equal(await toggle.getAttribute('aria-pressed'),'true');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-pressed'),'false');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-pressed'),'true');
    await page.locator('#androidWakeScreenAccess').click();
    assert.equal(await page.evaluate(()=>window.permissionRequested),true);
    const calendar=page.locator('#webDrawerMain [data-drawer="calendar"] .ico');
    const sameIcon=await calendar.locator('svg').evaluate((svg,source)=>{
      const div=document.createElement('div');div.innerHTML=source;
      return svg.outerHTML===div.querySelector('svg').outerHTML;
    },original);
    assert.equal(sameIcon,true,'APK calendar SVG must have identical rendered DOM to hosted web');
    const attributes=await calendar.locator('svg').evaluate(svg=>({
      width:getComputedStyle(svg).width,height:getComputedStyle(svg).height,
      stroke:getComputedStyle(svg).stroke,fill:getComputedStyle(svg).fill
    }));
    assert.equal(attributes.width,'28px');
    assert.equal(attributes.height,'28px');
    assert.equal(attributes.fill,'none');
    console.log('PASS: Android-only wake switch, full-screen permission shortcut, and identical web calendar SVG geometry');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
