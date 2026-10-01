(function () {
  "use strict";
  const C = window.AoqatAdhanCore,
    KEY = "aoqatAdhanV1",
    names = {
      fajr: "الفجر",
      sunrise: "الشروق",
      dhuhr: "الظهر",
      asr: "العصر",
      maghrib: "المغرب",
      isha: "العشاء",
      friday: "الجمعة",
    },
    native = !!window.Android?.configureAdhan;
  let state;
  try {
    state = C.normalize(
      JSON.parse(
        native && window.Android.readAdhanSettings
          ? window.Android.readAdhanSettings()
          : localStorage.getItem(KEY) || "{}",
      ),
    );
  } catch (_) {
    state = C.defaults();
  }
  let rows = [],
    panel,
    audio,
    customURL,
    playing = false,
    lastTick = Date.now(),
    quran,
    service = "",
    orientationHandler,
    locationBearing;
  const $ = (id) => document.getElementById(id),
    escape = (s) =>
      String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  function status(s) {
    if ($("adStatus")) $("adStatus").textContent = s;
  }
  function persist() {
    localStorage.setItem(KEY, JSON.stringify(state));
    if (native) window.Android.configureAdhan(JSON.stringify(state));
    document
      .querySelector('[data-drawer="adhanIqama"]')
      ?.classList.toggle("adhan-on", state.enabled);
    window.dispatchEvent(new Event("aoqatAdhanChanged"));
  }
  function audioDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("aoqat-audio", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("files");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function customAudio(file) {
    const db = await audioDB();
    await new Promise((res, rej) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(file, "adhan");
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    db.close();
    localStorage.setItem("aoqatAudioName", file.name);
    state.sound = "custom";
    persist();
    render();
    status(
      "تم حفظ صوت الهاتف. حدّد نهاية التكبيرات الأربع إذا اخترت الأذان الجزئي.",
    );
  }
  async function source() {
    if (state.sound !== "custom")
      return `assets/audio/adhan-${state.sound}${state.partial ? "-short" : ""}.mp3`;
    if (customURL) return customURL;
    const db = await audioDB();
    const blob = await new Promise((res, rej) => {
      const req = db.transaction("files").objectStore("files").get("adhan");
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    if (!blob) throw Error("اختر ملف الأذان من الهاتف أولًا");
    customURL = URL.createObjectURL(blob);
    return customURL;
  }
  function stop() {
    if (native) window.Android.stopAdhan();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    playing = false;
    status("توقف الصوت");
  }
  async function play(preview = false, event) {
    stop();
    if (native) {
      window.Android.previewAdhan(
        JSON.stringify({ ...state, preview, prayerId: event?.id || "fajr" }),
      );
      playing = true;
      status("تشغيل الصوت المختار");
      return;
    }
    const mode = event
      ? state.modes[event.friday ? "friday" : event.id]
      : "sound";
    if (mode === "silent") return;
    if ((mode === "vibrate" || state.vibrate) && navigator.vibrate)
      navigator.vibrate(
        state.pattern === "pulse"
          ? [250, 150, 250, 150, 250]
          : state.pattern === "long"
            ? 1000
            : 250,
      );
    if (mode === "vibrate") return;
    try {
      audio = new Audio(await source());
      audio.volume = state.volume / 100;
      audio.onended = () => {
        playing = false;
        status("انتهى الأذان");
      };
      audio.ontimeupdate = () => {
        if (
          state.sound === "custom" &&
          state.partial &&
          audio.currentTime >= state.customEnd
        )
          stop();
      };
      await audio.play();
      playing = true;
      status("تشغيل الصوت المختار");
    } catch (e) {
      status("تعذر تشغيل الصوت: " + e.message);
    }
  }
  async function loadRows() {
    try {
      const url =
        SUPABASE_URL +
        "/rest/v1/annual_prayer_times?select=gregorian_month,gregorian_day,fajr,sunrise,dhuhr,asr,maghrib,isha&location_name=eq." +
        encodeURIComponent("الحويجة وضواحيها") +
        "&limit=400";
      const response = await fetch(url, { headers: dbHeaders() });
      if (!response.ok) throw Error("تعذر تحميل المواقيت");
      const result = await response.json();
      if (result.length) {
        rows = result;
        localStorage.setItem("aoqatAdhanRows", JSON.stringify(rows));
        if (native) window.Android.cachePrayerRows(JSON.stringify(rows));
      }
    } catch (e) {
      try {
        rows = JSON.parse(localStorage.getItem("aoqatAdhanRows") || "[]");
      } catch (_) {}
      status(
        rows.length
          ? "تُستخدم المواقيت المحفوظة دون اتصال"
          : "تعذر تحميل المواقيت، أعد المحاولة عند توفر الاتصال",
      );
    }
    tick();
  }
  function check(key, label) {
    return `<label>${label}<input type="checkbox" data-setting="${key}" ${state[key] ? "checked" : ""}></label>`;
  }
  function number(key, label, max) {
    return `<label>${label}<input type="number" min="0" max="${max}" data-setting="${key}" value="${state[key]}"></label>`;
  }
  function render() {
    if (!panel) return;
    panel.innerHTML = `<div class="ad-card"><div id="adNext" class="ad-next">تحميل المواقيت…</div><div id="adCountdown" class="ad-counter" style="text-align:center">00:00:00</div><div id="adDates" class="ad-note" style="text-align:center"></div><table id="adTimes"></table><button type="button" id="adRefresh">تحديث المواقيت</button></div>
 <button type="button" id="adEnable" class="ad-master ${state.enabled ? "on" : ""}" aria-pressed="${state.enabled}">${state.enabled ? "🔊 الأذان مفعل" : "🔇 الأذان متوقف — اضغط للتفعيل"}</button>
 <fieldset ${state.enabled ? "" : "disabled"}><div class="ad-card"><h3>صوت الأذان</h3><label>المؤذن<select data-setting="sound">${[
   ["1", "مشاري العفاسي"],
   ["2", "علي أحمد ملا"],
   ["3", "عبد الرحمن العراقي"],
   ["4", "أذان الحرم المدني"],
   ["custom", "صوت من الهاتف"],
 ]
   .map(
     ([v, n]) =>
       `<option value="${v}" ${state.sound === v ? "selected" : ""}>${n}</option>`,
   )
   .join(
     "",
   )}</select></label><button type="button" id="adChoose">اختيار صوت من الهاتف</button><span class="ad-note">${escape(localStorage.getItem("aoqatAudioName") || "")}</span><input type="file" id="adFile" accept="audio/*" hidden><label>مستوى الصوت <output id="adVolume">${state.volume}%</output><input type="range" min="0" max="100" value="${state.volume}" data-setting="volume"></label>${check("partial", "أذان جزئي — التكبيرات الأربع فقط")}${state.sound === "custom" ? number("customEnd", "نهاية التكبيرات الأربع في ملفك (ثانية)", 180) : ""}<button type="button" id="adPreview">▶ تجربة الصوت</button><button type="button" id="adStop">■ إيقاف</button></div>
 <div class="ad-card"><h3>وضع الأذان لكل صلاة</h3><button type="button" data-global-mode="sound">🔊 عام للجميع</button><button type="button" data-global-mode="silent">🔇 صامت للجميع</button>${[
   ...C.ids,
   "friday",
 ]
   .map(
     (id) =>
       `<div class="ad-mode"><span>${names[id]}</span><div>${[
         ["sound", "🔊", "عام"],
         ["vibrate", "📳", "اهتزاز"],
         ["silent", "🔇", "صامت"],
       ]
         .map(
           ([v, i, l]) =>
             `<button type="button" data-prayer="${id}" data-mode="${v}" class="${state.modes[id] === v ? "selected" : ""}" aria-label="${names[id]} ${l}" aria-pressed="${state.modes[id] === v}">${i}</button>`,
         )
         .join("")}</div></div>`,
   )
   .join(
     "",
   )}<p class="ad-note">إعداد الجمعة يُستخدم بدل الظهر يوم الجمعة. الشروق للعرض فقط ولا يُشغّل أذانًا.</p></div>
 <div class="ad-card"><h3>التنبيهات</h3>${check("vibrate", "اهتزاز مصاحب للأذان")}<label>نوع الاهتزاز<select data-setting="pattern">${[
   ["short", "قصير"],
   ["long", "طويل"],
   ["pulse", "نبضات"],
 ]
   .map(
     ([v, n]) =>
       `<option value="${v}" ${state.pattern === v ? "selected" : ""}>${n}</option>`,
   )
   .join(
     "",
   )}</select></label>${number("reminder", "تنبيه قبل الصلاة (دقيقة؛ صفر للإيقاف)", 60)}${number("suhoor", "تنبيه السحور قبل الفجر (دقيقة؛ صفر للإيقاف)", 120)}${native ? `${check("overrideSilent", "تشغيل الأذان حتى إذا الهاتف صامت")}${check("screen", "إضاءة شاشة القفل أثناء الأذان")}${check("flip", "إيقاف الأذان عند قلب الهاتف")}${number("afterSilent", "صمت الهاتف بعد الأذان (دقيقة؛ صفر للإيقاف)", 60)}<button type="button" id="adPermission">أذونات الصوت وشاشة القفل</button>` : '<p class="ad-note">على الويب يعمل الصوت والاهتزاز أثناء فتح الصفحة وبعد تفاعل المستخدم. تشغيل الأذان والتذكير في الخلفية، والتحكم بصمت الهاتف وشاشة القفل متاحة في تطبيق Android.</p>'}</div></fieldset>
 ${
   native
     ? `<div class="ad-card"><h3>الصلاة القادمة على الهاتف</h3>${check("persistent", "إشعار مستمر للصلاة القادمة")}<label>خلفية الودجت<select data-setting="widget">${[
         ["transparent", "شفافة"],
         ["light", "فاتحة"],
         ["dark", "داكنة"],
       ]
         .map(
           ([v, n]) =>
             `<option value="${v}" ${state.widget === v ? "selected" : ""}>${n}</option>`,
         )
         .join(
           "",
         )}</select></label><button type="button" id="adWidget">إضافة ودجت للشاشة الرئيسية</button></div>`
     : ""
 }
 <div class="ad-card"><h3>الخدمات</h3><button type="button" data-service="quran">📖 القرآن الكريم</button><button type="button" data-service="qibla">🧭 اتجاه القبلة</button><button type="button" data-service="azkar">📿 الأذكار</button><div id="adService" class="ad-service"></div></div><div id="adStatus" class="ad-status" role="status" aria-live="polite"></div>`;
    panel.querySelectorAll("[data-setting]").forEach((el) =>
      el.addEventListener("change", () => {
        const k = el.dataset.setting;
        state[k] =
          el.type === "checkbox"
            ? el.checked
            : el.type === "number" || el.type === "range"
              ? +el.value
              : el.value;
        state = C.normalize(state);
        if (!state.enabled) stop();
        persist();
        render();
      }),
    );
    panel
      .querySelector('[data-setting="volume"]')
      .addEventListener("input", (e) => {
        $("adVolume").textContent = e.target.value + "%";
        if (audio) audio.volume = +e.target.value / 100;
      });
    $("adEnable").onclick = () => {
      state.enabled = !state.enabled;
      if (!state.enabled) stop();
      if (
        state.enabled &&
        !native &&
        "Notification" in window &&
        Notification.permission === "default"
      )
        Notification.requestPermission();
      lastTick = Date.now();
      persist();
      render();
      status(
        state.enabled
          ? "تم تفعيل الأذان حسب جدول قاعدة البيانات"
          : "تم إيقاف الأذان",
      );
    };
    $("adRefresh").onclick = loadRows;
    $("adPreview").onclick = () => play(true);
    $("adStop").onclick = stop;
    $("adChoose").onclick = () =>
      native ? window.Android.chooseAdhanAudio() : $("adFile").click();
    $("adFile").onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (!f.type.startsWith("audio/")) return status("اختر ملفًا صوتيًا");
      try {
        if (customURL) URL.revokeObjectURL(customURL);
        customURL = null;
        await customAudio(f);
      } catch (_) {
        status("تعذر حفظ الملف الصوتي");
      }
    };
    panel.querySelectorAll("[data-global-mode]").forEach(
      (b) =>
        (b.onclick = () => {
          for (const id of [...C.ids, "friday"])
            state.modes[id] = b.dataset.globalMode;
          persist();
          render();
        }),
    );
    panel.querySelectorAll("[data-mode]").forEach(
      (b) =>
        (b.onclick = () => {
          state.modes[b.dataset.prayer] = b.dataset.mode;
          persist();
          render();
        }),
    );
    if (native) {
      $("adWidget").onclick = () => window.Android.pinPrayerWidget();
      $("adPermission").onclick = () => window.Android.adhanPermissions();
    }
    panel
      .querySelectorAll("[data-service]")
      .forEach((b) => (b.onclick = () => showService(b.dataset.service)));
    tick();
    if (service) showService(service);
    persist();
  }
  function tick() {
    const now = new Date(),
      ev = C.events(rows, now),
      next = ev.find((e) => e.at > now.getTime());
    if ($("adNext"))
      $("adNext").textContent = next
        ? "الصلاة القادمة: " + names[next.id]
        : "المواقيت غير متاحة";
    if ($("adCountdown")) {
      let n = next ? Math.max(0, Math.floor((next.at - now) / 1000)) : 0;
      $("adCountdown").textContent = [
        Math.floor(n / 3600),
        Math.floor(n / 60) % 60,
        n % 60,
      ]
        .map((n) => String(n).padStart(2, "0"))
        .join(":");
    }
    if ($("adDates"))
      $("adDates").textContent =
        new Intl.DateTimeFormat("ar-IQ", { dateStyle: "full" }).format(now) +
        " • " +
        new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(now);
    const row = rows.find(
      (r) =>
        +r.gregorian_month === now.getMonth() + 1 &&
        +r.gregorian_day === now.getDate(),
    );
    if ($("adTimes"))
      $("adTimes").innerHTML = [
        "fajr",
        "sunrise",
        "dhuhr",
        "asr",
        "maghrib",
        "isha",
      ]
        .map(
          (id) =>
            `<tr><td>${names[id]}</td><td>${escape(row?.[id]?.slice(0, 5) || "—")}</td></tr>`,
        )
        .join("");
    if (!native && state.enabled) {
      for (const e of ev) {
        if (e.at > lastTick && e.at <= now && now - e.at < 1500) play(false, e);
        for (const [key, title] of [
          ["reminder", "تذكير بالصلاة"],
          ["suhoor", "تذكير بالسحور"],
        ]) {
          if (key === "suhoor" && e.id !== "fajr") continue;
          const at = e.at - state[key] * 60000;
          if (state[key] > 0 && at > lastTick && at <= now && now - at < 1500) {
            status(title + " — " + names[e.id]);
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            )
              new Notification(title, {
                body: names[e.id],
                tag: "aoqat-prayer-reminder",
              });
          }
        }
      }
    }
    lastTick = now.getTime();
  }
  window.aoqatNativeAdhanSettings = (s) => {
    state = C.normalize(s);
    localStorage.setItem(KEY, JSON.stringify(state));
    render();
  };
  window.aoqatAudioChosen = (name) => {
    localStorage.setItem("aoqatAudioName", name);
    state.sound = "custom";
    persist();
    render();
    status("تم حفظ صوت الهاتف");
  };
  window.aoqatAdhanStatus = status;
  async function showService(kind) {
    service = kind;
    const el = $("adService");
    if (!el) return;
    el.classList.add("open");
    if (orientationHandler) {
      window.removeEventListener(
        "deviceorientationabsolute",
        orientationHandler,
      );
      window.removeEventListener("deviceorientation", orientationHandler);
      orientationHandler = null;
    }
    if (kind === "quran") {
      el.innerHTML = "<p>تحميل القرآن الكريم…</p>";
      try {
        if (!quran) {
          const r = await fetch("assets/quran.json");
          if (!r.ok) throw Error();
          quran = await r.json();
        }
        el.innerHTML =
          '<label>السورة<select id="adSurah">' +
          quran
            .map(
              (s) =>
                `<option value="${s.id}">${s.id}. ${escape(s.name)}</option>`,
            )
            .join("") +
          '</select></label><div id="adVerses" class="ad-verse"></div>';
        const draw = () => {
          const s = quran.find((s) => s.id === +$("adSurah").value);
          $("adVerses").textContent = s.verses
            .map((v) => v.text + " ﴿" + v.id + "﴾")
            .join(" ");
        };
        $("adSurah").onchange = draw;
        draw();
      } catch (_) {
        el.textContent = "تعذر تحميل القرآن الكريم";
      }
    } else if (kind === "qibla") {
      if (native) {
        el.innerHTML =
          '<button type="button" id="adNativeQibla">فتح بوصلة القبلة</button>';
        $("adNativeQibla").onclick = () => window.Android.openQibla();
        return;
      }
      el.innerHTML =
        '<p>تحتاج البوصلة إلى الموقع وحساس الاتجاه. أبعد الهاتف عن المعادن.</p><button type="button" id="adQiblaStart">تحديد القبلة بموقعي</button><div class="ad-compass"><span id="adArrow" class="ad-arrow">↑</span></div><p id="adQiblaInfo"></p>';
      $("adQiblaStart").onclick = async () => {
        try {
          if (
            typeof window.DeviceOrientationEvent?.requestPermission ===
              "function" &&
            (await DeviceOrientationEvent.requestPermission()) !== "granted"
          )
            throw Error("لم يُسمح بحساس الاتجاه");
          navigator.geolocation.getCurrentPosition(
            (p) => {
              const rad = Math.PI / 180,
                a = p.coords.latitude * rad,
                dl = (39.8262 - p.coords.longitude) * rad,
                b = 21.4225 * rad;
              locationBearing =
                (Math.atan2(
                  Math.sin(dl) * Math.cos(b),
                  Math.cos(a) * Math.sin(b) -
                    Math.sin(a) * Math.cos(b) * Math.cos(dl),
                ) /
                  rad +
                  360) %
                360;
              $("adQiblaInfo").textContent =
                "اتجاه القبلة " +
                locationBearing.toFixed(1) +
                "° من الشمال. حرّك الهاتف لتفعيل البوصلة.";
              orientationHandler = (e) => {
                if (e.alpha === null) return;
                const heading =
                  e.webkitCompassHeading ?? (e.absolute ? 360 - e.alpha : null);
                if (heading === null) {
                  $("adQiblaInfo").textContent =
                    "حساس الهاتف لا يوفر اتجاه الشمال الحقيقي؛ القبلة " +
                    locationBearing.toFixed(1) +
                    "° من الشمال";
                  return;
                }
                $("adArrow").style.transform =
                  `rotate(${locationBearing - heading}deg)`;
                $("adQiblaInfo").textContent =
                  "وجّه الهاتف باتجاه السهم • " +
                  locationBearing.toFixed(1) +
                  "°";
              };
              window.addEventListener(
                "deviceorientationabsolute",
                orientationHandler,
              );
              window.addEventListener("deviceorientation", orientationHandler);
            },
            (e) => {
              $("adQiblaInfo").textContent = "تعذر تحديد الموقع: " + e.message;
            },
          );
        } catch (e) {
          $("adQiblaInfo").textContent = e.message;
        }
      };
    } else {
      el.innerHTML =
        '<label>الأذكار<select id="adAzkarKind"><option value="morning">الصباح</option><option value="evening">المساء</option><option value="prayer">بعد الصلاة</option></select></label><div id="adAzkarList"></div>';
      const draw = () => {
        const type = $("adAzkarKind").value;
        const list = window.AoqatAzkar[type];
        $("adAzkarList").innerHTML = list
          .map(
            (x, i) =>
              `<div class="ad-azkar"><div>${escape(x.text)}</div><small class="ad-note">${escape(x.ref)}</small><br><button type="button" data-dhikr="${i}" data-remaining="${x.count}">العدد المتبقي: ${x.count}</button></div>`,
          )
          .join("");
        $("adAzkarList")
          .querySelectorAll("button")
          .forEach(
            (b) =>
              (b.onclick = () => {
                const n = Math.max(0, +b.dataset.remaining - 1);
                b.dataset.remaining = n;
                b.textContent = n ? "العدد المتبقي: " + n : "✓ اكتمل";
                b.disabled = !n;
              }),
          );
      };
      $("adAzkarKind").onchange = draw;
      draw();
    }
  }
  function install() {
    const home = document.querySelector(".sidebar .main-panel");
    if (!home) return false;
    if ($("adhanPanel")) return true;
    panel = document.createElement("section");
    panel.id = "adhanPanel";
    panel.className = "panel inline-control-panel";
    panel.style.display = "none";
    home.appendChild(panel);
    render();
    loadRows();
    setInterval(tick, 1000);
    return true;
  }
  function start() {
    if (install()) return;
    const t = setInterval(() => {
      if (install()) clearInterval(t);
    }, 200);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
