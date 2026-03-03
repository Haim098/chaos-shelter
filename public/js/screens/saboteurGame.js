/**
 * Saboteur Game Screen Module
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Screens = window.App.Screens || {};

  var DOM = window.App.Utils.DOM;
  var Socket = window.App.Utils.Socket;
  var Audio = window.App.Utils.Audio;
  var Toast = window.App.Components.Toast;

  var SaboteurGame = {};

  // Per-action cooldown durations (should match server constants)
  var COOLDOWN_MAP = {
    lights: 20000,
    alarm:  25000,
    steal:  30000
  };
  var cooldowns = {};
  var cooldownTimers = {};

  SaboteurGame.init = function () {
    // Call vote button
    DOM.on('btn-call-vote-sab', 'click', function () {
      Audio.vote();
      Socket.emit('vote:call', {}, function (response) {
        if (response && !response.ok) {
          Toast.error((response && response.error) || 'לא ניתן להצביע עכשיו');
        }
      });
    });

    // Sabotage buttons
    DOM.qsa('.btn-sabotage').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-sabotage');
        if (!action) return;

        if (cooldowns[action]) {
          Toast.warning('ממתין לקולדאון...');
          return;
        }

        Audio.click();
        Socket.emit('sabotage:action', { action: action }, function (response) {
          if (response && response.performed) {
            Toast.success('חבלה בוצעה!');
            _startCooldown(btn, action);
          } else if (response && response.error) {
            Toast.error(response.error);
          }
        });
      });
    });
  };

  function _startCooldown(btn, action) {
    cooldowns[action] = true;
    btn.classList.add('on-cooldown');

    // Find the cooldown text element
    var cdText = btn.querySelector('.sab-cooldown-text');
    var cdMs = COOLDOWN_MAP[action] || 15000;
    var remaining = Math.ceil(cdMs / 1000);

    function updateCdText() {
      if (cdText) {
        cdText.classList.remove('hidden');
        cdText.textContent = remaining + '\u05E9';
      }
      remaining--;
      if (remaining < 0) {
        clearInterval(cooldownTimers[action]);
        delete cooldownTimers[action];
        cooldowns[action] = false;
        btn.classList.remove('on-cooldown');
        if (cdText) {
          cdText.classList.add('hidden');
          cdText.textContent = '';
        }
      }
    }

    // Clear any existing timer for this action
    if (cooldownTimers[action]) clearInterval(cooldownTimers[action]);

    updateCdText();
    cooldownTimers[action] = setInterval(updateCdText, 1000);
  }

  /**
   * Called when game:playing event fires and player is saboteur
   * @param {object} data - { meters, players, duration }
   */
  SaboteurGame.onStart = function (data) {
    // Reset cooldowns and timers
    Object.keys(cooldownTimers).forEach(function (key) {
      clearInterval(cooldownTimers[key]);
    });
    cooldownTimers = {};
    cooldowns = {};
    DOM.qsa('.btn-sabotage').forEach(function (btn) {
      btn.classList.remove('on-cooldown');
      var cdText = btn.querySelector('.sab-cooldown-text');
      if (cdText) {
        cdText.classList.add('hidden');
        cdText.textContent = '';
      }
    });

    // Reset task area
    var taskArea = DOM.id('sab-task-area');
    if (taskArea) {
      DOM.setHTML(taskArea,
        '<div class="task-waiting">' +
          '<div class="task-waiting-icon">&#9881;</div>' +
          '<p>משימה מזויפת ממתינה...</p>' +
        '</div>'
      );
    }
  };

  /**
   * Show a fake task card for the saboteur
   * @param {object} task - { taskId, type, params, timeLimit, isFake }
   */
  SaboteurGame.showTaskCard = function (task) {
    var taskArea = DOM.id('sab-task-area');
    if (!taskArea) return;

    var nameMap = {
      'tapCircles': 'לחץ על העיגולים (מזויף)',
      'wireConnect': 'חבר את החוטים (מזויף)',
      'tapToWake': 'העיר את דניאל (מזויף)',
      'chooseAnswer': 'בחר תשובה (מזויף)'
    };

    var name = nameMap[task.type] || 'משימה מזויפת';

    DOM.setHTML(taskArea,
      '<div class="task-card">' +
        '<div class="task-card-title">' + name + '</div>' +
        '<div class="task-card-desc" style="color: var(--color-danger-light);">משימה מזויפת - לא משפיעה</div>' +
        '<div class="task-card-action">' +
          '<button class="btn btn-primary" id="btn-start-fake-task">בצע (מזויף)</button>' +
        '</div>' +
      '</div>'
    );

    DOM.on('btn-start-fake-task', 'click', function () {
      Audio.click();
      if (window.App.TaskRunner) {
        window.App.TaskRunner.showTask(task);
      }
    });
  };

  window.App.Screens.SaboteurGame = SaboteurGame;
})();
