/**
 * Meters Component
 * Updates survival and bakari meter bars.
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Components = window.App.Components || {};

  var DOM = window.App.Utils.DOM;

  var Meters = {};

  var DANGER_THRESHOLD = 25;

  /**
   * Update meter values.
   * @param {object} data - { survival: 0-100, bakari: 0-100 }
   */
  Meters.update = function (data) {
    if (data.survival !== undefined) {
      _updateBar('meter-fill-survival', data.survival);
      _updateBar('sab-meter-fill-survival', data.survival);
    }
    if (data.bakari !== undefined) {
      _updateBar('meter-fill-bakari', data.bakari);
      _updateBar('sab-meter-fill-bakari', data.bakari);
    }
  };

  function _updateBar(id, value) {
    var el = DOM.id(id);
    if (!el) return;
    var clamped = Math.max(0, Math.min(100, value));
    var oldWidth = el.style.width;
    el.style.width = clamped + '%';
    DOM.toggleClass(el, 'danger', clamped <= DANGER_THRESHOLD);

    // Pulse animation on meter change
    if (oldWidth && oldWidth !== clamped + '%') {
      var track = el.parentElement;
      if (track) {
        track.classList.remove('meter-changed');
        // Force reflow to restart animation
        void track.offsetWidth;
        track.classList.add('meter-changed');
        setTimeout(function () { track.classList.remove('meter-changed'); }, 600);
      }
    }
  }

  /** Get display-friendly percentage */
  Meters.format = function (value) {
    return Math.round(value) + '%';
  };

  window.App.Components.Meters = Meters;
})();
