const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
(async()=>{
  const server=spawn('python3',['-m','http.server','8794'],{stdio:'ignore'});
  let browser;
  try{
    await new Promise(resolve=>setTimeout(resolve,800));
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:390,height:780},serviceWorkers:'block'});
    const errors=[];page.on('pageerror',err=>errors.push(err.message));
    await page.goto('http://127.0.0.1:8794',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-drawer="adhanIqama"]',{state:'attached',timeout:40000});
    await page.evaluate(()=>document.body.classList.add('design-menu-open'));
    await page.locator('[data-drawer="adhanIqama"]').click();
    await page.getByRole('button',{name:'🔊 الأذان والتنبيه',exact:true}).click();
    assert.equal(await page.locator('#adAudibility [data-ad-audibility]').count(),10);
    const silent=page.locator('[data-ad-audibility="fajr"][data-sound-condition="silent"]');
    const dnd=page.locator('[data-ad-audibility="asr"][data-sound-condition="dnd"]');
    await silent.click();
    assert.equal(await silent.getAttribute('aria-pressed'),'true');
    await dnd.click();
    assert.equal(await dnd.getAttribute('aria-pressed'),'true');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.aoqatAdhanV1));
    assert.deepEqual(saved.audibility.fajr,{silent:true,dnd:false});
    assert.deepEqual(saved.audibility.asr,{silent:false,dnd:true});
    assert.equal(saved.audibility.dhuhr.dnd,false);
    assert.equal(saved.enabled,false,'Saving separate prayer audio gates must not activate global adhan');
    assert.ok(errors.length===0,errors.join('\n'));
    console.log('PASS: 10 independent prayer silent/DND controls, persisted across native/web-compatible settings and independent of global adhan');
  }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
