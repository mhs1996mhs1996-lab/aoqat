/* Shared prayer time semantics: the database uses 12-hour afternoon values. */
(function (root) {
  "use strict";
  const ids = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  function minutes(value, id) {
    const m = String(value || "").match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    let h = +m[1],
      n = +m[2];
    if (h > 23 || n > 59) return null;
    if (["asr", "maghrib", "isha"].includes(id) && h < 12) h += 12;
    if (["fajr", "sunrise"].includes(id) && h === 12) h = 0;
    return h * 60 + n;
  }
  function defaults() {
    return {
      enabled: false,
      sound: "1",
      volume: 80,
      partial: false,
      customEnd: 35,
      overrideSilent: false,
      vibrate: false,
      pattern: "short",
      screen: false,
      flip: false,
      persistent: false,
      reminder: 0,
      suhoor: 0,
      widget: "transparent",
      afterSilent: 0,
      modes: Object.fromEntries([...ids, "friday"].map((id) => [id, "sound"])),
    };
  }
  function normalize(raw) {
    const d = defaults(),
      s = raw && typeof raw === "object" ? raw : {};
    for (const k of [
      "enabled",
      "partial",
      "overrideSilent",
      "vibrate",
      "screen",
      "flip",
      "persistent",
    ])
      d[k] = s[k] === true;
    for (const [k, max] of [
      ["volume", 100],
      ["customEnd", 180],
      ["reminder", 60],
      ["suhoor", 120],
      ["afterSilent", 60],
    ]) {
      const n = Number(s[k]);
      if (Number.isFinite(n)) d[k] = Math.max(0, Math.min(max, n));
    }
    if (["1", "2", "3", "4", "custom"].includes(s.sound)) d.sound = s.sound;
    if (["short", "long", "pulse"].includes(s.pattern)) d.pattern = s.pattern;
    if (["transparent", "light", "dark"].includes(s.widget))
      d.widget = s.widget;
    for (const id of [...ids, "friday"])
      if (["sound", "vibrate", "silent"].includes(s.modes?.[id]))
        d.modes[id] = s.modes[id];
    return d;
  }
  function events(rows, now = new Date()) {
    const out = [];
    for (let offset = 0; offset < 2; offset++) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
      );
      const r = rows.find(
        (r) =>
          +r.gregorian_month === date.getMonth() + 1 &&
          +r.gregorian_day === date.getDate(),
      );
      if (r)
        for (const id of ids) {
          const min = minutes(r[id], id);
          if (min !== null)
            out.push({
              id,
              at: new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                0,
                min,
              ).getTime(),
              friday: id === "dhuhr" && date.getDay() === 5,
            });
        }
    }
    return out.sort((a, b) => a.at - b.at);
  }
  const api = { ids, minutes, defaults, normalize, events };
  root.AoqatAdhanCore = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
