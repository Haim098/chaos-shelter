// ── Mini-Game: Color Sort ("מיין פחיות") ──────────────────────
(function () {
  'use strict';

  window.App = window.App || {};
  App.Tasks = App.Tasks || {};

  var container = null;
  var onDone = null;
  var selectedCan = null;
  var sortedCount = 0;
  var totalCans = 6;

  var CAN_COLORS = [
    { name: 'red',   hex: '#FF4444' },
    { name: 'red',   hex: '#FF4444' },
    { name: 'blue',  hex: '#4488FF' },
    { name: 'blue',  hex: '#4488FF' },
    { name: 'green', hex: '#44CC44' },
    { name: 'green', hex: '#44CC44' },
  ];

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function init(bodyEl, params, callback) {
    container = bodyEl;
    onDone = callback;
    selectedCan = null;
    sortedCount = 0;
    totalCans = (params && params.cans) ? params.cans : 6;

    // Build the cans array based on totalCans (always pairs of 3 colors)
    var cans = CAN_COLORS.slice(0, totalCans);
    shuffle(cans);

    // Hint
    var hint = document.createElement('div');
    hint.className = 'sort-hint task-hint';
    hint.textContent = 'גרור כל פחית לסל בצבע התואם';
    container.appendChild(hint);

    // Cans area
    var cansArea = document.createElement('div');
    cansArea.className = 'sort-cans';

    cans.forEach(function (can, idx) {
      var canEl = document.createElement('div');
      canEl.className = 'sort-can';
      canEl.setAttribute('data-color', can.name);
      canEl.setAttribute('data-index', idx);
      canEl.style.backgroundColor = can.hex;
      canEl.textContent = '\uD83E\uDD6B'; // 🥫

      var touchFired = false;
      canEl.addEventListener('touchstart', function (e) {
        e.preventDefault();
        touchFired = true;
        onCanTap(canEl);
      }, { passive: false });
      canEl.addEventListener('click', function (e) {
        e.preventDefault();
        if (touchFired) { touchFired = false; return; }
        onCanTap(canEl);
      });

      cansArea.appendChild(canEl);
    });

    container.appendChild(cansArea);

    // Bins area
    var binsArea = document.createElement('div');
    binsArea.className = 'sort-bins';

    var binColors = [
      { name: 'red',   hex: '#FF4444', emoji: '\uD83D\uDD34' },
      { name: 'blue',  hex: '#4488FF', emoji: '\uD83D\uDD35' },
      { name: 'green', hex: '#44CC44', emoji: '\uD83D\uDFE2' },
    ];

    binColors.forEach(function (bin) {
      var binEl = document.createElement('div');
      binEl.className = 'sort-bin';
      binEl.setAttribute('data-color', bin.name);
      binEl.style.borderColor = bin.hex;
      binEl.textContent = bin.emoji;

      var touchFired = false;
      binEl.addEventListener('touchstart', function (e) {
        e.preventDefault();
        touchFired = true;
        onBinTap(binEl);
      }, { passive: false });
      binEl.addEventListener('click', function (e) {
        e.preventDefault();
        if (touchFired) { touchFired = false; return; }
        onBinTap(binEl);
      });

      binsArea.appendChild(binEl);
    });

    container.appendChild(binsArea);
  }

  function onCanTap(canEl) {
    if (canEl.classList.contains('sort-sorted')) return;

    // Deselect previous
    if (selectedCan) {
      selectedCan.classList.remove('sort-selected');
    }

    // Select this can
    selectedCan = canEl;
    canEl.classList.add('sort-selected');
  }

  function onBinTap(binEl) {
    if (!selectedCan) return;

    var canColor = selectedCan.getAttribute('data-color');
    var binColor = binEl.getAttribute('data-color');

    if (canColor === binColor) {
      // Correct match
      selectedCan.classList.remove('sort-selected');
      selectedCan.classList.add('sort-sorted');
      selectedCan.style.pointerEvents = 'none';
      selectedCan = null;
      sortedCount++;

      // Check win
      if (sortedCount >= totalCans) {
        if (onDone) onDone(true);
      }
    } else {
      // Wrong bin - shake
      binEl.classList.add('sort-wrong');
      setTimeout(function () {
        binEl.classList.remove('sort-wrong');
      }, 400);
    }
  }

  function cleanup() {
    container = null;
    onDone = null;
    selectedCan = null;
    sortedCount = 0;
    totalCans = 6;
  }

  // Register with TaskRunner
  function register() {
    if (App.TaskRunner) {
      App.TaskRunner.registerTask('colorSort', {
        init: init,
        cleanup: cleanup,
      });
    } else {
      setTimeout(register, 100);
    }
  }
  register();

  App.Tasks.ColorSort = { init: init, cleanup: cleanup };
})();
