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
    native = !!window.AndroidNative?.configureAdhan;
  let state;
  try {
    state = C.normalize(
      JSON.parse(
        native && window.AndroidNative.readAdhanSettings
          ? window.AndroidNative.readAdhanSettings()
          : localStorage.getItem(KEY) || "{}",
      ),
    );
  } catch (_) {
    state = C.defaults();
  }
  let rows = [],
    panel,
    servicePanel,
    externalService = false,
    audio,
    customURL,
    playing = false,
    lastTick = Date.now(),
    delivered = new Set(),
    audioUnlocked = false,
    audioUnlocking = false,
    quran,
    service = "",
    orientationHandler,
    locationBearing,
    openSection = "",
    silentSettingsOpen = false,
    quietWindow = null,
    selectedSurah = "1",
    azkarKind = "",
    azkarRemaining = {};
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
    if (native) window.AndroidNative.configureAdhan(JSON.stringify(state));
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
      return `assets/audio/adhan-v124-${state.sound}${state.partial ? "-short" : ""}.mp3`;
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
  // Unlock the same audio element during a real tap, for later scheduled playback.
  function unlockAudio() {
    if (native || !state.enabled || playing || audioUnlocked || audioUnlocking) return;
    const src = state.sound === "custom" ? customURL
      : `assets/audio/adhan-v124-${state.sound}${state.partial ? "-short" : ""}.mp3`;
    if (!src) return;
    if (!audio) audio = new Audio(src);
    audioUnlocking = true;
    audio.volume = 0;
    audio.play().then(() => {
      audioUnlocked = true;
      if (!playing) { audio.pause(); audio.currentTime = 0; audio.volume = state.volume / 100; }
    }).catch(() => {}).finally(() => { audioUnlocking = false; });
  }
  document.addEventListener("pointerdown", unlockAudio);
  function stop() {
    if (native) window.AndroidNative.stopAdhan();
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
      window.AndroidNative.previewAdhan(
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
    if (!quietWindow && (mode === "vibrate" || state.vibrate) && navigator.vibrate)
      navigator.vibrate(
        state.pattern === "pulse"
          ? [250, 150, 250, 150, 250]
          : state.pattern === "long"
            ? 1000
            : 250,
      );
    if (mode === "vibrate") return;
    try {
      const src = await source();
      if (!audio) audio = new Audio();
      if (audio.getAttribute("src") !== src) audio.src = src;
      audio.volume = state.volume / 100;
      audio.muted = !!quietWindow;
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
        if (native) window.AndroidNative.cachePrayerRows(JSON.stringify(rows));
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
  function silentSettingsMarkup(){
    const s=state.afterIqamaSilent;
    return `<button type="button" id="adSilentSettingsToggle" class="ad-section-toggle ad-silent-toggle" aria-expanded="false" aria-controls="adSilentSettings">🤫 تفعيل وضع صامت بعد الإقامة</button><div id="adSilentSettings" class="ad-silent-settings" hidden><label>وضع صامت بعد الإقامة<input id="adSilentAfterEnabled" type="checkbox" ${s.enabled ? 'checked' : ''}></label><p class="ad-note">يبدأ عند الإقامة حسب المدة المحددة لكل صلاة في أوقات الإقامة. حدّد مدة الصامت بالدقائق؛ صفر لإيقافه لهذه الصلاة. الجمعة تتبع إعداد الظهر.</p><fieldset ${s.enabled ? '' : 'disabled'}>${C.ids.map(id=>`<label>${names[id]}<span class="ad-minute-control"><input type="number" min="0" max="120" step="1" data-silent-minutes="${id}" aria-label="مدة الصامت بعد إقامة ${names[id]}" value="${s.minutes[id]}"><span>دقيقة</span></span></label>`).join('')}</fieldset><p class="ad-note">على الويب نعاين فترة الصامت ونكتم صوت الأذان داخل الصفحة أثناءها. تحويل الهاتف نفسه إلى الصامت واستعادة وضعه يحتاج تطبيق Android بعد تحديثه.</p></div>`;
  }
  function stopServiceSensors(){
    window.AoqatQuranReader?.close();
    if(!orientationHandler)return;
    window.removeEventListener('deviceorientationabsolute',orientationHandler);
    window.removeEventListener('deviceorientation',orientationHandler);orientationHandler=null;
  }
  function syncSections(){
    panel.querySelectorAll('[data-ad-section]').forEach(b=>{
      const open=state.enabled&&b.dataset.adSection===openSection;
      b.setAttribute('aria-expanded',String(open));b.classList.toggle('ad-section-active',open);
      $(b.getAttribute('aria-controls')).hidden=!open;
    });
    $("adSilentSettings").hidden=!silentSettingsOpen;
    $("adSilentSettingsToggle").setAttribute('aria-expanded',String(silentSettingsOpen));
  }
  function syncServices(){
    $("adServiceMenu").hidden=!!service;$("adServiceFrame").hidden=!service;
    $("adServiceTitle").textContent={quran:'القرآن الكريم',qibla:'اتجاه القبلة',azkar:'الأذكار',widget:'الصلاة القادمة على الهاتف'}[service]||'';
    if (!native) { $("adServiceMenu").hidden=true; $("adServiceBack").hidden=true; }
    $("adService").hidden=service==='widget';$("adWidgetControls").hidden=service!=='widget';
  }
  function render() {
    if (!panel) return;
    panel.innerHTML = `<div class="ad-card"><div id="adNext" class="ad-next">تحميل المواقيت…</div><div id="adCountdown" class="ad-counter" style="text-align:center">00:00:00</div><div id="adDates" class="ad-note" style="text-align:center"></div><table id="adTimes"></table><button type="button" id="adRefresh">تحديث المواقيت</button></div>
 <button type="button" id="adEnable" class="ad-master ${state.enabled ? "on" : ""}" aria-pressed="${state.enabled}">${state.enabled ? "🔊 الأذان مفعل" : "🔇 الأذان متوقف — اضغط للتفعيل"}</button>
 <fieldset class="ad-options" ${state.enabled ? "" : "disabled"}>
 <div class="ad-section-menu" aria-label="أقسام الأذان والخدمات">${[
   ["sound", "🔊", "صوت الأذان"], ["notifications", "🔔", "التنبيهات"],
   ["modes", "🕌", "وضع الأذان لكل صلاة"], ...(native ? [["services", "✨", "الخدمات"]] : []),
 ].map(([id, icon, title])=>`<button type="button" class="ad-section-toggle" data-ad-section="${id}" aria-expanded="false" aria-controls="adSection-${id}"><span class="ad-section-icon" aria-hidden="true">${icon}</span><span>${title}</span><span class="ad-section-chevron" aria-hidden="true">‹</span></button>`).join("")}</div>
 <section id="adSection-sound" class="ad-section" hidden><div class="ad-card"><h3>صوت الأذان</h3><label>المؤذن<select data-setting="sound">${[
   ["1", "أذان مكة — علي أحمد ملا"],
   ["2", "أذان المدينة — الحرم النبوي"],
   ["3", "أذان مكة — محمد خليل رمل"],
   ["4", "ناصر القطامي"],
   ["custom", "صوت من الهاتف"],
 ]
   .map(
     ([v, n]) =>
       `<option value="${v}" ${state.sound === v ? "selected" : ""}>${n}</option>`,
   )
   .join(
     "",
   )}</select></label><button type="button" id="adChoose">اختيار صوت من الهاتف</button><span class="ad-note">${escape(localStorage.getItem("aoqatAudioName") || "")}</span><input type="file" id="adFile" accept="audio/*" hidden><label>مستوى الصوت <output id="adVolume">${state.volume}%</output><input type="range" min="0" max="100" value="${state.volume}" data-setting="volume"></label>${check("partial", "أذان جزئي — التكبيرات الأربع فقط")}${state.sound === "custom" ? number("customEnd", "نهاية التكبيرات الأربع في ملفك (ثانية)", 180) : ""}<button type="button" id="adPreview">▶ تجربة الصوت</button><button type="button" id="adStop">■ إيقاف</button></div>
 </section><section id="adSection-modes" class="ad-section" hidden><div class="ad-card"><h3>وضع الأذان لكل صلاة</h3><button type="button" data-global-mode="sound">🔊 عام للجميع</button><button type="button" data-global-mode="silent">🔇 صامت للجميع</button>${[
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
             `<button type="button" data-prayer="${id}" data-mode="${v}" class="${state.modes[id] === v ? "selected" : ""}" aria-label="${names[id]} ${l}" aria-pressed="${state.modes[id] === v}">${i}<small>${v === "sound" ? "صوت" : v === "vibrate" ? "هزاز" : "صامت"}</small></button>`,
         )
         .join("")}</div></div>`,
   )
   .join(
     "",
   )}<p class="ad-note">إعداد الجمعة يُستخدم بدل الظهر يوم الجمعة. الشروق للعرض فقط ولا يُشغّل أذانًا.</p></div>
 </section><section id="adSection-notifications" class="ad-section" hidden><div class="ad-card"><h3>التنبيهات</h3>${check("vibrate", "اهتزاز مصاحب للأذان")}<label>نوع الاهتزاز<select data-setting="pattern">${[
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
   )}</select></label>${number("reminder", "تنبيه قبل الصلاة (دقيقة؛ صفر للإيقاف)", 60)}${number("suhoor", "تنبيه السحور قبل الفجر (دقيقة؛ صفر للإيقاف)", 120)}${native ? `${check("overrideSilent", "تشغيل الأذان والتذكير حتى إذا الهاتف صامت")}${check("screen", "إضاءة شاشة القفل للأذان والتذكير")}${check("flip", "إيقاف الأذان عند قلب الهاتف")}${number("afterSilent", "صمت الهاتف بعد الأذان (دقيقة؛ صفر للإيقاف)", 60)}<button type="button" id="adPermission">أذونات الصوت وشاشة القفل</button>` : '<p class="ad-note">على الويب يعمل الصوت والاهتزاز أثناء فتح الصفحة وبعد تفاعل المستخدم. تشغيل الأذان والتذكير في الخلفية، والتحكم بصمت الهاتف وشاشة القفل متاحة في تطبيق Android.</p>'}${silentSettingsMarkup()}</div></section>
 <section id="adSection-services" class="ad-section" hidden><div class="ad-card"><h3>الخدمات</h3><div id="adServiceMenu" class="ad-service-menu"><button type="button" data-service="quran">📖 القرآن الكريم</button><button type="button" data-service="qibla">🧭 اتجاه القبلة</button><button type="button" data-service="azkar">📿 الأذكار</button>${native ? '<button type="button" data-service="widget">📱 الصلاة القادمة على الهاتف</button>' : ''}</div><div id="adServiceFrame" class="ad-service-frame" hidden><button type="button" id="adServiceBack" class="ad-inner-back">‹ رجوع إلى الخدمات</button><h4 id="adServiceTitle"></h4><div id="adService" class="ad-service"></div><div id="adWidgetControls" hidden> ${
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
</div></div></div></section></fieldset><div id="adQuietStatus" class="ad-note" hidden role="status"></div><div id="adStatus" class="ad-status" role="status" aria-live="polite"></div>`;
    if (!native && servicePanel) {
      const services = panel.querySelector("#adSection-services"); services.hidden = false;
      services.querySelector("h3")?.remove();
      servicePanel.replaceChildren(services);
    }
    panel.querySelectorAll("[data-ad-section]").forEach((button)=>{
      button.onclick=()=>{
        if(!state.enabled)return;
        openSection=openSection===button.dataset.adSection ? "" : button.dataset.adSection;
        if(openSection!=="services")stopServiceSensors();
        syncSections();
        if(openSection==="modes")requestAnimationFrame(()=>$("adSection-modes").scrollIntoView({block:"start",behavior:"auto"}));
        if(openSection==="services" && service)showService(service);
      };
    });
    $("adSilentSettingsToggle").onclick=()=>{silentSettingsOpen=!silentSettingsOpen;syncSections();};
    $("adSilentAfterEnabled").onchange=(e)=>{state.afterIqamaSilent.enabled=e.target.checked;persist();render();};
    panel.querySelectorAll("[data-silent-minutes]").forEach((input)=>input.onchange=()=>{
      state.afterIqamaSilent.minutes[input.dataset.silentMinutes]=Number(input.value);
      state=C.normalize(state);persist();render();
    });
    $("adServiceBack").onclick=()=>{service="";stopServiceSensors();syncServices();};
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
      if (!state.enabled) {stop();openSection="";service="";stopServiceSensors();}
      if (
        state.enabled &&
        !native &&
        "Notification" in window &&
        Notification.permission === "default"
      )
        Notification.requestPermission();
      lastTick = Date.now();
      if (state.enabled) unlockAudio();
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
      native ? window.AndroidNative.chooseAdhanAudio() : $("adFile").click();
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
      $("adWidget").onclick = () => window.AndroidNative.pinPrayerWidget();
      $("adPermission").onclick = () => window.AndroidNative.adhanPermissions();
    }
    panel
      .querySelectorAll("[data-service]")
      .forEach((b) => (b.onclick = () => showService(b.dataset.service)));
    tick();
    syncSections();
    syncServices();
    if (service && (externalService || (openSection==="services" && state.enabled))) showService(service);
    persist();
  }
  function tick() {
    const now = new Date(),
      displayDate = C.displayDate(rows, now),
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
        new Intl.DateTimeFormat("ar-IQ", { dateStyle: "full" }).format(displayDate) +
        " • " +
        new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(displayDate);
    const row = rows.find(
      (r) =>
        +r.gregorian_month === displayDate.getMonth() + 1 &&
        +r.gregorian_day === displayDate.getDate(),
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
    let iqama={};
    try{iqama=JSON.parse(localStorage.getItem("aoqatIqamaMinutesV1")||"{}");}catch(_){}
    quietWindow=C.afterIqamaSilentWindow(rows,now,state,iqama);
    if(!native && audio)audio.muted=!!quietWindow;
    const quietStatus=$("adQuietStatus");
    if(quietStatus){quietStatus.hidden=!quietWindow;quietStatus.textContent=quietWindow
      ? "الصامت بعد إقامة "+names[quietWindow.prayerId]+": "+Math.ceil((quietWindow.end-now)/60000)+" دقيقة متبقية" : "";}
    if (!native && state.enabled) {
      for (const e of ev) {
        if (e.at > lastTick && e.at <= now && now - e.at < 120000) {
          const key = e.id + ":" + e.at;
          if (!delivered.has(key)) { delivered.add(key); play(false, e); }
        }
        for (const [key, title] of [
          ["reminder", "تذكير بالصلاة"],
          ["suhoor", "تذكير بالسحور"],
        ]) {
          if (key === "suhoor" && e.id !== "fajr") continue;
          const at = e.at - state[key] * 60000;
          if (state[key] > 0 && at > lastTick && at <= now && now - at < 120000) {
            status(title + " — " + names[e.id]);
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            )
              new Notification(title, {
                body: names[e.id],
                tag: "aoqat-prayer-reminder",
                silent: !!quietWindow,
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
  window.aoqatOpenService = (kind) => {
    if (native || !["quran","qibla","azkar"].includes(kind)) return;
    externalService = true;
    showService(kind);
  };
  window.aoqatCloseService = () => {
    if (!externalService) return;
    externalService = false; service = ""; stopServiceSensors();
  };
  async function showService(kind) {
    if(!externalService && (!state.enabled || openSection!=="services"))return;
    service = kind;
    syncServices();
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
    if (kind === "widget")return;
    if (kind === "quran" && !native) {
      try {
        if (!window.AoqatQuranReader) {
          if (!window.aoqatQuranReaderLoading) window.aoqatQuranReaderLoading = new Promise((resolve,reject)=>{
            const script=document.createElement("script");script.src="js/quran-reader.js";
            script.onload=resolve;script.onerror=()=>{script.remove();window.aoqatQuranReaderLoading=null;reject(Error());};document.head.appendChild(script);
          });
          await window.aoqatQuranReaderLoading;
        }
        if(service!==kind || !el.isConnected || !externalService)return;
        await window.AoqatQuranReader.open(el);
      } catch (_) { if(service===kind && el.isConnected) el.textContent="تعذر تحميل المصحف؛ افتح القرآن مرة أخرى للمحاولة."; }
      return;
    }
    if (kind === "quran") {
      el.innerHTML = "<p>تحميل القرآن الكريم…</p>";
      try {
        if (!quran) {
          const r = await fetch("assets/quran.json");
          if (!r.ok) throw Error();
          quran = await r.json();
        }
        if(service!==kind || !el.isConnected)return;
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
          selectedSurah=$("adSurah").value;
          const s = quran.find((s) => s.id === +selectedSurah);
          $("adVerses").textContent = s.verses
            .map((v) => v.text + " ﴿" + v.id + "﴾")
            .join(" ");
        };
        $("adSurah").value=selectedSurah;
        $("adSurah").onchange = draw;
        draw();
      } catch (_) {
        if(service!==kind || !el.isConnected)return;
        el.textContent = "تعذر تحميل القرآن الكريم";
      }
    } else if (kind === "qibla") {
      if (native) {
        el.innerHTML =
          '<button type="button" id="adNativeQibla">فتح بوصلة القبلة</button>';
        $("adNativeQibla").onclick = () => window.AndroidNative.openQibla();
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
              if(service!=="qibla"||(!externalService && (openSection!=="services"||!state.enabled))||!el.isConnected)return;
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
                if (e.alpha === null || service!=="qibla" || (!externalService && openSection!=="services")) return;
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
              if(!$("adQiblaInfo")||service!=="qibla")return;
              $("adQiblaInfo").textContent = "تعذر تحديد الموقع: " + e.message;
            },
          );
        } catch (e) {
          $("adQiblaInfo").textContent = e.message;
        }
      };
    } else {
      el.innerHTML='<div class="ad-azkar-menu">'+[["morning","☀️","أذكار الصباح"],["evening","🌙","أذكار المساء"],["prayer","🕌","أذكار بعد الصلاة"]].map(([id,icon,title])=>`<button type="button" data-azkar-kind="${id}" aria-pressed="${azkarKind===id}">${icon} ${title}</button>`).join('')+'</div><div id="adAzkarList" hidden></div>';
      const draw=()=>{
        const list=window.AoqatAzkar[azkarKind];
        $("adAzkarList").hidden=!list;
        el.querySelectorAll('[data-azkar-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.azkarKind===azkarKind)));
        if(!list)return;
        $("adAzkarList").innerHTML=list.map((x,i)=>{
          const key=azkarKind+':'+i,n=azkarRemaining[key]??x.count;
          return `<div class="ad-azkar"><div>${escape(x.text)}</div><small class="ad-note">${escape(x.ref)}</small><br><button type="button" data-dhikr="${i}" data-remaining="${n}" ${n ? '' : 'disabled'}>${n ? 'العدد المتبقي: '+n : '✓ اكتمل'}</button></div>`;
        }).join('');
        $("adAzkarList").querySelectorAll('[data-dhikr]').forEach(b=>b.onclick=()=>{
          const n=Math.max(0,+b.dataset.remaining-1);azkarRemaining[azkarKind+':'+b.dataset.dhikr]=n;
          b.dataset.remaining=n;b.textContent=n ? 'العدد المتبقي: '+n : '✓ اكتمل';b.disabled=!n;
        });
      };
      el.querySelectorAll('[data-azkar-kind]').forEach(b=>b.onclick=()=>{azkarKind=b.dataset.azkarKind;draw();});
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
    if (!native) {
      servicePanel = document.createElement("section");
      servicePanel.id = "prayerServicePanel";
      servicePanel.className = "panel inline-control-panel";
      servicePanel.style.display = "none";
      home.appendChild(servicePanel);
    }
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
