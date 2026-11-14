'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {spawn} = require('node:child_process');

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8895'], {stdio:'ignore'});
  let browser;
  try {
    await new Promise(resolve => setTimeout(resolve, 900));
    browser = await chromium.launch({
      executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',
      args:['--no-sandbox','--disable-dev-shm-usage']
    });
    const page = await browser.newPage({
      viewport:{width:390,height:844},timezoneId:'Asia/Baghdad',serviceWorkers:'block'
    });
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('aoqatReminderInboxV1',JSON.stringify([{
        id:'help-scope-friday-1',kind:'friday',section:'friday',
        title:'تذكير بقراءة سورة الكهف',body:'التذكير الأصلي مع تفاصيله',
        createdAt:Date.now(),topicId:'kahf',action:'detail',targetDate:''
      }]));
    });
    await page.route('**/rest/**',r=>r.abort());
    await page.goto('http://127.0.0.1:8895/',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-drawer="reminderInbox"]',{state:'attached'});
    await page.evaluate(()=>document.body.classList.add('design-menu-open'));
    await page.locator('[data-drawer="reminderInbox"]').click();
    const item=page.locator('#reminderInbox button[data-reminder-id]').first();
    await item.waitFor({state:'visible'});
    await page.waitForTimeout(350);
    assert.equal(await page.locator('#reminderInbox button.aoqat-help-eligible').count(),0,
      'History entries must not have generic help circles');
    assert.equal(await item.getAttribute('class'),'main-action','Do not change original reminder button styling');
    assert.match(await item.textContent(),/تذكير بقراءة سورة الكهف/);
    await item.click({position:{x:175,y:23}});
    await page.locator('#reminderInbox p').filter({hasText:'التذكير الأصلي مع تفاصيله'}).waitFor();
    assert.equal(await page.locator('#reminderInbox button.aoqat-help-eligible').count(),0,
      'Detail action is not a generic settings help target');
    await page.locator('#webDrawerSub .web-back').click();
    await page.locator('[data-drawer="alertSettings"]').click();
    const settings=page.locator('#webSubBody [data-alert-section="friday"]');
    await settings.waitFor({state:'visible'});
    await page.waitForTimeout(350);
    assert.ok(await settings.evaluate(el=>el.classList.contains('aoqat-help-eligible')),
      'Real settings must retain useful help');
    assert.deepEqual(errors,[]);
    console.log('PASS: notification entries and details have no useless help; setting controls keep help and actions work');
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
