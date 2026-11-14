(function () {
  "use strict";
  // This script is intentionally absent from the APK and regular web build.
  // It belongs only to build-145's checksum-verified partial-update snapshot.
  var MARKER_ID = "aoqatV210PartialDeliveryProof";
  var MARKER_TEXT = "✅ وصل التحديث الجزئي 2.10 — اختبار 01";
  var scheduled = false;

  function showMarker() {
    var inbox = document.getElementById("reminderInbox");
    if (!inbox || document.getElementById(MARKER_ID)) return;
    var marker = document.createElement("p");
    marker.id = MARKER_ID;
    marker.dir = "rtl";
    marker.setAttribute("role", "status");
    marker.style.cssText = [
      "box-sizing:border-box",
      "max-width:100%",
      "margin:9px 0 14px",
      "padding:9px 12px",
      "border-radius:11px",
      "border:1px solid var(--wt-border,#b8cbb8)",
      "background:var(--wt-surface2,#e5f0e5)",
      "color:var(--wt-text,#254332)",
      "font:600 13px/1.8 Tahoma,Arial,sans-serif",
      "text-align:center"
    ].join(";");
    marker.textContent = MARKER_TEXT;
    inbox.insertBefore(marker, inbox.firstChild);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      showMarker();
    });
  }

  function start() {
    schedule();
    // The inbox is rebuilt when navigating or when a new reminder arrives.
    new MutationObserver(function (records) {
      if (records.some(function (r) { return r.addedNodes.length > 0; })) schedule();
    }).observe(document.body, {childList: true, subtree: true});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {once:true});
  } else {
    start();
  }
})();