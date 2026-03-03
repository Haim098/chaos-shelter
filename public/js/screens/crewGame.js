/**
 * Crew Game Screen Module
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Screens = window.App.Screens || {};

  var DOM = window.App.Utils.DOM;
  var Socket = window.App.Utils.Socket;
  var Audio = window.App.Utils.Audio;
  var Toast = window.App.Components.Toast;

  var CrewGame = {};

  CrewGame.init = function () {
    // Call vote button
    DOM.on('btn-call-vote-crew', 'click', function () {
      Audio.vote();
      Socket.emit('vote:call', {}, function (response) {
        if (response && !response.ok) {
          Toast.error((response && response.error) || 'לא ניתן להצביע עכשיו');
        }
      });
    });
  };

  /**
   * Called when game:playing event fires and player is crew
   * @param {object} data - { meters, players, duration }
   */
  CrewGame.onStart = function (data) {
    // Reset task area to waiting state
    var taskArea = DOM.id('crew-task-area');
    if (taskArea) {
      DOM.setHTML(taskArea,
        '<div class="task-waiting">' +
          '<div class="task-waiting-icon">&#9881;</div>' +
          '<p>ממתין למשימה...</p>' +
        '</div>'
      );
    }
  };

  /**
   * Show a task card in the task area (before overlay opens)
   * @param {object} task - { taskId, type, params, timeLimit, isFake }
   */
  CrewGame.showTaskCard = function (task) {
    var taskArea = DOM.id('crew-task-area');
    if (!taskArea) return;

    var iconMap = {
      'tapCircles': '/assets/icon-task-chaotic-toys.png',
      'wireConnect': '/assets/icon-task-electrical-wire.png',
      'tapToWake': '/assets/icon-task-daniel-sleeping.png',
      'chooseAnswer': '/assets/icon-task-argument-clash.png'
    };

    var nameMap = {
      'tapCircles': 'לחץ על העיגולים',
      'wireConnect': 'חבר את החוטים',
      'tapToWake': 'העיר את דניאל',
      'chooseAnswer': 'בחר תשובה'
    };

    var icon = iconMap[task.type] || '/assets/icon-task-chaotic-toys.png';
    var name = nameMap[task.type] || 'משימה';

    DOM.setHTML(taskArea,
      '<div class="task-card">' +
        '<img src="' + icon + '" alt="' + name + '" class="task-card-icon">' +
        '<div class="task-card-title">' + name + '</div>' +
        '<div class="task-card-desc">לחץ כדי להתחיל</div>' +
        '<div class="task-card-action">' +
          '<button class="btn btn-primary" id="btn-start-task">התחל משימה</button>' +
        '</div>' +
      '</div>'
    );

    DOM.on('btn-start-task', 'click', function () {
      Audio.click();
      if (window.App.TaskRunner) {
        window.App.TaskRunner.showTask(task);
      }
    });
  };

  window.App.Screens.CrewGame = CrewGame;
})();
