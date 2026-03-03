// ── Mini-Game: Tap Circles ("סדר צעצועים") ──────────────────────
(function () {
  'use strict';

  window.App = window.App || {};
  App.Tasks = App.Tasks || {};

  var container = null;
  var circles = [];
  var nextExpected = 1;
  var onDone = null;
  var penaltyTimeout = null;

  // ── Colors for circles ──────────────────────────────────────
  var COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#F1948A',
  ];

  function init(bodyEl, params, callback) {
    container = bodyEl;
    onDone = callback;
    nextExpected = 1;

    var count = params && params.count ? params.count : 5 + Math.floor(Math.random() * 4); // 5-8

    // Create game area
    var area = document.createElement('div');
    area.className = 'tap-circles-area';
    container.appendChild(area);

    // Instruction
    var hint = document.createElement('div');
    hint.className = 'task-hint';
    hint.textContent = 'לחץ על העיגולים לפי הסדר: 1, 2, 3...';
    container.insertBefore(hint, area);

    circles = [];

    // Generate random positions ensuring no overlap
    var positions = generatePositions(count, area);

    for (var i = 0; i < count; i++) {
      var circle = document.createElement('div');
      circle.className = 'tap-circle';
      circle.setAttribute('data-num', i + 1);
      circle.textContent = String(i + 1);
      circle.style.backgroundColor = COLORS[i % COLORS.length];
      circle.style.left = positions[i].x + '%';
      circle.style.top  = positions[i].y + '%';

      // Touch + click handler (with guard to prevent double-fire on mobile)
      (function (num, el) {
        var touchFired = false;
        el.addEventListener('touchstart', function (e) {
          e.preventDefault();
          touchFired = true;
          onCircleTap(num, el);
        }, { passive: false });
        el.addEventListener('click', function (e) {
          e.preventDefault();
          if (touchFired) { touchFired = false; return; }
          onCircleTap(num, el);
        });
      })(i + 1, circle);

      area.appendChild(circle);
      circles.push(circle);
    }

    // Animate in with stagger
    circles.forEach(function (c, idx) {
      c.style.opacity = '0';
      c.style.transform = 'scale(0)';
      setTimeout(function () {
        c.style.opacity = '1';
        c.style.transform = 'scale(1)';
      }, idx * 80);
    });
  }

  function generatePositions(count) {
    var positions = [];

    for (var i = 0; i < count; i++) {
      var placed = false;
      var attempts = 0;
      while (!placed && attempts < 100) {
        var x = 10 + Math.random() * 70; // 10-80%
        var y = 10 + Math.random() * 70;
        var tooClose = false;

        for (var j = 0; j < positions.length; j++) {
          var dx = x - positions[j].x;
          var dy = y - positions[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < 18) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          positions.push({ x: x, y: y });
          placed = true;
        }
        attempts++;
      }

      // Fallback if can't find non-overlapping position
      if (!placed) {
        positions.push({
          x: 10 + (i * 12) % 70,
          y: 10 + Math.floor(i / 5) * 25 + Math.random() * 10,
        });
      }
    }
    return positions;
  }

  function onCircleTap(num, el) {
    if (num === nextExpected) {
      // Correct!
      el.classList.add('tap-circle-done');
      el.style.pointerEvents = 'none';
      nextExpected++;

      // Check win
      if (nextExpected > circles.length) {
        if (onDone) onDone(true);
      }
    } else {
      // Wrong - shake and penalty
      el.classList.add('tap-circle-wrong');
      if (penaltyTimeout) clearTimeout(penaltyTimeout);
      penaltyTimeout = setTimeout(function () {
        el.classList.remove('tap-circle-wrong');
      }, 400);
    }
  }

  function cleanup() {
    if (penaltyTimeout) clearTimeout(penaltyTimeout);
    container = null;
    circles = [];
    nextExpected = 1;
    onDone = null;
  }

  // Register with TaskRunner
  function register() {
    if (App.TaskRunner) {
      App.TaskRunner.registerTask('tapCircles', {
        init: init,
        cleanup: cleanup,
      });
    } else {
      setTimeout(register, 100);
    }
  }
  register();

  App.Tasks.TapCircles = { init: init, cleanup: cleanup };
})();
