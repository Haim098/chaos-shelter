/**
 * Results Screen Module
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Screens = window.App.Screens || {};

  var DOM = window.App.Utils.DOM;
  var Socket = window.App.Utils.Socket;
  var Audio = window.App.Utils.Audio;
  var Toast = window.App.Components.Toast;
  var PlayerList = window.App.Components.PlayerList;

  var Results = {};

  Results.init = function () {
    // Play again button
    DOM.on('btn-play-again', 'click', function () {
      Audio.click();

      // Only host can restart
      if (window.App.state.myId !== window.App.state.hostId) {
        Toast.info('רק המארח יכול להתחיל מחדש');
        return;
      }

      Socket.emit('game:restart', {}, function (response) {
        if (response && response.ok) {
          // Reset app state
          window.App.state.myRole = null;
          window.App.state.currentTask = null;
          window.App.state.phase = 'lobby';

          // Reset lobby
          if (window.App.Screens.Lobby) {
            window.App.Screens.Lobby.reset();
          }

          window.App.showScreen('lobby');
        } else {
          Toast.error((response && response.error) || 'שגיאה');
        }
      });
    });
  };

  /**
   * Show results screen
   * @param {object} data - { winner, roles, stats }
   */
  Results.show = function (data) {
    var winner = data.winner; // 'crew' or 'saboteur'

    // Set background
    var bg = DOM.id('results-bg');
    if (bg) {
      bg.style.backgroundImage = winner === 'crew'
        ? "url('/assets/bg-victory-crew.png')"
        : "url('/assets/bg-victory-saboteur.png')";
    }

    // Title
    var titleEl = DOM.id('results-title');
    if (titleEl) {
      titleEl.className = 'results-title ' + (winner === 'crew' ? 'crew-win' : 'saboteur-win');
      titleEl.textContent = winner === 'crew' ? 'הצוות ניצח!' : 'המחבל ניצח!';
    }

    // Subtitle
    var subtitleEl = DOM.id('results-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = winner === 'crew'
        ? 'המקלט שרד! הבקרי בטוח.'
        : 'המחבל הצליח להרוס את המקלט!';
    }

    // Roles reveal
    if (data.roles) {
      PlayerList.renderResultRoles(data.roles);
    }

    // Stats
    var statsContainer = DOM.id('results-stats');
    if (statsContainer && data.stats) {
      DOM.clear(statsContainer);

      var statsConfig = [
        { key: 'tasksCompleted', label: 'משימות הושלמו' },
        { key: 'sabotagesDone', label: 'חבלות בוצעו' },
        { key: 'roundsSurvived', label: 'סבבים' }
      ];

      statsConfig.forEach(function (stat) {
        var value = data.stats[stat.key];
        if (value === undefined) return;

        var statEl = DOM.create('div', 'results-stat');
        var valEl = DOM.create('div', 'results-stat-value', String(value));
        var labelEl = DOM.create('div', 'results-stat-label', stat.label);
        statEl.appendChild(valEl);
        statEl.appendChild(labelEl);
        statsContainer.appendChild(statEl);
      });
    }

    // Play sound
    if (winner === 'crew') {
      Audio.success();
    } else {
      Audio.fail();
    }

    // Show/hide play again button based on host
    var playAgainBtn = DOM.id('btn-play-again');
    if (playAgainBtn) {
      if (window.App.state.myId === window.App.state.hostId) {
        playAgainBtn.textContent = 'שחק שוב!';
        playAgainBtn.disabled = false;
      } else {
        playAgainBtn.textContent = 'ממתין למארח...';
        playAgainBtn.disabled = true;
      }
    }
  };

  window.App.Screens.Results = Results;
})();
