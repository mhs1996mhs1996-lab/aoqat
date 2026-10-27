"use strict";
(function () {
  const OPTIONS = [5, 10, 15, 20, 25, 30];

  function normalize(saved, defaults) {
    const values = {};
    for (const [id, fallback] of Object.entries(defaults)) {
      const value = Number(saved?.[id]);
      values[id] = OPTIONS.includes(value) ? value : fallback;
    }
    return values;
  }

  // Both phases derive from one iqama time, never from the previous tick.
  // Reading the state after sleep or changing a setting recomputes it immediately.
  function state(nowSeconds, prayers, beforeMinutes, afterMinutes) {
    for (const prayer of prayers) {
      const iqamaAt = prayer.startSeconds + beforeMinutes[prayer.id] * 60;
      const finishAt = iqamaAt + afterMinutes[prayer.id] * 60;
      if (nowSeconds >= prayer.startSeconds && nowSeconds < iqamaAt) {
        return { phase: "remaining", prayerId: prayer.id, seconds: Math.ceil(iqamaAt - nowSeconds), iqamaAt, finishAt };
      }
      if (nowSeconds >= iqamaAt && nowSeconds < finishAt) {
        return { phase: "elapsed", prayerId: prayer.id, seconds: Math.floor(nowSeconds - iqamaAt), iqamaAt, finishAt };
      }
    }
    return null;
  }

  window.AoqatIqamaTiming = Object.freeze({ OPTIONS, normalize, state });
})();
