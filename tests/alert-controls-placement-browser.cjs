const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');

(async()=>{
  const server=spawn('python3',['-m','http.server','8929'],{stdio:'ignore'});
  let browser;
  try{
    await new Promise(resolve=>setTimeout(resolve,900));
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:390,height:820},serviceWorkers:'block',timezoneId:'Asia/Baghdad'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/rest/**',route=>route.abort());
    await page.goto('http://127.0.0.1:8929',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.aoqatUIReady&&window.AoqatWebQuietSettings&&document.querySelector('#webDrawerMain'),{timeout:55000});
    await page.evaluate(()=>document.body.classList.add('design-menu-open'));

    await page.locator('[data-drawer="adhanIqama"]').click();
    await page.getByRole('button',{name:'🔊 الأذان والتنبيه',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#aoqatVoiceOnly [data-setting="sound"]'));
    assert.equal(await page.locator('#adhanServicesDialog').getAttribute('data-aoqat-view'),'voice');
    console.log('VOICE_LAYOUT_DEBUG',JSON.stringify(await page.evaluate(()=>{
      const el=document.getElementById('adNext'),card=el?.closest('.ad-card'),panel=document.getElementById('adhanPanel'),dialog=document.getElementById('adhanServicesDialog');
      const attrs=node=>node?{tag:node.tagName,id:node.id,classes:node.className,hidden:node.hidden,display:getComputedStyle(node).display,rect:node.getBoundingClientRect().toJSON()}:null;
      return {view:dialog?.dataset.aoqatView,dialog:attrs(dialog),panel:attrs(panel),first:[...panel.children].slice(0,9).map(attrs),card:attrs(card),text:attrs(el)};
    })));
    assert.equal(await page.locator('#adNext').isVisible(),true,'Next prayer is in the timetable view');
    assert.equal(await page.locator('#adCountdown').isVisible(),true);
    assert.equal(await page.locator('#aoqatVoiceOnly [data-setting="sound"]').isVisible(),true,'Voice selection moved, not cloned');
    assert.equal(await page.locator('#aoqatVoiceOnly [data-setting="volume"]').isVisible(),true,'Volume stays beside voice selection');
    for(const selector of ['#adEnable','#paMethodOpen','#adAudibility','#adAdhanSilentSettingsToggle','#adSilentSettingsToggle']){
      assert.equal(await page.locator(selector).isVisible(),false,selector+' must not appear in the voice/timetable view');
    }
    await page.locator('#aoqatVoiceOnly [data-setting="sound"]').selectOption('2');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('aoqatAdhanV1')).sound==='2');
    await page.waitForFunction(()=>!!document.querySelector('#aoqatVoiceOnly [data-setting="volume"]'));
    await page.locator('#aoqatVoiceOnly [data-setting="volume"]').evaluate(el=>{el.value='37';el.dispatchEvent(new Event('change',{bubbles:true}));});
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('aoqatAdhanV1')).volume===37);
    await page.waitForFunction(()=>document.querySelector('#aoqatVoiceOnly [data-setting="sound"]'));
    for(const sel of ['#adEnable','#adChoose','#adPreview','#adStop','#adAudibility']){
      assert.equal(await page.locator(sel).count(),1,sel+' must have exactly one original instance');
    }
    await page.locator('#adhanServicesBack').click();
    assert.equal(await page.locator('#adSection-sound .ad-card').count(),1,'Sound card returns to original parent on exit');
    await page.locator('#settingsContentDialog .web-back').click();

    await page.locator('[data-drawer="alertSettings"]').click();
    assert.equal(await page.locator('#webSubTitle').textContent(),'ضبط التنبيهات');
    assert.equal(await page.locator('[data-alert-section="prayer"]').count(),1);
    assert.equal(await page.locator('[data-alert-section="iqama"]').count(),1);
    assert.equal(await page.locator('#webSubBody [data-alert-section]').count(),7,'Original reminder center gains one prayer alert entry');
    await page.locator('[data-alert-section="prayer"]').click();
    await page.waitForFunction(()=>document.querySelector('#adhanServicesDialog')?.dataset.aoqatView==='alerts');
    assert.equal(await page.locator('#adNext').isVisible(),false,'Time card must not duplicate in alert controls');
    for(const selector of ['#adEnable','#paMethodOpen','#adAudibility','#adAdhanSilentSettingsToggle','#adSilentSettingsToggle']){
      assert.equal(await page.locator(selector).isVisible(),true,selector+' must be available only in alert center');
      assert.equal(await page.locator(selector).count(),1,selector+' duplicated');
    }
    assert.equal(await page.locator('[data-ad-section="sound"]').isVisible(),false,'Voice choice remains only under adhan data');
    const silent=page.locator('#adAudibility [data-ad-audibility="fajr"][data-sound-condition="silent"]');
    await silent.click();
    assert.equal(await silent.getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#adAudibility [data-ad-audibility]').count(),10,'All ten original five-prayer gates still exist');

    await page.locator('#adAdhanSilentSettingsToggle').click();
    assert.equal(await page.locator('#adAdhanSilentSettings').isVisible(),true);
    const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('aoqatAdhanV1')||'{}').afterAdhanSilent?.enabled===true);
    await page.locator('[data-web-quiet-toggle="adhan"]').click();
    await page.waitForFunction(before=>JSON.parse(localStorage.getItem('aoqatAdhanV1')||'{}').afterAdhanSilent?.enabled!==before,before);
    await page.locator('#adAdhanSilentSettings .ad-leaf-back').click();
    await page.locator('#adSilentSettingsToggle').click();
    assert.equal(await page.locator('#adSilentSettings').isVisible(),true);
    await page.locator('#adSilentSettings .ad-leaf-back').click();
    assert.equal(await page.locator('#adEnable').count(),1);
    assert.equal(await page.locator('#paMethodOpen').count(),1);
    await page.locator('#adhanServicesBack').click();
    assert.equal(await page.locator('#webSubTitle').textContent(),'ضبط التنبيهات');
    await page.locator('[data-alert-section="iqama"]').click();
    assert.equal(await page.locator('#webSubTitle').textContent(),'إشعار الإقامة');
    assert.equal(await page.locator('#webSubBody #iqamaNotificationSettings').count(),1,'Iqama notification remains an original setting');
    assert.deepEqual(errors,[]);
    console.log('PASS: timetable and adhan voice isolated; quiet-at-adhan, DND and silent gates original under alert hub; no duplicate settings; saved values preserved');
  }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
