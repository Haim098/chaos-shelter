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
    currentTask: null
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

      if (App.state.myRole === 'saboteur') {
        App.showScreen('saboteurGame');
        if (App.Screens.SaboteurGame) App.Screens.SaboteurGame.onStart(data);
      } else {
        App.showScreen('crewGame');
        if (App.Screens.CrewGame) App.Screens.CrewGame.onStart(data);
      }
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
      // Close any open task overlay
      if (App.TaskRunner) App.TaskRunner.hideTask();

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

    effectEl.className = 'sabotage-effect';
    overlay.classList.remove('hidden');

    var duration = 3000;

    switch (data.type) {
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

  // ── Boot ───────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
  } else {
    App.init();
  }
})();
