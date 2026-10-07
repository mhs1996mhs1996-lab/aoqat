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
    assert.ok(fs.statSync(`assets/audio/adhan-v124-${i}.mp3`).size > 100000);
    assert.ok(fs.statSync(`assets/audio/adhan-v124-${i}-short.mp3`).size > 10000);
  }
});

test("after-iqama silent durations stay independent of existing adhan settings", () => {
  const s = C.normalize({ enabled: true, sound: "4", volume: 52,
    modes: { asr: "vibrate" }, afterSilent: 8,
    afterIqamaSilent: { enabled: true, minutes: { asr: 7, fajr: 200, isha: -1, maghrib: 5.8 } } });
  assert.equal(s.sound, "4");
  assert.equal(s.volume, 52);
  assert.equal(s.afterSilent, 8);
  assert.equal(s.modes.asr, "vibrate");
  assert.deepEqual(s.afterIqamaSilent.minutes, { fajr: 120, dhuhr: 0, asr: 7, maghrib: 5, isha: 0 });
  assert.equal(C.defaults().afterIqamaSilent.enabled, false);
  assert.equal(C.defaults().afterIqamaSilent.minutes.asr, 0);
});

test("seven-minute silent window begins at configured asr iqama and ends exactly", () => {
  const rows = [{ gregorian_month: 10, gregorian_day: 2, asr: "3:22", dhuhr: "11:59" }];
  const s = C.normalize({ enabled: true, afterIqamaSilent: { enabled: true, minutes: { asr: 7 } } });
  const at = (h, m, sec = 0) => new Date(2026, 9, 2, h, m, sec);
  assert.equal(C.afterIqamaSilentWindow(rows, at(15, 36, 59), s, { asr: 15 }), null);
  const w = C.afterIqamaSilentWindow(rows, at(15, 37), s, { asr: 15 });
  assert.equal(w.prayerId, "asr");
  assert.equal(w.start, +at(15, 37));
  assert.equal(w.end, +at(15, 44));
  assert.ok(C.afterIqamaSilentWindow(rows, at(15, 43, 59), s, { asr: 15 }));
  assert.equal(C.afterIqamaSilentWindow(rows, at(15, 44), s, { asr: 15 }), null);
  assert.equal(C.afterIqamaSilentWindow(rows, at(15, 38), s, { asr: 20 }), null);
  s.enabled = false;
  assert.equal(C.afterIqamaSilentWindow(rows, at(15, 38), s, { asr: 15 }), null);
  s.enabled = true; s.afterIqamaSilent.enabled = false;
  assert.equal(C.afterIqamaSilentWindow(rows, at(15, 38), s, { asr: 15 }), null);
});

test("silent window can cross midnight without starting at adhan or resetting on reload", () => {
  const rows = [{ gregorian_month: 10, gregorian_day: 2, isha: "11:40" }];
  const s = C.normalize({ enabled: true, afterIqamaSilent: { enabled: true, minutes: { isha: 20 } } });
  const w = C.afterIqamaSilentWindow(rows, new Date(2026, 9, 3, 0, 2), s, { isha: 15 });
  assert.equal(w.start, +new Date(2026, 9, 2, 23, 55));
  assert.equal(w.end, +new Date(2026, 9, 3, 0, 15));
  assert.equal(C.afterIqamaSilentWindow(rows, new Date(2026, 9, 3, 0, 15), s, { isha: 15 }), null);
});

test("services display switches at database Isha plus 35 minutes without shifting alarms", () => {
  const rows = [{gregorian_month:10,gregorian_day:7,isha:"7:05",fajr:"4:49"},{gregorian_month:10,gregorian_day:8,isha:"7:04",fajr:"4:50"}];
  const before = new Date(2026,9,7,19,39,59), after = new Date(2026,9,7,19,40);
  assert.equal(C.displayDate(rows,before).getDate(),7);
  assert.equal(C.displayDate(rows,after).getDate(),8);
  assert.equal(C.displayDate(rows,new Date(2026,9,8,0,1)).getDate(),8);
  assert.equal(C.displayDate(rows,new Date(2026,9,8,4,0)).getDate(),8);
  assert.equal(C.events(rows,after).find(e=>e.id==='fajr'&&e.at>+after).at,+new Date(2026,9,8,4,50));
  assert.equal(C.displayDate([{gregorian_month:12,gregorian_day:31,isha:'19:00'}],new Date(2026,11,31,19,35)).getFullYear(),2027);
  assert.equal(C.displayDate([],after).getDate(),7);
  assert.equal(C.displayDate([{gregorian_month:10,gregorian_day:7,isha:'invalid'}],after).getDate(),7);
});
