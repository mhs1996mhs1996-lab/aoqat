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
  function fridayDefaults(){return {enabled:false,reminder:15,sermon:35,firstSound:true,secondSound:true,quiet:true,quietMode:'silent',quietTiming:'default',quietBefore:15};}
  function normalizeFriday(raw={}){const d=fridayDefaults();d.enabled=raw?.enabled===true;d.quiet=raw?.quiet!==false;for(const k of ['firstSound','secondSound'])d[k]=raw?.[k]!==false;for(const [k,min,max] of [['reminder',1,180],['sermon',1,120],['quietBefore',0,180]]){const n=Number(raw?.[k]);if(Number.isFinite(n))d[k]=Math.max(min,Math.min(max,Math.floor(n)));}if(raw?.quietMode==='dnd')d.quietMode='dnd';if(raw?.quietTiming==='custom')d.quietTiming='custom';return d;}
  function fridayTimeline(at,raw){const f=normalizeFriday(raw);return {first:at-15*60000,second:at,start:at-(15+f.reminder)*60000,end:at+f.sermon*60000,quietStart:at-(15+(f.quietTiming==='custom'?f.quietBefore:15))*60000};}
  function fridayFrame(at,now,raw){const f=normalizeFriday(raw),t=fridayTimeline(at,f);if(!f.enabled||now<t.start||now>=t.end)return null;if(now<t.first)return {label:'باقي على أذان الجمعة الأول',seconds:Math.ceil((t.first-now)/1000),down:true,base:t.first,next:t.first};if(now<t.second)return {label:'باقي على الخطبة',seconds:Math.ceil((t.second-now)/1000),down:true,base:t.second,next:t.second};return {label:'مضى على الخطبة',seconds:Math.floor((now-t.second)/1000),down:false,base:t.second,next:t.end};}
  function fridayAt(rows,now=new Date()){if(now.getDay()!==5)return null;const r=rows.find(r=>+r.gregorian_month===now.getMonth()+1&&+r.gregorian_day===now.getDate()),m=minutes(r?.dhuhr,'dhuhr');return m===null?null:new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,m).getTime();}
  function fridayQuietWindow(rows,now,settings){const f=normalizeFriday(settings?.friday),at=fridayAt(rows,now);if(!f.enabled||!f.quiet||at===null)return null;const t=fridayTimeline(at,f);return +now>=t.quietStart&&+now<t.end?{prayerId:'friday',start:t.quietStart,end:t.end}:null;}
  function defaults() {
    return {
      friday: fridayDefaults(),
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
      afterIqamaSilent: {
        enabled: false,
        minutes: Object.fromEntries(ids.map((id) => [id, 0])),
      },
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
    d.afterIqamaSilent.enabled = s.afterIqamaSilent?.enabled === true;
    for (const id of ids) {
      const n = Number(s.afterIqamaSilent?.minutes?.[id]);
      if (Number.isFinite(n))
        d.afterIqamaSilent.minutes[id] = Math.max(0, Math.min(120, Math.floor(n)));
    }
    d.friday = normalizeFriday(s.friday);
    return d;
  }
  function events(rows, now = new Date(), settings) {
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
    if(settings?.friday?.enabled){const custom=[];for(const e of out){if(!e.friday){custom.push(e);continue;}custom.push({...e,id:'fridayFirst',at:e.at-15*60000,customFriday:true},{...e,id:'fridaySecond',customFriday:true});}return custom.sort((a,b)=>a.at-b.at);}
    return out.sort((a, b) => a.at - b.at);
  }
  function displayDate(rows, now = new Date()) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const row = rows.find(r => +r.gregorian_month === date.getMonth() + 1 && +r.gregorian_day === date.getDate());
    const isha = minutes(row?.isha, "isha");
    if (isha !== null && +now >= +date + (isha + 35) * 60000) date.setDate(date.getDate() + 1);
    return date;
  }
  function afterIqamaSilentWindow(rows, now, settings, iqamaMinutes = {}) {
    const s = normalize(settings);
    if (!s.enabled || !s.afterIqamaSilent.enabled) return null;
    // Include yesterday so an evening window can finish after midnight.
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const candidates = events(rows, yesterday).concat(events(rows, now));
    const active = [];
    const seen = new Set();
    for (const prayer of candidates) {
      if (prayer.friday && s.friday.enabled) continue;
      const key = prayer.id + ":" + prayer.at;
      if (seen.has(key)) continue;
      seen.add(key);
      const duration = s.afterIqamaSilent.minutes[prayer.id];
      const savedIqama = Number(iqamaMinutes[prayer.id]);
      const before = [5, 10, 15, 20, 25, 30].includes(savedIqama)
        ? savedIqama : prayer.id === "fajr" ? 20 : 10;
      const start = prayer.at + before * 60000;
      const end = start + duration * 60000;
      if (duration > 0 && +now >= start && +now < end)
        active.push({ prayerId: prayer.id, start, end });
    }
    if (!active.length) return null;
    active.sort((a, b) => b.start - a.start);
    return { ...active[0], end: Math.max(...active.map((w) => w.end)) };
  }
  const api = { ids, minutes, defaults, normalize, events, displayDate, afterIqamaSilentWindow, fridayDefaults, normalizeFriday, fridayTimeline, fridayFrame, fridayAt, fridayQuietWindow };
  root.AoqatAdhanCore = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window === "undefined" ? globalThis : window);

