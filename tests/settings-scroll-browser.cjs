const prayerFixture=require('./prayer-db-fixture.cjs');
const {chromium}=require('playwright');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{const server=spawn('python3',['-m','http.server','8772'],{stdio:'ignore'});let browser;try{await new Promise(r=>setTimeout(r,700));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:640},hasTouch:true,serviceWorkers:'block'});let offline=false;const row={location_name:'الحويجة وضواحيها',gregorian_month:10,gregorian_day:6,fajr:'4:48',sunrise:'6:07',dhuhr:'11:58',asr:'3:17',maghrib:'5:46',isha:'7:06'};
await page.addInitScript(()=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-10-06T04:51:50']))}static now(){return new D('2026-10-06T04:51:50').getTime()}};});
await page.route('**/rest/v1/annual_prayer_times**',r=>offline?r.abort():r.fulfill({json:prayerFixture(r,[row])}));await page.goto('http://127.0.0.1:8772',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('fajr').value==='4:48'&&document.getElementById('webDrawerMain')&&document.getElementById('designRef'));await page.waitForTimeout(1800);
assert.equal(await page.locator('#designRef [data-field="fajr"]').textContent(),'4:48');const originalScroll=await page.evaluate(()=>{document.body.style.minHeight='1800px';window.scrollTo(0,150);return window.scrollY;});assert.ok(originalScroll>0);
await page.locator('#designSideMenuBtn').click();await page.waitForFunction(()=>document.documentElement.classList.contains('design-menu-scroll-locked'));
// Wait for the drawer's 240ms entrance transition before a coordinate-based touch gesture.
await page.waitForTimeout(350);
const background=await page.locator('#designRef').boundingBox();
await page.evaluate(()=>{window.touchDebug=[];for(const name of ['touchstart','touchmove','touchend'])window.addEventListener(name,e=>touchDebug.push({type:e.type,target:e.target.id||e.target.className,prevented:e.defaultPrevented,y:e.touches[0]?.clientY}),{capture:true,passive:true});});
const cdp=await page.context().newCDPSession(page);
async function swipe(x,y,endY){
 await cdp.send('Input.synthesizeScrollGesture',{x,y,yDistance:endY-y,xDistance:0,gestureSourceType:'touch',preventFling:true,speed:600});
 await page.waitForTimeout(300);
}
await page.locator('#webDrawerMain').evaluate(e=>e.scrollTop=0);
await swipe(280,540,160);
assert.ok(await page.locator('#webDrawerMain').evaluate(e=>e.scrollTop)>0,JSON.stringify(await page.evaluate(()=>{const m=document.getElementById('webDrawerMain');return {message:'Touch swipe must scroll the main menu',body:document.body.className,scroll:m.scrollTop,height:m.clientHeight,total:m.scrollHeight,rect:m.getBoundingClientRect().toJSON(),hit:document.elementFromPoint(280,540)?.outerHTML.slice(0,250),overflow:getComputedStyle(m).overflowY,events:window.touchDebug};})));
assert.deepEqual(await page.locator('#designRef').boundingBox(),background,'Touch menu scrolling must leave the design still');
await swipe(35,500,180);
assert.deepEqual(await page.locator('#designRef').boundingBox(),background,'Touching the backdrop must not scroll the design');await page.locator('#webDrawerMain').evaluate(e=>{e.scrollTop=e.scrollHeight});
const box=await page.evaluate(()=>{const m=document.getElementById('webDrawerMain'),a=m.querySelector('[data-drawer="azkar"]'),r=a.getBoundingClientRect(),b=m.getBoundingClientRect();return {panelTop:document.querySelector('.main-panel').getBoundingClientRect().top,top:r.top,bottom:r.bottom,limit:b.bottom,viewport:innerHeight,scroll:m.scrollTop,overflow:getComputedStyle(m).overflowY}});assert.equal(box.overflow,'auto');assert.ok(box.scroll>0);assert.ok(box.bottom<=Math.min(box.limit,box.viewport)&&box.top>=0,JSON.stringify(box));await page.locator('[data-drawer="azkar"]').hover();await page.mouse.wheel(0,600);await page.waitForTimeout(200);
assert.deepEqual(await page.locator('#designRef').boundingBox(),background,'Drawer boundary scrolling must not move the design behind it');
await page.locator('#designSideMenuBtn').click();await page.waitForFunction(()=>!document.documentElement.classList.contains('design-menu-scroll-locked'));
assert.equal(await page.evaluate(()=>window.scrollY),originalScroll,'Closing drawer restores the original page position');
await page.locator('#designSideMenuBtn').click();await page.locator('#webDrawerMain').evaluate(e=>{e.scrollTop=e.scrollHeight});
await page.locator('[data-drawer="azkar"]').click();await page.waitForSelector('#adAzkarList',{state:'attached'});
offline=true;await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('fajr').value==='4:48');await page.waitForTimeout(1800);assert.equal(await page.locator('#designRef [data-field="fajr"]').textContent(),'4:48');assert.equal(await page.locator('#iqamaCountdown').textContent(),'16:10');console.log('Settings reach Azkar; offline restart after Fajr retains 4:48 and correct iqama');}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exit(1)});
