// ── Mini-Game: Tap To Wake ("תעיר את דניאל") ────────────────────
(function () {
  'use strict';

  window.App = window.App || {};
  App.Tasks = App.Tasks || {};

  var container = null;
  var onDone = null;
  var tapCount = 0;
  var requiredTaps = 15;
  var progressBar = null;
  var danielIcon = null;
  var zzzEl = null;
  var tapCounterEl = null;

  function init(bodyEl, params, callback) {
    container = bodyEl;
    onDone = callback;
    tapCount = 0;
    requiredTaps = (params && params.taps) ? params.taps : 15;

    // Hint
    var hint = document.createElement('div');
    hint.className = 'task-hint';
    hint.textContent = 'לחץ מהר כדי להעיר את דניאל!';
    container.appendChild(hint);

    // Daniel area
    var area = document.createElement('div');
    area.className = 'wake-area';

    // ZZZ animation
    zzzEl = document.createElement('div');
    zzzEl.className = 'wake-zzz';
    zzzEl.innerHTML = '<span>Z</span><span>Z</span><span>Z</span>';
    area.appendChild(zzzEl);

    // Daniel icon (big tap target)
    danielIcon = document.createElement('div');
    danielIcon.className = 'wake-daniel';

    var img = document.createElement('img');
    img.src = '/assets/icon-task-daniel-sleeping.png';
    img.alt = 'דניאל ישן';
    img.className = 'wake-daniel-img';
    img.draggable = false;
    danielIcon.appendChild(img);
    area.appendChild(danielIcon);

    // Tap counter
    tapCounterEl = document.createElement('div');
    tapCounterEl.className = 'wake-counter';
    tapCounterEl.textContent = '0 / ' + requiredTaps;
    area.appendChild(tapCounterEl);

    // Progress bar
    var progWrapper = document.createElement('div');
    progWrapper.className = 'wake-progress-wrapper';
    progressBar = document.createElement('div');
    progressBar.className = 'wake-progress-fill';
    progressBar.style.width = '0%';
    progWrapper.appendChild(progressBar);
    area.appendChild(progWrapper);

    container.appendChild(area);

    // Bind tap events on the daniel icon (with guard for double-fire)
    var touchFired = false;
    danielIcon.addEventListener('touchstart', function (e) {
      e.preventDefault();
      touchFired = true;
      handleTap();
    }, { passive: false });
    danielIcon.addEventListener('mousedown', function (e) {
      e.preventDefault();
      if (touchFired) { touchFired = false; return; }
      handleTap();
    });
  }

  function handleTap() {
    if (!onDone) return;

    tapCount++;

    // Update UI
    var pct = Math.min(100, (tapCount / requiredTaps) * 100);
    if (progressBar) progressBar.style.width = pct + '%';
    if (tapCounterEl) tapCounterEl.textContent = tapCount + ' / ' + requiredTaps;

    // Bounce animation
    if (danielIcon) {
      danielIcon.classList.remove('wake-bounce');
      // Force reflow
      void danielIcon.offsetWidth;
      danielIcon.classList.add('wake-bounce');
    }

    // Reduce ZZZ as progress increases
    if (zzzEl) {
      if (pct > 66) {
        zzzEl.innerHTML = '<span>Z</span>';
      } else if (pct > 33) {
        zzzEl.innerHTML = '<span>Z</span><span>Z</span>';
      }
    }

    // Check win
    if (tapCount >= requiredTaps) {
      // Wake up animation
      if (danielIcon) {
        danielIcon.classList.add('wake-awake');
      }
      if (zzzEl) {
        zzzEl.classList.add('wake-zzz-gone');
      }

      // Small delay for wake animation to show
      setTimeout(function () {
        if (onDone) onDone(true);
      }, 300);
    }
  }

  function cleanup() {
    container = null;
    onDone = null;
    tapCount = 0;
    progressBar = null;
    danielIcon = null;
    zzzEl = null;
    tapCounterEl = null;
  }

  // Register with TaskRunner
  function register() {
    if (App.TaskRunner) {
      App.TaskRunner.registerTask('tapToWake', {
        init: init,
        cleanup: cleanup,
      });
    } else {
      setTimeout(register, 100);
    }
  }
  register();

  App.Tasks.TapToWake = { init: init, cleanup: cleanup };
})();
