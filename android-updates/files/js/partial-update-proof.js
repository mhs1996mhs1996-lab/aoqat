(function () {
  "use strict";
  // Included ONLY in the web-update snapshot, not in the APK or hosted web app.
  const id = "aoqatPartialWebUpdateProof";
  function show() {
    const section = document.getElementById("aoqatAlertSettings");
    if (!section || section.querySelector("#" + id)) return;
    const marker = document.createElement("div");
    marker.id = id;
    marker.dir = "rtl";
    marker.setAttribute("role", "status");
    marker.style.cssText =
      "box-sizing:border-box;width:100%;margin:0 0 12px;padding:10px 12px;" +
      "border:1px solid var(--wt-border,#b5cdbb);border-radius:10px;" +
      "background:var(--wt-surface2,#e8f1e7);color:var(--wt-text,#244531);" +
      "font:600 14px/1.65 Tahoma,Arial,sans-serif;text-align:center";
    marker.textContent = "🧪 تجربة التحديث الجزئي 01 — 14/11/2026";
    section.insertBefore(marker, section.firstChild);
  }
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; show(); });
  }
  function start() {
    show();
    new MutationObserver(function (records) {
      if (records.some(function (r) { return r.addedNodes.length > 0; })) schedule();
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else start();
})();
