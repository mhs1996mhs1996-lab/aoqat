const prayerFixture=require('./prayer-db-fixture.cjs');
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
(async () => {
  const server = spawn("python3", ["-m", "http.server", "8765"], {
    stdio: "ignore",
  });
  let browser;
  try {
    await new Promise((r) => setTimeout(r, 800));
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await page.addInitScript(() => {
      const OriginalAudio = window.Audio;
      window.Audio = function (src) {
        const a = new OriginalAudio(src);
        window.testAdhanAudio = a;
        return a;
      };
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.stack));
    const row = {
      gregorian_month: new Date().getMonth() + 1,
      gregorian_day: new Date().getDate(),
      fajr: "4:43",
      sunrise: "6:04",
      dhuhr: "11:59",
      asr: "3:22",
      maghrib: "5:53",
      isha: "7:13",
    };
    await page.route("**/rest/v1/annual_prayer_times**", (r) =>
      r.fulfill({ json: prayerFixture(r,[row] )}),
    );
    await page.goto("http://127.0.0.1:8765", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-drawer="adhanIqama"]', {
      state: "attached",
    });
    await page.evaluate(() => document.body.classList.add("design-menu-open"));
    await page.locator('[data-drawer="adhanIqama"]').click();
    await page
      .getByRole("button", { name: "🔊 الأذان والتنبيه", exact: true })
      .click();
    await assert.equal(
      await page.locator("#adEnable").getAttribute("aria-pressed"),
      "false",
    );
    await assert.equal(
      await page.locator('[data-setting="sound"]').isDisabled(),
      true,
    );
    await page.screenshot({ path: "/tmp/aoqat-adhan-off.png" });
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await page.locator("#adEnable").click();
    await page.screenshot({ path: "/tmp/aoqat-adhan-on.png" });
    assert.equal(
      await page.locator("#adEnable").getAttribute("aria-pressed"),
      "true",
    );
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await page.locator('#paMethodOpen').click();await page.locator('[data-ad-section="modes"]').click();
    await page.locator('[data-prayer="fajr"][data-mode="silent"]').click();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.aoqatAdhanV1).modes.fajr,
      ),
      "silent",
    );
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());if(!await page.locator('#paMethodPanel').isVisible())await page.locator('#paMethodOpen').click();await page.locator('[data-ad-section="sound"]').click();
    await page.locator('[data-setting="sound"]').selectOption("3");
    await page.locator('[data-setting="partial"]').check();
    assert.equal(
      await page.evaluate(() => JSON.parse(localStorage.aoqatAdhanV1).partial),
      true,
    );
    await page.locator("#adPreview").click();
    await page.waitForFunction(
      () =>
        window.testAdhanAudio?.readyState >= 2 && !window.testAdhanAudio.paused,
    );
    assert.ok(
      await page.evaluate(() =>
        window.testAdhanAudio.src.endsWith("adhan-v124-3-short.mp3"),
      ),
    );
    await page.locator("#adStop").click();
    assert.equal(await page.evaluate(() => window.testAdhanAudio.paused), true);
    await page.locator("#adFile").setInputFiles("assets/audio/adhan-v124-1.mp3");
    await page.waitForFunction(
      () => JSON.parse(localStorage.aoqatAdhanV1).sound === "custom",
    );
    await page.locator("#adPreview").click();
    await page.waitForFunction(
      () =>
        window.testAdhanAudio?.src.startsWith("blob:") &&
        window.testAdhanAudio.readyState >= 2 &&
        !window.testAdhanAudio.paused,
    );
    await page.locator("#adStop").click();
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await page.locator("#adhanServicesBack").click();
    await page.locator(".web-back").click();
    await page.locator('[data-drawer="quran"]').click();
    await page.waitForSelector("#aqReader");
    await page.locator('[data-qr-panel="index"]').click();
    await page.waitForSelector("#adSurah");
    await page.locator("#adSurah").selectOption("114");
    assert.ok(
      (await page.locator("#adVerses").textContent()).includes("ٱلنَّاسِ"),
    );
    await page.locator(".web-back").click();
    await page.locator('[data-drawer="azkar"]').click();
    await page.locator('[data-azkar-kind="prayer"]').click();
    const first = page.locator('[data-dhikr="0"]');
    await first.click();
    assert.equal(await first.getAttribute("data-remaining"), "2");
    await page.locator("#webDrawerSub .web-back").click();
    await page.locator('[data-drawer="datePrayer"]').click();
    assert.equal(
      await page.locator('#webSubBody [data-panel="iqamaPanel"]').count(),
      0,
    );
    await page.locator("#webDrawerSub .web-back").click();
    await page.locator('[data-drawer="adhanIqama"]').click();
    await page
      .getByRole("button", { name: "🔊 الأذان والتنبيه", exact: true })
      .click();
    await page.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await page.locator("#adEnable").click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#adEnable", { state: "attached" });
    assert.equal(
      await page.evaluate(() => JSON.parse(localStorage.aoqatAdhanV1).enabled),
      false,
    );
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.aoqatAdhanV1).modes.fajr,
      ),
      "silent",
    );
    const phone = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await phone.addInitScript(() => {
      window.nativeCalls = [];
      window.AndroidNative = {
        readAdhanSettings: () => "{}",
        configureAdhan: (json) =>
          window.nativeCalls.push(["configure", JSON.parse(json)]),
        cachePrayerRows: () => {},
        previewAdhan: (json) =>
          window.nativeCalls.push(["preview", JSON.parse(json)]),
        stopAdhan: () => {},
        chooseAdhanAudio: () => window.nativeCalls.push(["choose"]),
        pinPrayerWidget: () => window.nativeCalls.push(["widget"]),
        adhanPermissions: () => window.nativeCalls.push(["permissions"]),
        openQibla: () => window.nativeCalls.push(["qibla"]),
      };
    });
    phone.on("pageerror", (e) => errors.push(e.stack));
    await phone.route("**/rest/v1/annual_prayer_times**", (r) =>
      r.fulfill({ json: prayerFixture(r,[row] )}),
    );
    await phone.goto("http://127.0.0.1:8765", {
      waitUntil: "domcontentloaded",
    });
    await phone.waitForSelector('[data-drawer="adhanIqama"]', {
      state: "attached",
    });
    await phone.evaluate(() => document.body.classList.add("design-menu-open"));
    await phone.locator('[data-drawer="adhanIqama"]').click();
    await phone
      .getByRole("button", { name: "🔊 الأذان والتنبيه", exact: true })
      .click();
    assert.equal(await phone.locator('[data-setting="screen"]').count(), 1);
    await phone.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await phone.locator("#adEnable").click();
    await phone.evaluate(()=>window.aoqatCloseSettingsLeaves?.());if(await phone.locator('#paMethodOpen').isVisible())await phone.locator('#paMethodOpen').click();await phone.locator('[data-ad-section="notifications"]').click();
    await phone.locator('[data-setting="screen"]').check();
    await phone.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await phone.locator('[data-ad-section="services"]').click();
    await phone.locator('[data-service="widget"]').click();
    await phone.locator('[data-setting="persistent"]').check();
    await phone.locator("#adWidget").click();
    await phone.evaluate(()=>window.aoqatCloseSettingsLeaves?.());await phone.locator('[data-ad-section="sound"]').click();
    await phone.locator("#adPreview").click();
    await phone.locator("#adChoose").click();
    assert.ok(
      await phone.evaluate(() =>
        window.nativeCalls.some(
          (x) =>
            x[0] === "configure" &&
            x[1].enabled &&
            x[1].screen &&
            x[1].persistent,
        ),
      ),
    );
    assert.ok(
      await phone.evaluate(() =>
        ["widget", "preview", "choose"].every((k) =>
          window.nativeCalls.some((x) => x[0] === k),
        ),
      ),
    );
    await phone.screenshot({ path: "/tmp/aoqat-adhan-phone.png" });
    await phone.close();
    const own = errors.filter((e) =>
      /adhan-settings|adhan-core|web-menu-order/.test(e),
    );
    assert.deepEqual(own, []);
    console.log(
      "Adhan browser checks passed; existing page errors:",
      errors.map((e) => e.split("\n")[0]),
    );
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
