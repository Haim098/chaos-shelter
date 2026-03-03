/**
 * Main Application Module
 * Initializes the App, manages state, and wires socket events to screens.
 */
(function () {
  'use strict';

  var App = window.App = window.App || {};
  App.Utils = App.Utils || {};
  App.Components = App.Components || {};
  App.Screens = App.Screens || {};

  var Socket = App.Utils.Socket;
  var DOM = App.Utils.DOM;
  var Audio = App.Utils.Audio;
  var Meters = App.Components.Meters;
  var PlayerList = App.Components.PlayerList;
  var Timer = App.Components.Timer;
  var Toast = App.Components.Toast;

  // ── Global App State ───────────────────────────────────────────
  App.state = {
    myId: null,
    myName: '',
    myRole: null,
    hostId: null,
    players: [],
    phase: 'lobby',
    currentTask: null,
    roundStartedAt: null,
    roundDuration: 180000,
    aliveCount: 0,
    totalCount: 0
  };

  // ── Screen navigation ──────────────────────────────────────────
  App.showScreen = function (name) {
    App.state.phase = name;
    DOM.showScreen(name);
  };

  // ── Initialize ─────────────────────────────────────────────────
  App.init = function () {
    // Connect socket
    Socket.connect();

    // Expose raw socket as App.socket for compatibility with taskRunner
    App.socket = Socket.getSocket();

    // Resume audio on first interaction
    document.addEventListener('touchstart', function () { Audio.resume(); }, { once: true });
    document.addEventListener('click', function () { Audio.resume(); }, { once: true });

    // Init all screens
    if (App.Screens.Lobby) App.Screens.Lobby.init();
    if (App.Screens.RoleReveal) App.Screens.RoleReveal.init();
    if (App.Screens.CrewGame) App.Screens.CrewGame.init();
    if (App.Screens.SaboteurGame) App.Screens.SaboteurGame.init();
    if (App.Screens.Voting) App.Screens.Voting.init();
    if (App.Screens.Results) App.Screens.Results.init();

    // Wire socket events
    _bindSocketEvents();

    // Connection status
    Socket.onStatus('connected', function (data) {
      App.state.myId = data.id;
      App.socket = Socket.getSocket();

      // Reconnection: if we have a saved name, try to rejoin
      var savedName = localStorage.getItem('chaos-shelter-name');
      if (savedName && App.state.phase !== 'lobby') {
        // We were in-game and reconnected
        Socket.emit('player:join', { name: savedName }, function (response) {
          if (response && response.ok) {
            App.state.myId = response.playerId;
            App.state.myName = savedName;
            if (response.reconnected && response.role) {
              App.state.myRole = response.role;
            }
            Toast.success('התחברת מחדש!');
          }
        });
      } else if (savedName && !App.state.myName) {
        // Pre-fill name input for convenience
        var nameInput = DOM.id('player-name-input');
        if (nameInput && !nameInput.value) nameInput.value = savedName;
      }
    });

    Socket.onStatus('disconnected', function () {
      Toast.error('התנתקת מהשרת... מנסה להתחבר מחדש');
    });

    Socket.onStatus('error', function () {
      Toast.error('שגיאת חיבור לשרת');
    });

    console.log('[App] Initialized');
  };

  // ── Socket Event Bindings ──────────────────────────────────────
  function _bindSocketEvents() {

    // ── lobby:update ──────────────────────────────────────────
    Socket.on('lobby:update', function (data) {
      App.state.players = data.players || [];
      App.state.hostId = data.hostId;

      // If we receive lobby:update while NOT in lobby (e.g. after game:restart),
      // reset state and navigate back to lobby for all players
      if (App.state.phase !== 'lobby') {
        App.state.myRole = null;
        App.state.currentTask = null;
        Timer.stopAll();
        if (_roundTimerInterval) { clearInterval(_roundTimerInterval); _roundTimerInterval = null; }
        if (App.TaskRunner) App.TaskRunner.hideTask();
        App.showScreen('lobby');
      }

      if (App.Screens.Lobby) {
        App.Screens.Lobby.onLobbyUpdate(data);
      }
    });

    // ── game:roleReveal ───────────────────────────────────────
    Socket.on('game:roleReveal', function (data) {
      App.state.myRole = data.role;
      App.state.players = data.players || App.state.players;

      if (App.Screens.RoleReveal) {
        App.Screens.RoleReveal.show(data);
      }
    });

    // ── game:playing ──────────────────────────────────────────
    Socket.on('game:playing', function (data) {
      if (data.meters) Meters.update(data.meters);
      if (data.players) App.state.players = data.players;

      // Track round timer info
      App.state.roundStartedAt = data.startedAt || Date.now();
      App.state.roundDuration = data.duration || 180000;
      if (data.aliveCount) App.state.aliveCount = data.aliveCount;
      if (data.totalCount) App.state.totalCount = data.totalCount;

      if (App.state.myRole === 'saboteur') {
        App.showScreen('saboteurGame');
        if (App.Screens.SaboteurGame) App.Screens.SaboteurGame.onStart(data);
      } else {
        App.showScreen('crewGame');
        if (App.Screens.CrewGame) App.Screens.CrewGame.onStart(data);
      }

      // Start the round timer display
      _startRoundTimer(data);

      // Update alive count display
      _updateAliveCount(data);
    });

    // ── task:assign ───────────────────────────────────────────
    // Note: TaskRunner has its own task:assign listener via App.socket.
    // We just track state here.
    Socket.on('task:assign', function (data) {
      App.state.currentTask = data;
    });

    // ── meters:update ─────────────────────────────────────────
    Socket.on('meters:update', function (data) {
      Meters.update(data);
    });

    // ── sabotage:event ────────────────────────────────────────
    Socket.on('sabotage:event', function (data) {
      _handleSabotageEffect(data);
    });

    // ── vote:started ──────────────────────────────────────────
    Socket.on('vote:started', function (data) {
      // Close any open task overlay and stop round timer
      if (App.TaskRunner) App.TaskRunner.hideTask();
      if (_roundTimerInterval) { clearInterval(_roundTimerInterval); _roundTimerInterval = null; }

      App.showScreen('voting');
      if (App.Screens.Voting) {
        App.Screens.Voting.onVoteStarted(data);
      }
    });

    // ── vote:progress ─────────────────────────────────────────
    Socket.on('vote:progress', function (data) {
      if (App.Screens.Voting) {
        App.Screens.Voting.onVoteProgress(data);
      }
    });

    // ── vote:tally ────────────────────────────────────────────
    Socket.on('vote:tally', function (data) {
      if (App.Screens.Voting) {
        App.Screens.Voting.onVoteTally(data);
      }
    });

    // ── game:over ─────────────────────────────────────────────
    Socket.on('game:over', function (data) {
      Timer.stopAll();
      if (_roundTimerInterval) { clearInterval(_roundTimerInterval); _roundTimerInterval = null; }
      if (App.TaskRunner) App.TaskRunner.hideTask();

      App.showScreen('results');
      if (App.Screens.Results) {
        App.Screens.Results.show(data);
      }
    });
  }

  // ── Sabotage Visual Effects ────────────────────────────────────
  function _handleSabotageEffect(data) {
    var overlay = DOM.id('sabotage-overlay');
    var effectEl = DOM.id('sabotage-effect');
    if (!overlay || !effectEl) return;

    Audio.sabotage();
    Toast.warning('חבלה התרחשה!');

    // Vibrate on sabotage (if supported)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 200]);
    }

    effectEl.className = 'sabotage-effect';
    overlay.classList.remove('hidden');

    var duration = 3000;

    var sabType = data.type || data.actionKey;
    switch (sabType) {
      case 'lights':
        effectEl.classList.add('lights-out');
        duration = 3500;
        break;
      case 'alarm':
        effectEl.classList.add('alarm');
        Audio.alarm();
        duration = 2500;
        break;
      case 'steal':
        effectEl.classList.add('steal');
        effectEl.textContent = 'גניבת בקרי!';
        duration = 2000;
        break;
    }

    setTimeout(function () {
      overlay.classList.add('hidden');
      effectEl.className = 'sabotage-effect';
      effectEl.textContent = '';
    }, duration);
  }

  // ── Round Timer Display ───────────────────────────────────────
  var _roundTimerInterval = null;

  function _startRoundTimer(data) {
    if (_roundTimerInterval) clearInterval(_roundTimerInterval);

    var duration = data.duration || 180000;
    var startedAt = data.startedAt || Date.now();

    function updateDisplay() {
      var elapsed = Date.now() - startedAt;
      var remaining = Math.max(0, duration - elapsed);
      var totalSec = Math.ceil(remaining / 1000);
      var min = Math.floor(totalSec / 60);
      var sec = totalSec % 60;
      var display = min + ':' + (sec < 10 ? '0' : '') + sec;

      var crewTimer = DOM.id('crew-round-timer');
      var sabTimer = DOM.id('sab-round-timer');
      if (crewTimer) {
        crewTimer.textContent = display;
        DOM.toggleClass(crewTimer, 'urgent', totalSec <= 30);
      }
      if (sabTimer) {
        sabTimer.textContent = display;
        DOM.toggleClass(sabTimer, 'urgent', totalSec <= 30);
      }

      if (remaining <= 0) {
        clearInterval(_roundTimerInterval);
        _roundTimerInterval = null;
      }
    }

    updateDisplay();
    _roundTimerInterval = setInterval(updateDisplay, 1000);
  }

  function _updateAliveCount(data) {
    var alive = data.aliveCount || 0;
    var total = data.totalCount || 0;

    // Fallback: count from players array
    if (!alive && data.players) {
      total = data.players.length;
      alive = 0;
      data.players.forEach(function (p) { if (p.alive) alive++; });
    }

    var text = alive + '/' + total + ' בחיים';
    var crewCount = DOM.id('crew-alive-count');
    var sabCount = DOM.id('sab-alive-count');
    if (crewCount) crewCount.textContent = text;
    if (sabCount) sabCount.textContent = text;
  }

  // ── Confetti Effect (crew victory) ──────────────────────────────
  App.showConfetti = function () {
    var container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    var colors = ['#4caf50', '#81c784', '#ffeb3b', '#ff9800', '#2196f3', '#e91e63'];
    for (var i = 0; i < 50; i++) {
      var piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (2 + Math.random() * 2) + 's';
      piece.style.animationDelay = (Math.random() * 1.5) + 's';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      piece.style.width = (6 + Math.random() * 8) + 'px';
      piece.style.height = (6 + Math.random() * 8) + 'px';
      container.appendChild(piece);
    }

    setTimeout(function () {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 5000);
  };

  // ── Boot ───────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
  } else {
    App.init();
  }
})();
