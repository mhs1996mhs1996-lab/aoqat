const prayerFixture=require('./prayer-db-fixture.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8768'], { stdio: 'ignore' });
  let browser;
  try {
    await new Promise(r => setTimeout(r, 700));
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Baghdad' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.stack));
    await page.addInitScript(() => {
      const RealDate = Date;
      window.__adhanTestTime = new RealDate('2026-10-02T15:36:59+03:00').getTime();
      window.Date = class extends RealDate {
        constructor(...args) { super(...(args.length ? args : [window.__adhanTestTime])); }
        static now() { return window.__adhanTestTime; }
      };
      const AudioClass = window.Audio;
      window.Audio = function (src) { const a = new AudioClass(src); window.__adhanTestAudio = a; return a; };
      if (!localStorage.getItem('adhanSectionsSeeded')) {
        localStorage.setItem('aoqatAdhanV1', JSON.stringify({ enabled: false, sound: '4', volume: 52, partial: true,
          reminder: 4, suhoor: 20, pattern: 'pulse', modes: { fajr: 'silent', asr: 'sound', friday: 'vibrate' } }));
        localStorage.setItem('aoqatIqamaMinutesV1', JSON.stringify({ fajr: 25, dhuhr: 10, asr: 15, maghrib: 5, isha: 20, friday: 15 }));
        localStorage.setItem('aoqatAfterIqamaMinutesV1', JSON.stringify({ fajr: 10, dhuhr: 20, asr: 30, maghrib: 5, isha: 25 }));
        localStorage.setItem('adhanSectionsSeeded', '1');
      }
    });
    await page.route('**/rest/v1/annual_prayer_times**', r => r.fulfill({ json: prayerFixture(r,[{ gregorian_month: 10, gregorian_day: 2,
      fajr: '4:43', sunrise: '6:04', dhuhr: '11:59', asr: '3:22', maghrib: '5:53', isha: '7:13' }] )}));
    async function openAdhan() {
      await page.waitForSelector('[data-drawer="adhanIqama"]', { state: 'attached' });
      await page.evaluate(() => document.body.classList.add('design-menu-open'));
      await page.locator('[data-drawer="adhanIqama"]').click();
      await page.getByRole('button', { name: '🔊 الأذان والتنبيه', exact: true }).click();
    }
    async function setMinutes(id, value) {
      const input = page.locator(`[data-silent-minutes="${id}"]`);
      await input.fill(String(value)); await input.dispatchEvent('change');
    }
    await page.goto('http://127.0.0.1:8768', { waitUntil: 'domcontentloaded' });
    await openAdhan();
    await page.waitForFunction(() => document.getElementById('adTimes').textContent.includes('4:43'));
    assert.equal(await page.locator('#adTimes tr').count(), 6);
    assert.equal(await page.locator('[data-ad-section]').count(), 4);
    for (const id of ['sound', 'notifications', 'modes']) {
      assert.equal(await page.locator(`[data-ad-section="${id}"]`).isDisabled(), true);
      assert.equal(await page.locator(`#adSection-${id}`).isVisible(), false);
    }
    assert.equal(await page.locator('#adRefresh').isEnabled(), true);
    await page.screenshot({ path: '/tmp/aoqat-adhan-sections-off.png', fullPage: true });
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await page.locator('#adEnable').click();
    for (const id of ['sound', 'notifications', 'modes'])
      assert.equal(await page.locator(`[data-ad-section="${id}"]`).isEnabled(), true);
    await page.screenshot({ path: '/tmp/aoqat-adhan-sections-home.png', fullPage: true });
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());if(!await page.locator('#paMethodPanel').isVisible())await page.locator('#paMethodOpen').click();await page.locator('[data-ad-section="sound"]').click();
    assert.equal(await page.locator('[data-setting="sound"]').inputValue(), '4');
    assert.equal(await page.locator('[data-setting="volume"]').inputValue(), '52');
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());if(await page.locator('#paMethodOpen').isVisible())await page.locator('#paMethodOpen').click();await page.locator('[data-ad-section="notifications"]').click();
    assert.equal(await page.locator('#adSection-sound').isVisible(), false);
    await page.locator('#adSection-notifications > header button').click();
    await page.locator('#adSilentSettingsToggle').click();
    assert.equal(await page.locator('[data-silent-minutes="asr"]').isDisabled(), true);
    await page.locator('#adSilentAfterEnabled').check();
    await setMinutes('asr', 7); await setMinutes('maghrib', 9);
    await page.screenshot({ path: '/tmp/aoqat-adhan-after-iqama.png', fullPage: true });
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await page.locator("#adhanServicesBack").click(); await page.locator(".web-back").click();
    await page.locator('[data-drawer="azkar"]').click();
    assert.equal(await page.locator('#adAzkarList').isVisible(), false);
    await page.locator('[data-azkar-kind="morning"]').click();
    await page.locator('[data-dhikr="0"]').click();
    assert.equal(await page.locator('[data-dhikr="0"]').getAttribute('data-remaining'), '0');
    await page.locator(".web-back").click();
    await page.locator('[data-drawer="quran"]').click();
    await page.waitForSelector('#aqReader');
    await page.locator('[data-qr-panel="index"]').click();
    await page.waitForSelector('#adSurah');
    await page.locator('#adSurah').selectOption('114');
    await page.locator(".web-back").click();
    await page.locator('[data-drawer="azkar"]').click();
    assert.equal(await page.locator('[data-dhikr="0"]').getAttribute('data-remaining'), '0');
    await page.screenshot({ path: '/tmp/aoqat-adhan-services.png', fullPage: true });
    await page.locator(".web-back").click();
    await page.locator('[data-drawer="quran"]').click();
    await page.waitForSelector('#aqReader');
    await page.locator('[data-qr-panel="index"]').click();
    assert.equal(await page.locator('#adSurah').inputValue(), '114');
    await page.locator('#aqCloseSheet').click();
    await page.locator(".web-back").click(); await openAdhan();
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());if(!await page.locator('#paMethodPanel').isVisible())await page.locator('#paMethodOpen').click();await page.locator('[data-ad-section="sound"]').click();
    await page.locator('#adPreview').click();
    await page.waitForFunction(() => window.__adhanTestAudio?.readyState >= 2 && !window.__adhanTestAudio.paused);
    assert.equal(await page.evaluate(() => window.__adhanTestAudio.muted), false);
    await page.evaluate(() => window.__adhanTestTime = new Date(2026, 9, 2, 15, 37).getTime());
    await page.waitForFunction(() => window.__adhanTestAudio.muted === true);
    assert.equal(await page.evaluate(() => window.__adhanTestAudio.volume), 0.52);
    await page.evaluate(() => window.__adhanTestTime = new Date(2026, 9, 2, 15, 44).getTime());
    await page.waitForFunction(() => window.__adhanTestAudio.muted === false);
    assert.equal(await page.evaluate(() => window.__adhanTestAudio.volume), 0.52);
    await page.locator('#adStop').click();
    await page.reload({ waitUntil: 'domcontentloaded' }); await openAdhan();
    assert.equal(await page.locator('#adSection-notifications').isVisible(), false);
    const saved = await page.evaluate(() => JSON.parse(localStorage.aoqatAdhanV1));
    assert.equal(saved.afterIqamaSilent.enabled, true);
    assert.equal(saved.afterIqamaSilent.minutes.asr, 7);
    assert.equal(saved.afterIqamaSilent.minutes.maghrib, 9);
    assert.equal(saved.volume, 52); assert.equal(saved.sound, '4'); assert.equal(saved.partial, true);
    assert.equal(saved.modes.fajr, 'silent'); assert.equal(saved.modes.friday, 'vibrate');
    assert.equal(saved.reminder, 4); assert.equal(saved.suhoor, 20);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.aoqatIqamaMinutesV1)),
      { fajr: 25, dhuhr: 10, asr: 15, maghrib: 5, isha: 20, friday: 15 });
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.aoqatAfterIqamaMinutesV1)),
      { fajr: 10, dhuhr: 20, asr: 30, maghrib: 5, isha: 25 });
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());if(await page.locator('#paMethodOpen').isVisible())await page.locator('#paMethodOpen').click();await page.locator('[data-ad-section="notifications"]').click();
    await page.locator('#adSection-notifications > header button').click();
    await page.locator('#adSilentSettingsToggle').click();
    assert.equal(await page.locator('[data-silent-minutes="asr"]').inputValue(), '7');
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await page.locator('#adEnable').click();
    assert.equal(await page.locator('#adSection-notifications').isVisible(), false);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.aoqatAdhanV1).afterIqamaSilent.minutes.asr), 7);
    assert.equal(await page.locator('[data-ad-section="services"]').count(), 0);
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await page.locator("#adhanServicesBack").click(); await page.locator(".web-back").click();
    for (const kind of ['quran','qibla','azkar']) {
      const row=page.locator(`[data-drawer="${kind}"]`);
      assert.equal(await row.getAttribute('class'), 'web-drawer-row');
      await row.click();
      assert.equal(await page.locator('#prayerServicePanel').isVisible(), true);
      if(kind==='quran')await page.waitForSelector('#aqReader');
      assert.equal(await page.locator('#adService').isVisible(), true);
      if(kind==='qibla')assert.equal(await page.locator('#adQiblaStart').isEnabled(),true);
      await page.locator('.web-back').click();
    }
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.aoqatAdhanV1).enabled),false);
    await openAdhan();
    await page.setViewportSize({ width: 320, height: 740 });
    assert.ok(await page.locator('#adhanPanel').evaluate(e => e.scrollWidth <= e.clientWidth + 1));
    assert.deepEqual(errors, []);
    console.log('Compact adhan sections, services, master gating, settings preservation and exact seven-minute quiet preview passed');
  } finally { await browser?.close(); server.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
