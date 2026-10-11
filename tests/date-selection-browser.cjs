const fixture=require('./prayer-db-fixture.cjs'),{chromium}=require('playwright'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
(async()=>{const server=spawn('python3',['-m','http.server','8784'],{stdio:'ignore'});let browser;try{
await new Promise(r=>setTimeout(r,500));browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Baghdad',serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.clock.install({time:new Date('2026-10-11T21:58:00+03:00')});await page.addInitScript(()=>{localStorage.setItem('aoqatPrayerTimeChoiceV1',JSON.stringify({mode:'custom',offsets:{fajr:-1,asr:5}}));localStorage.setItem('aoqatAnnualPrayerRowsV1',JSON.stringify([{gregorian_month:1,gregorian_day:1,fajr:'5:58',sunrise:'7:14',dhuhr:'12:12',asr:'2:48',maghrib:'5:06',isha:'6:26'}]));});
await page.route('**/rest/v1/annual_prayer_times**',r=>r.fulfill({json:fixture(r,[{gregorian_month:1,gregorian_day:1,fajr:'5:58',sunrise:'7:14',dhuhr:'12:12',asr:'2:48',maghrib:'5:06',isha:'6:26'},{gregorian_month:10,gregorian_day:11,fajr:'4:55',sunrise:'6:10',dhuhr:'11:56',asr:'3:13',maghrib:'5:40',isha:'7:00'}])}));
await page.goto('http://127.0.0.1:8784',{waitUntil:'domcontentloaded'});await page.waitForSelector('[data-drawer="datePrayer"]',{state:'attached'});
await page.evaluate(()=>document.body.classList.add('design-menu-open'));await page.locator('[data-drawer="datePrayer"]').click();await page.locator('[data-panel="datePanel"]').click();
await page.locator('#gregorianYear').selectOption('2027');await page.locator('#gregorianMonth').selectOption('كانون الثاني');await page.locator('#gregorianDay').selectOption('1');
await page.waitForFunction(()=>document.getElementById('fajr').value==='5:57');
assert.equal(await page.locator('#dayName').inputValue(),'الجمعة');assert.equal(await page.locator('#asr').inputValue(),'2:53');
const expected=await page.evaluate(()=>{const h={};for(const p of new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date(2027,0,1,12)))h[p.type]=p.value;return h;});
assert.equal(await page.locator('#hijriYear').inputValue(),expected.year);assert.equal(await page.locator('#hijriDay').inputValue(),expected.day);
await page.locator('#gregorianMonth').selectOption('آذار');await page.locator('#gregorianDay').selectOption('31');await page.locator('#gregorianMonth').selectOption('شباط');assert.equal(await page.locator('#gregorianDay').inputValue(),'28');
await page.locator('#gregorianYear').selectOption('2028');await page.locator('#gregorianDay').selectOption('29');assert.equal(await page.locator('#gregorianDay').inputValue(),'29');
await page.locator('#returnDateToToday').click();await page.waitForFunction(()=>document.getElementById('fajr').value==='4:54');
assert.equal(await page.locator('#gregorianYear').inputValue(),'2026');assert.equal(await page.locator('#gregorianMonth').inputValue(),'تشرين الأول');assert.equal(await page.locator('#gregorianDay').inputValue(),'11');assert.equal(await page.locator('#dayName').inputValue(),'الأحد');assert.equal(await page.locator('#asr').inputValue(),'3:18');
assert.deepEqual(errors,[]);console.log('Selected Gregorian year/month/day synchronizes weekday, Hijri date, matching prayer times, leap days and return-to-today with custom offsets');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
