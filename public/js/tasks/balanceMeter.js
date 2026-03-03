// ── Mini-Game: Balance Meter ("ייצב את הגנרטור") ──────────────────
(function () {
  'use strict';

  window.App = window.App || {};
  App.Tasks = App.Tasks || {};

  var container = null;
  var onDone = null;
  var animFrameId = null;
  var lastTimestamp = 0;
  var angle = 0;
  var offset = 0;
  var greenTime = 0;
  var holdTime = 3;
  var speed = 2;
  var pressingLeft = false;
  var pressingRight = false;
  var needleEl = null;
  var timeDisplayEl = null;
  var progressFillEl = null;
  var finished = false;

  var PUSH_FORCE = 60;
  var FRICTION = 3;
  var AMPLITUDE = 45;

  function init(bodyEl, params, callback) {
    container = bodyEl;
    onDone = callback;
    angle = 0;
    offset = 0;
    greenTime = 0;
    pressingLeft = false;
    pressingRight = false;
    finished = false;
    lastTimestamp = 0;

    holdTime = (params && params.holdTime) ? params.holdTime : 3;
    speed = (params && params.speed) ? params.speed : 2;

    // Hint
    var hint = document.createElement('div');
    hint.className = 'balance-hint task-hint';
    hint.textContent = '\u05E9\u05DE\u05D5\u05E8 \u05D0\u05EA \u05D4\u05DE\u05D7\u05D5\u05D2 \u05D1\u05D0\u05D6\u05D5\u05E8 \u05D4\u05D9\u05E8\u05D5\u05E7!';
    container.appendChild(hint);

    // Meter track
    var track = document.createElement('div');
    track.className = 'balance-meter-track';

    var greenZone = document.createElement('div');
    greenZone.className = 'balance-zone-green';
    track.appendChild(greenZone);

    needleEl = document.createElement('div');
    needleEl.className = 'balance-needle';
    track.appendChild(needleEl);

    container.appendChild(track);

    // Controls
    var controls = document.createElement('div');
    controls.className = 'balance-controls';

    var btnLeft = document.createElement('button');
    btnLeft.className = 'balance-btn balance-btn-left';
    btnLeft.textContent = '\u25C0';

    timeDisplayEl = document.createElement('div');
    timeDisplayEl.className = 'balance-time-display';
    timeDisplayEl.textContent = '0.0 / ' + holdTime.toFixed(1);

    var btnRight = document.createElement('button');
    btnRight.className = 'balance-btn balance-btn-right';
    btnRight.textContent = '\u25B6';

    controls.appendChild(btnLeft);
    controls.appendChild(timeDisplayEl);
    controls.appendChild(btnRight);
    container.appendChild(controls);

    // Progress bar
    var progressWrapper = document.createElement('div');
    progressWrapper.className = 'balance-progress-wrapper';

    progressFillEl = document.createElement('div');
    progressFillEl.className = 'balance-progress-fill';
    progressFillEl.style.width = '0%';
    progressWrapper.appendChild(progressFillEl);

    container.appendChild(progressWrapper);

    // Bind button events - Left
    bindButtonEvents(btnLeft, function () { pressingLeft = true; }, function () { pressingLeft = false; });
    // Bind button events - Right
    bindButtonEvents(btnRight, function () { pressingRight = true; }, function () { pressingRight = false; });

    // Start animation loop
    lastTimestamp = 0;
    animFrameId = requestAnimationFrame(tick);
  }

  function bindButtonEvents(btn, onDown, onUp) {
    btn.addEventListener('touchstart', function (e) {
      e.preventDefault();
      onDown();
    }, { passive: false });
    btn.addEventListener('touchend', function (e) {
      e.preventDefault();
      onUp();
    }, { passive: false });
    btn.addEventListener('touchcancel', function (e) {
      e.preventDefault();
      onUp();
    }, { passive: false });
    btn.addEventListener('mousedown', function (e) {
      e.preventDefault();
      onDown();
    });
    btn.addEventListener('mouseup', function (e) {
      e.preventDefault();
      onUp();
    });
    btn.addEventListener('mouseleave', function () {
      onUp();
    });
  }

  function tick(timestamp) {
    if (finished) return;

    if (!lastTimestamp) {
      lastTimestamp = timestamp;
      animFrameId = requestAnimationFrame(tick);
      return;
    }

    var dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    // Cap dt to avoid big jumps on tab switch
    if (dt > 0.1) dt = 0.1;

    // Update angle for oscillation
    angle += speed * dt;

    // Base needle position from oscillation (center = 50)
    var basePos = 50 + AMPLITUDE * Math.sin(angle);

    // Player input adjusts offset
    if (pressingLeft) {
      offset -= PUSH_FORCE * dt;
    }
    if (pressingRight) {
      offset += PUSH_FORCE * dt;
    }

    // Friction decays offset toward 0
    offset -= offset * FRICTION * dt;

    // Final position clamped 0-100
    var pos = basePos + offset;
    if (pos < 0) pos = 0;
    if (pos > 100) pos = 100;

    // Update needle visual
    if (needleEl) {
      needleEl.style.left = pos + '%';
    }

    // Check if in green zone (30% to 70%)
    if (pos >= 30 && pos <= 70) {
      greenTime += dt;
      if (needleEl) needleEl.classList.add('balance-in-green');
    } else {
      if (needleEl) needleEl.classList.remove('balance-in-green');
    }

    // Update display
    if (timeDisplayEl) {
      timeDisplayEl.textContent = greenTime.toFixed(1) + ' / ' + holdTime.toFixed(1);
    }
    if (progressFillEl) {
      var pct = Math.min(100, (greenTime / holdTime) * 100);
      progressFillEl.style.width = pct + '%';
    }

    // Check win
    if (greenTime >= holdTime) {
      finished = true;
      if (onDone) onDone(true);
      return;
    }

    animFrameId = requestAnimationFrame(tick);
  }

  function cleanup() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    container = null;
    onDone = null;
    needleEl = null;
    timeDisplayEl = null;
    progressFillEl = null;
    angle = 0;
    offset = 0;
    greenTime = 0;
    pressingLeft = false;
    pressingRight = false;
    finished = false;
    lastTimestamp = 0;
  }

  // Register with TaskRunner
  function register() {
    if (App.TaskRunner) {
      App.TaskRunner.registerTask('balanceMeter', {
        init: init,
        cleanup: cleanup,
      });
    } else {
      setTimeout(register, 100);
    }
  }
  register();

  App.Tasks.BalanceMeter = { init: init, cleanup: cleanup };
})();
