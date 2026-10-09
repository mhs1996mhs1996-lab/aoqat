"use strict";
(function () {
  const visible = e => !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
  // Use the same handlers as the on-screen buttons, preserving each service's cleanup.
  window.aoqatHandleBack = function () {
    if (visible(document.getElementById('aqSheet'))) {
      document.getElementById('aqCloseSheet').click(); return true;
    }
    const leaves = [...document.querySelectorAll('.ad-leaf-window')].filter(visible)
      .sort((a,b) => Number(b.style.getPropertyValue('--leaf-level'))-Number(a.style.getPropertyValue('--leaf-level')));
    for (const leaf of leaves) {
      const button = leaf.querySelector(':scope > .ad-leaf-header [data-subwindow-back], [data-subwindow-back]');
      if (button) { button.click(); return true; }
    }
    if (visible(document.getElementById('adhanServicesDialog'))) {
      document.getElementById('adhanServicesBack').click(); return true;
    }
    const sub = document.querySelector('#webDrawerSub.open');
    if (sub && visible(document.getElementById('settingsContentDialog'))) {
      const button = sub.querySelector('.web-back');
      if (button) { button.click(); return true; }
    }
    if (document.body.classList.contains('design-menu-open')) {
      document.getElementById('designSideMenuBtn')?.click(); return true;
    }
    return false;
  };
})();
