'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',
    args:['--no-sandbox','--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    await page.setContent('<main><section id="reminderInbox"><p>تظهر هنا التذكيرات لمدة 24 ساعة من صدورها.</p><button id="reminder">تذكير قراءة الكهف</button></section></main>');
    await page.addScriptTag({path:'scripts/v210-partial-delivery-proof.js'});
    await page.locator('#aoqatV210PartialDeliveryProof').waitFor();
    assert.match(await page.locator('#aoqatV210PartialDeliveryProof').textContent(),/وصل التحديث الجزئي 2\.10/);
    assert.equal(await page.locator('#reminder').textContent(),'تذكير قراءة الكهف');
    assert.equal(await page.locator('#aoqatV210PartialDeliveryProof').count(),1);
    await page.evaluate(() => {
      document.getElementById('reminderInbox').outerHTML =
        '<section id="reminderInbox"><p>تم تحديث الإشعارات</p><button id="reminder2">تذكير آخر</button></section>';
    });
    await page.locator('#aoqatV210PartialDeliveryProof').waitFor();
    assert.equal(await page.locator('#aoqatV210PartialDeliveryProof').count(),1,
      'Marker should reappear exactly once after inbox rerenders');
    assert.equal(await page.locator('#reminder2').textContent(),'تذكير آخر');
    console.log('PASS: v2.10 proof marker appears only when the separately updated JS runs, without changing reminder actions');
  } finally {
    await browser.close();
  }
})().catch(err=>{ console.error(err); process.exitCode=1; });