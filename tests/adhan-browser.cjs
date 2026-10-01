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
      r.fulfill({ json: [row] }),
    );
    await page.goto("http://127.0.0.1:8765", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-drawer="adhanIqama"]', {
      state: "attached",
    });
    await page.evaluate(() => document.body.classList.add("design-menu-open"));
    await page.locator('[data-drawer="adhanIqama"]').click();
    await page
      .getByRole("button", { name: "🔊 الأذان والخدمات", exact: true })
      .click();
    await assert.equal(
      await page.locator("#adEnable").getAttribute("aria-pressed"),
      "false",
    );
    await assert.equal(
      await page.locator("#adhanPanel fieldset").isDisabled(),
      true,
    );
    await page.locator("#adEnable").click();
    assert.equal(
      await page.locator("#adEnable").getAttribute("aria-pressed"),
      "true",
    );
    await page.locator('[data-prayer="fajr"][data-mode="silent"]').click();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.aoqatAdhanV1).modes.fajr,
      ),
      "silent",
    );
    await page.locator('[data-setting="sound"]').selectOption("3");
    await page.locator('[data-setting="partial"]').check();
    assert.equal(
      await page.evaluate(() => JSON.parse(localStorage.aoqatAdhanV1).partial),
      true,
    );
    await page.locator('[data-service="quran"]').click();
    await page.waitForSelector("#adSurah");
    await page.locator("#adSurah").selectOption("114");
    assert.ok(
      (await page.locator("#adVerses").textContent()).includes("ٱلنَّاسِ"),
    );
    await page.locator('[data-service="azkar"]').click();
    await page.locator("#adAzkarKind").selectOption("prayer");
    const first = page.locator('[data-dhikr="0"]');
    await first.click();
    assert.equal(await first.getAttribute("data-remaining"), "2");
    await page.locator("#adEnable").click();
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
