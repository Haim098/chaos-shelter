/**
 * Timer Component
 * Countdown timer with callbacks and visual urgency.
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Components = window.App.Components || {};

  var DOM = window.App.Utils.DOM;
  var Audio = window.App.Utils.Audio;

  var Timer = {};
  var activeTimers = {};

  /**
   * Start a countdown timer.
   * @param {string} id - unique timer name
   * @param {string} elementId - DOM element id to display time
   * @param {number} seconds - countdown duration
   * @param {object} options - { onTick, onDone, urgentAt }
   * @returns {string} timer id
   */
  Timer.start = function (id, elementId, seconds, options) {
    Timer.stop(id);
    options = options || {};
    var remaining = seconds;
    var urgentAt = options.urgentAt || 10;
    var el = DOM.id(elementId);

    function tick() {
      if (el) {
        el.textContent = remaining;
        DOM.toggleClass(el, 'urgent', remaining <= urgentAt);
      }

      if (options.onTick) options.onTick(remaining);

      if (remaining <= urgentAt && remaining > 0) {
        Audio.tick();
      }

      if (remaining <= 0) {
        Timer.stop(id);
        if (options.onDone) options.onDone();
        return;
      }

      remaining--;
    }

    tick();
    activeTimers[id] = setInterval(tick, 1000);
    return id;
  };

  /** Stop a specific timer */
  Timer.stop = function (id) {
    if (activeTimers[id]) {
      clearInterval(activeTimers[id]);
      delete activeTimers[id];
    }
  };

  /** Stop all timers */
  Timer.stopAll = function () {
    Object.keys(activeTimers).forEach(function (id) {
      clearInterval(activeTimers[id]);
    });
    activeTimers = {};
  };

  /** Check if timer is running */
  Timer.isRunning = function (id) {
    return !!activeTimers[id];
  };

  window.App.Components.Timer = Timer;
})();
