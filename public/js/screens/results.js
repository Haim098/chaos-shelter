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
   * Server sends: { winner, reason, players: { id: {name, role, alive} }, meters, stats: { playerId: count } }
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

    // Roles reveal - server sends 'players' as object map, convert to array
    var rolesData = data.roles || data.players;
    if (rolesData) {
      var rolesArray;
      if (Array.isArray(rolesData)) {
        rolesArray = rolesData;
      } else {
        // Convert { id: { name, role, alive } } to [{ id, name, role, ejected }]
        rolesArray = Object.keys(rolesData).map(function (id) {
          var p = rolesData[id];
          return {
            id: id,
            name: p.name,
            role: p.role,
            ejected: !p.alive
          };
        });
      }
      PlayerList.renderResultRoles(rolesArray);
    }

    // Stats - server sends { playerId: taskCount }, compute aggregate stats
    var statsContainer = DOM.id('results-stats');
    if (statsContainer) {
      DOM.clear(statsContainer);

      var computedStats = {};
      if (data.stats) {
        if (typeof data.stats === 'object' && !data.stats.tasksCompleted) {
          // Server format: { playerId: count } - aggregate
          var totalTasks = 0;
          Object.keys(data.stats).forEach(function (pid) {
            totalTasks += data.stats[pid] || 0;
          });
          computedStats.tasksCompleted = totalTasks;
        } else {
          computedStats = data.stats;
        }
      }

      // Also add meters info
      if (data.meters) {
        computedStats.survivalFinal = Math.round(data.meters.survival || 0);
        computedStats.bakariFinal = Math.round(data.meters.bakari || 0);
      }

      var statsConfig = [
        { key: 'tasksCompleted', label: 'משימות הושלמו' },
        { key: 'survivalFinal', label: 'הישרדות סופי' },
        { key: 'bakariFinal', label: 'בקרי סופי' }
      ];

      statsConfig.forEach(function (stat) {
        var value = computedStats[stat.key];
        if (value === undefined) return;

        var statEl = DOM.create('div', 'results-stat');
        var displayVal = (stat.key === 'survivalFinal' || stat.key === 'bakariFinal')
          ? value + '%' : String(value);
        var valEl = DOM.create('div', 'results-stat-value', displayVal);
        var labelEl = DOM.create('div', 'results-stat-label', stat.label);
        statEl.appendChild(valEl);
        statEl.appendChild(labelEl);
        statsContainer.appendChild(statEl);
      });
    }

    // Play sound and effects
    if (winner === 'crew') {
      Audio.success();
      // Show confetti animation for crew victory
      if (window.App.showConfetti) {
        window.App.showConfetti();
      }
    } else {
      Audio.fail();
      // Vibrate on saboteur victory
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
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
