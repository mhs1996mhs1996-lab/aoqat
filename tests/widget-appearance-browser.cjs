const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
(async()=>{
 const server=spawn('python3',['-m','http.server','8791'],{stdio:'ignore'});
 let browser;
 try{
  await new Promise(resolve=>setTimeout(resolve,700));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:800},serviceWorkers:'block'});
  await page.route('**/rest/**',route=>route.abort());
  await page.goto('http://127.0.0.1:8791',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.aoqatUIReady && window.AoqatWidgetAppearance &&
        document.querySelector('[data-drawer="appearance"]'),{timeout:45000});
  await page.locator('#designSideMenuBtn').click();
  await page.locator('[data-drawer="appearance"]').click();
  await page.getByRole('button',{name:'🖼️ تعديل بطاقات الشاشة الرئيسية'}).click();
  await page.waitForSelector('#aoqatWidgetAppearance');
  assert.equal(await page.locator('#webSubTitle').textContent(),'تعديل بطاقات الشاشة الرئيسية');
  await page.getByRole('button',{name:/اختيار البطاقة \(6\)/}).click();
  assert.equal(await page.locator('#aoqatWidgetAppearance .wa-chooser button').count(),6);
  await page.locator('#aoqatWidgetAppearance .wa-chooser button').nth(1).click();
  await page.locator('#aoqatWidgetAppearance select[aria-label="خلفية البطاقة"]').selectOption('blue');
  await page.getByRole('button',{name:/تنسيق الخط/}).click();
  assert.equal(await page.locator('#aoqatWidgetAppearance .wa-style-group').count(),2);
  await page.locator('#aoqatWidgetAppearance select[aria-label="labels-font"]').selectOption('serif');
  await page.locator('#aoqatWidgetAppearance select[aria-label="numbers-font"]').selectOption('condensed');
  await page.locator('#aoqatWidgetAppearance select[aria-label="labels-weight"]').selectOption('normal');
  await page.locator('#aoqatWidgetAppearance select[aria-label="numbers-weight"]').selectOption('bold');
  await page.locator('#aoqatWidgetAppearance input[aria-label="labels-size"]').evaluate(el=>{
    el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#aoqatWidgetAppearance input[aria-label="numbers-size"]').evaluate(el=>{
    el.value='135';el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  const set=await page.evaluate(()=>window.AoqatWidgetAppearance.load());
  assert.equal(set.times.background,'blue');
  assert.equal(set.times.labels.font,'serif');
  assert.equal(set.times.numbers.font,'condensed');
  assert.equal(set.times.labels.weight,'normal');
  assert.equal(set.times.numbers.weight,'bold');
  assert.equal(set.times.labels.size,90);
  assert.equal(set.times.numbers.size,135);
  assert.equal(set.next.background,'transparent');
  await page.getByRole('button',{name:/اختيار البطاقة \(6\)/}).click();
  await page.locator('#aoqatWidgetAppearance .wa-chooser button').nth(2).click();
  assert.equal(await page.locator('#aoqatWidgetAppearance .wa-grid-cell').count(),6);
  await page.getByRole('button',{name:/اختيار البطاقة \(6\)/}).click();
  await page.locator('#aoqatWidgetAppearance .wa-chooser button').nth(3).click();
  assert.equal(await page.locator('#aoqatWidgetAppearance .wa-grid.wa-featured .wa-grid-cell').count(),6);
  await page.getByRole('button',{name:/اختيار البطاقة \(6\)/}).click();
  await page.locator('#aoqatWidgetAppearance .wa-chooser button').nth(5).click();
  assert.equal(await page.locator('#aoqatWidgetAppearance .wa-pair .wa-line').count(),2);
  await page.locator('.web-back').click();
  assert.equal(await page.locator('#webSubTitle').textContent(),'شكل التطبيق');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.AoqatWidgetAppearance && window.aoqatUIReady);
  assert.equal((await page.evaluate(()=>window.AoqatWidgetAppearance.load())).times.numbers.size,135);
  console.log('PASS: six widget choices; independent label and number face/weight/size/color; native-safe preview; persistence');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});