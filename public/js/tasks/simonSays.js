// ── Mini-Game: Simon Says ("הקלד את הקוד") ─────────────────────
(function () {
  'use strict';

  window.App = window.App || {};
  App.Tasks = App.Tasks || {};

  var container = null;
  var onDone = null;
  var sequence = [];
  var inputIndex = 0;
  var phase = null; // 'showing' | 'input'
  var showTimeout = null;
  var showTimeouts = [];
  var flashTimeout = null;
  var statusEl = null;

  var PAD_COLORS = [
    { cls: 'simon-red',    idx: 0 },
    { cls: 'simon-blue',   idx: 1 },
    { cls: 'simon-green',  idx: 2 },
    { cls: 'simon-yellow', idx: 3 },
  ];

  function init(bodyEl, params, callback) {
    container = bodyEl;
    onDone = callback;
    inputIndex = 0;
    phase = 'showing';
    showTimeouts = [];

    // Get sequence from params or generate random
    if (params && params.sequence && params.sequence.length > 0) {
      sequence = params.sequence.slice();
    } else {
      var len = 4 + Math.floor(Math.random() * 2); // 4-5
      sequence = [];
      for (var i = 0; i < len; i++) {
        sequence.push(Math.floor(Math.random() * 4));
      }
    }

    // Hint
    var hint = document.createElement('div');
    hint.className = 'simon-hint task-hint';
    hint.textContent = 'צפה ברצף, ואז חזור עליו!';
    container.appendChild(hint);

    // Display area with 4 pads
    var display = document.createElement('div');
    display.className = 'simon-display';

    for (var j = 0; j < PAD_COLORS.length; j++) {
      var pad = document.createElement('div');
      pad.className = 'simon-pad ' + PAD_COLORS[j].cls;
      pad.setAttribute('data-idx', PAD_COLORS[j].idx);

      // Touch + click handler (with guard to prevent double-fire on mobile)
      (function (padEl, padIdx) {
        var touchFired = false;
        padEl.addEventListener('touchstart', function (e) {
          e.preventDefault();
          touchFired = true;
          onPadTap(padIdx, padEl);
        }, { passive: false });
        padEl.addEventListener('click', function (e) {
          e.preventDefault();
          if (touchFired) { touchFired = false; return; }
          onPadTap(padIdx, padEl);
        });
      })(pad, PAD_COLORS[j].idx);

      display.appendChild(pad);
    }

    container.appendChild(display);

    // Status text
    statusEl = document.createElement('div');
    statusEl.className = 'simon-status';
    statusEl.textContent = 'צפה...';
    container.appendChild(statusEl);

    // Play the sequence
    playSequence();
  }

  function playSequence() {
    phase = 'showing';
    var delay = 0;

    for (var i = 0; i < sequence.length; i++) {
      (function (idx, d) {
        var t1 = setTimeout(function () {
          highlightPad(sequence[idx], true);
        }, d);
        showTimeouts.push(t1);

        var t2 = setTimeout(function () {
          highlightPad(sequence[idx], false);
        }, d + 500);
        showTimeouts.push(t2);
      })(i, delay);

      delay += 800; // 500ms highlight + 300ms gap
    }

    // After sequence finishes, switch to input phase
    showTimeout = setTimeout(function () {
      phase = 'input';
      if (statusEl) statusEl.textContent = 'תורך!';
    }, delay);
    showTimeouts.push(showTimeout);
  }

  function highlightPad(padIdx, on) {
    if (!container) return;
    var pads = container.querySelectorAll('.simon-pad');
    for (var i = 0; i < pads.length; i++) {
      if (parseInt(pads[i].getAttribute('data-idx'), 10) === padIdx) {
        if (on) {
          pads[i].classList.add('simon-active');
        } else {
          pads[i].classList.remove('simon-active');
        }
        break;
      }
    }
  }

  function onPadTap(padIdx, padEl) {
    if (!onDone) return;
    if (phase !== 'input') return;

    if (padIdx === sequence[inputIndex]) {
      // Correct tap
      padEl.classList.add('simon-flash');
      if (flashTimeout) clearTimeout(flashTimeout);
      flashTimeout = setTimeout(function () {
        padEl.classList.remove('simon-flash');
      }, 200);

      inputIndex++;

      if (inputIndex >= sequence.length) {
        // Completed the full sequence
        if (statusEl) statusEl.textContent = 'מצוין!';
        setTimeout(function () {
          if (onDone) onDone(true);
        }, 300);
      }
    } else {
      // Wrong tap - mark wrong, let timer expire
      padEl.classList.add('simon-wrong');
      phase = null; // disable further input
      if (statusEl) statusEl.textContent = 'טעות!';
    }
  }

  function cleanup() {
    for (var i = 0; i < showTimeouts.length; i++) {
      clearTimeout(showTimeouts[i]);
    }
    if (flashTimeout) clearTimeout(flashTimeout);
    container = null;
    onDone = null;
    sequence = [];
    inputIndex = 0;
    phase = null;
    showTimeout = null;
    showTimeouts = [];
    flashTimeout = null;
    statusEl = null;
  }

  // Register with TaskRunner
  function register() {
    if (App.TaskRunner) {
      App.TaskRunner.registerTask('simonSays', {
        init: init,
        cleanup: cleanup,
      });
    } else {
      setTimeout(register, 100);
    }
  }
  register();

  App.Tasks.SimonSays = { init: init, cleanup: cleanup };
})();
