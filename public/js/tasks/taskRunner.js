// ── Task Runner: overlay controller for mini-games ──────────────
(function () {
  'use strict';

  window.App = window.App || {};

  var registry = {};   // type -> { init, cleanup }
  var activeTask = null;
  var timerInterval = null;
  var autoCompleteTimeout = null;

  // DOM refs (cached on first use)
  var overlay, titleEl, timerEl, bodyEl;

  function cacheDom() {
    overlay = document.getElementById('screen-taskOverlay');
    titleEl = document.getElementById('task-title');
    timerEl = document.getElementById('task-timer');
    bodyEl  = document.getElementById('task-body');
  }

  // ── Task type icons ──────────────────────────────────────────
  var ICONS = {
    tapCircles:   '/assets/icon-task-chaotic-toys.png',
    wireConnect:  '/assets/icon-task-electrical-wire.png',
    tapToWake:    '/assets/icon-task-daniel-sleeping.png',
    chooseAnswer: '/assets/icon-task-argument-clash.png',
  };

  var LABELS = {
    tapCircles:   'סדר את הצעצועים',
    wireConnect:  'חבר את החוטים',
    tapToWake:    'תעיר את דניאל!',
    chooseAnswer: 'מי צודק בוויכוח?',
  };

  // ── Register a mini-game type ────────────────────────────────
  function registerTask(type, handlers) {
    registry[type] = handlers;
  }

  // ── Show task overlay ────────────────────────────────────────
  function showTask(taskData) {
    if (!overlay) cacheDom();
    if (activeTask) hideTask();

    activeTask = taskData;

    // Build header
    var icon = ICONS[taskData.type] || '';
    var label = LABELS[taskData.type] || taskData.type;

    titleEl.innerHTML = '';
    if (icon) {
      var img = document.createElement('img');
      img.src = icon;
      img.className = 'task-title-icon';
      img.alt = label;
      titleEl.appendChild(img);
    }
    var span = document.createElement('span');
    span.textContent = label;
    titleEl.appendChild(span);

    // Clear game area
    bodyEl.innerHTML = '';

    // Create timer bar
    timerEl.innerHTML = '';
    var timerBar = document.createElement('div');
    timerBar.className = 'task-timer-bar';
    var timerFill = document.createElement('div');
    timerFill.className = 'task-timer-fill';
    timerBar.appendChild(timerFill);
    timerEl.appendChild(timerBar);

    // Show overlay
    overlay.classList.add('active');

    // Handle saboteur fake tasks
    if (taskData.isFake) {
      showFakeTask(taskData, timerFill);
      return;
    }

    // Start real task
    var handler = registry[taskData.type];
    if (!handler) {
      console.warn('TaskRunner: no handler for type "' + taskData.type + '"');
      hideTask();
      return;
    }

    // Start timer
    startTimer(taskData.timeLimit, timerFill, function () {
      // Time ran out
      onComplete(false);
    });

    // Init game in body element
    handler.init(bodyEl, taskData.params, function (success) {
      onComplete(success);
    });
  }

  // ── Fake task for saboteur ───────────────────────────────────
  function showFakeTask(taskData, timerFill) {
    bodyEl.innerHTML =
      '<div class="task-fake-msg">' +
        '<p class="task-fake-text">משימה מזויפת...</p>' +
        '<p class="task-fake-sub">ממתין להשלמה אוטומטית</p>' +
      '</div>';

    var fakeDelay = 2000 + Math.random() * 1000; // 2-3s

    startTimer(fakeDelay, timerFill, function () {});

    autoCompleteTimeout = setTimeout(function () {
      onComplete(true);
    }, fakeDelay);
  }

  // ── Timer ────────────────────────────────────────────────────
  function startTimer(duration, fillEl, onExpire) {
    var start = Date.now();
    var total = duration;

    fillEl.style.width = '100%';
    fillEl.classList.remove('timer-warning', 'timer-danger');

    timerInterval = setInterval(function () {
      var elapsed = Date.now() - start;
      var pct = Math.max(0, 1 - elapsed / total);

      fillEl.style.width = (pct * 100) + '%';

      // Color stages
      if (pct < 0.25) {
        fillEl.classList.add('timer-danger');
        fillEl.classList.remove('timer-warning');
      } else if (pct < 0.5) {
        fillEl.classList.add('timer-warning');
        fillEl.classList.remove('timer-danger');
      }

      if (elapsed >= total) {
        clearInterval(timerInterval);
        timerInterval = null;
        onExpire();
      }
    }, 50);
  }

  // ── Task complete ────────────────────────────────────────────
  function onComplete(success) {
    if (!activeTask) return;

    // Stop timer
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (autoCompleteTimeout) {
      clearTimeout(autoCompleteTimeout);
      autoCompleteTimeout = null;
    }

    var taskData = activeTask;

    // Show result feedback
    showResult(success);

    // Emit to server
    if (App.socket) {
      App.socket.emit('task:complete', {
        taskId: taskData.taskId,
        success: success,
      });
    }

    // Hide after delay
    setTimeout(function () {
      hideTask();
    }, 1200);
  }

  // ── Show success/fail splash ─────────────────────────────────
  function showResult(success) {
    // Cleanup the game first
    var handler = activeTask ? registry[activeTask.type] : null;
    if (handler && handler.cleanup) {
      handler.cleanup();
    }

    bodyEl.innerHTML =
      '<div class="task-result ' + (success ? 'task-success' : 'task-fail') + '">' +
        '<div class="task-result-icon">' + (success ? '\u2714' : '\u2718') + '</div>' +
        '<div class="task-result-text">' + (success ? 'הצלחה!' : 'נכשל!') + '</div>' +
      '</div>';
  }

  // ── Hide overlay ─────────────────────────────────────────────
  function hideTask() {
    if (!overlay) cacheDom();

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (autoCompleteTimeout) {
      clearTimeout(autoCompleteTimeout);
      autoCompleteTimeout = null;
    }

    // Cleanup active game
    if (activeTask) {
      var handler = registry[activeTask.type];
      if (handler && handler.cleanup) {
        handler.cleanup();
      }
    }

    overlay.classList.remove('active');
    bodyEl.innerHTML = '';
    activeTask = null;
  }

  // ── Listen for server task assignments ───────────────────────
  function init() {
    if (!overlay) cacheDom();

    // Listen for task:assign when socket is ready
    function bindSocket() {
      if (App.socket) {
        App.socket.on('task:assign', function (taskData) {
          showTask(taskData);
        });
      } else {
        setTimeout(bindSocket, 200);
      }
    }
    bindSocket();
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ───────────────────────────────────────────────
  App.TaskRunner = {
    registerTask: registerTask,
    showTask:     showTask,
    hideTask:     hideTask,
    init:         init,
  };
})();
