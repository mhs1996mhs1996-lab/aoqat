const { test } = require("node:test");
const assert = require("node:assert/strict");
const C = require("../js/adhan-core.js");
test("database time semantics keep pre-noon dhuhr, afternoon and sunrise correct", () => {
  assert.equal(C.minutes("11:59", "dhuhr"), 719);
  assert.equal(C.minutes("12:00", "dhuhr"), 720);
  assert.equal(C.minutes("3:22", "asr"), 922);
  assert.equal(C.minutes("5:53", "maghrib"), 1073);
  assert.equal(C.minutes("7:13", "isha"), 1153);
  assert.equal(C.minutes("6:04", "sunrise"), 364);
  assert.equal(C.minutes("4:43", "fajr"), 283);
  assert.equal(C.minutes("26:00", "fajr"), null);
  assert.equal(C.minutes("4:99", "fajr"), null);
});
test("fresh install is disabled, settings are bounded and independent", () => {
  const d = C.defaults();
  assert.equal(d.enabled, false);
  assert.equal(d.persistent, false);
  const s = C.normalize({
    enabled: true,
    volume: 900,
    modes: { fajr: "silent", friday: "vibrate" },
    reminder: -1,
  });
  assert.equal(s.volume, 100);
  assert.equal(s.reminder, 0);
  assert.equal(s.modes.fajr, "silent");
  assert.equal(s.modes.friday, "vibrate");
  assert.equal(s.modes.dhuhr, "sound");
  assert.equal(C.defaults().modes.fajr, "sound");
});
test("next-day and Friday schedule include five prayers and no sunrise adhan", () => {
  const now = new Date(2026, 9, 2, 23, 59);
  const rows = [
    {
      gregorian_month: 10,
      gregorian_day: 2,
      fajr: "4:43",
      sunrise: "6:04",
      dhuhr: "11:59",
      asr: "3:22",
      maghrib: "5:53",
      isha: "7:13",
    },
    {
      gregorian_month: 10,
      gregorian_day: 3,
      fajr: "4:44",
      dhuhr: "11:59",
      asr: "3:22",
      maghrib: "5:53",
      isha: "7:13",
    },
  ];
  const e = C.events(rows, now);
  assert.equal(e.length, 10);
  assert.equal(e.find((e) => e.id === "dhuhr").friday, true);
  assert.equal(e.find((e) => e.at > now).id, "fajr");
  assert.equal(e.filter((e) => e.id === "sunrise").length, 0);
  assert.equal(new Date(e.find((e) => e.id === "dhuhr").at).getHours(), 11);
});
test("packaged Quran and four full/partial recordings are present", () => {
  const fs = require("node:fs");
  const q = JSON.parse(fs.readFileSync("assets/quran.json"));
  assert.equal(q.length, 114);
  assert.equal(
    q.reduce((n, s) => n + s.verses.length, 0),
    6236,
  );
  for (let i = 1; i <= 4; i++) {
    assert.ok(fs.statSync(`assets/audio/adhan-${i}.mp3`).size > 100000);
    assert.ok(fs.statSync(`assets/audio/adhan-${i}-short.mp3`).size > 10000);
  }
});
