(function () {
  'use strict';
  // Android's APK already delegates the native back gesture to its own bridge.
  if (window.AndroidNative?.configureAdhan) return;
  const visible = e => !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
  const byId = id => document.getElementById(id);
  const leaves = () => [...document.querySelectorAll('.ad-leaf-window')].filter(visible)
    .sort((a, b) => Number(a.style.getPropertyValue('--leaf-level')) - Number(b.style.getPropertyValue('--leaf-level')));
  // Reuse each screen's existing back handler, including saving and cleanup.
  function back() {
    if (visible(byId('aqSheet'))) { byId('aqCloseSheet')?.click(); return true; }
    for (const leaf of leaves().reverse()) {
      const button = leaf.querySelector(':scope > header [data-subwindow-back]');
      if (button) { button.click(); return true; }
    }
    if (visible(byId('adhanServicesDialog'))) { byId('adhanServicesBack')?.click(); return true; }
    if (visible(byId('settingsContentDialog'))) {
      const button = document.querySelector('#webDrawerSub.open .web-back');
      if (button) { button.click(); return true; }
    }
    if (document.body.classList.contains('design-menu-open')) { byId('designSideMenuBtn')?.click(); return true; }
    return false;
  }
  window.aoqatHandleBack = back;
  function screen() {
    return JSON.stringify([
      document.body.classList.contains('design-menu-open'),
      visible(byId('settingsContentDialog')) ? byId('webSubTitle')?.textContent : '',
      visible(byId('adhanServicesDialog')),
      leaves().map(e => e.id || e.querySelector('h3')?.textContent || 'editor'),
      visible(byId('aqSheet'))
    ]);
  }
  const key = 'aoqatWebBack', session = Date.now() + '-' + Math.random();
  let index = 0, moving = false;
  const screens = [screen()];
  const state = n => ({...history.state, [key]: {session, index: n}});
  history.replaceState(state(0), '');
  function reconcile() {
    if (moving) return;
    const current = screen();
    if (current === screens[index]) return;
    // On-screen back buttons also remove their browser-history entry.
    const previous = screens.slice(0, index).lastIndexOf(current);
    if (previous >= 0) { moving = true; history.go(previous - index); return; }
    screens.splice(index + 1);
    screens.push(current);
    history.pushState(state(++index), '');
  }
  new MutationObserver(reconcile).observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class']
  });
  window.addEventListener('popstate', event => {
    const target = event.state?.[key];
    if (target?.session !== session || !screens[target.index]) { moving = false; return; }
    const fromButton = moving;
    moving = true;
    // UI buttons have already performed their cleanup. A browser back gesture
    // performs one cleanup only; never close a newly opened screen during an
    // asynchronous history update from an on-screen back button.
    if (!fromButton && target.index < index && screen() !== screens[target.index]) back();
    index = target.index;
    if (!fromButton) screens[index] = screen();
    history.replaceState(state(index), '');
    moving = false;
    reconcile();
  });
})();
