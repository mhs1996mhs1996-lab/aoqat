const prayerFixture=require('./prayer-db-fixture.cjs');
const { chromium }=require('playwright'), assert=require('node:assert/strict'), {spawn}=require('node:child_process');
(async()=>{const server=spawn('python3',['-m','http.server','8769'],{stdio:'ignore'});let browser;try{
 await new Promise(r=>setTimeout(r,700));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
 const context=await browser.newContext({timezoneId:'Asia/Baghdad'}),page=await context.newPage();
 await page.addInitScript(()=>{const D=Date;window.testNow=new D('2026-10-02T15:21:59+03:00').getTime();window.Date=class extends D{constructor(...a){super(...(a.length?a:[testNow]));}static now(){return testNow;}};const A=Audio;window.playCount=0;window.Audio=function(src){const a=new A(src);window.testAudio=a;const play=a.play.bind(a);a.play=()=>{playCount++;return play();};return a;};localStorage.setItem('aoqatAdhanV1',JSON.stringify({enabled:true,sound:'4',volume:52,partial:true}));});
 await page.route('**/rest/v1/annual_prayer_times**',r=>r.fulfill({json:prayerFixture(r,[{gregorian_month:10,gregorian_day:2,fajr:'4:43',sunrise:'6:04',dhuhr:'11:59',asr:'3:22',maghrib:'5:53',isha:'7:13'}])}));
 await page.goto('http://127.0.0.1:8769',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1800);assert.equal(await page.evaluate(()=>playCount),0);
 await page.locator('body').click({position:{x:10,y:10}});await page.waitForTimeout(500);await page.evaluate(()=>{playCount=0;});
 await page.evaluate(()=>{testNow=new Date('2026-10-02T15:22:10+03:00').getTime();});await page.waitForFunction(()=>window.testAudio&&!testAudio.paused&&testAudio.currentTime>0);
 assert.equal(await page.evaluate(()=>playCount),1);assert.equal(await page.evaluate(()=>testAudio.volume),0.52);
 await page.evaluate(()=>{testNow=new Date('2026-10-02T15:21:59+03:00').getTime();});await page.waitForTimeout(1200);
 await page.evaluate(()=>{testNow=new Date('2026-10-02T15:22:20+03:00').getTime();});await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>playCount),1);
 console.log('Delayed scheduled adhan plays actual audio once; volume preserved');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exit(1);});
