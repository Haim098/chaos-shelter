/**
 * Lobby Screen Module
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

  var Lobby = {};

  Lobby.init = function () {
    // Join button
    DOM.on('btn-join', 'click', function () {
      Audio.click();
      var nameInput = DOM.id('player-name-input');
      var name = nameInput ? nameInput.value.trim() : '';

      if (!name) {
        Toast.error('הכנס שם!');
        if (nameInput) {
          nameInput.style.animation = 'shake 0.4s ease';
          setTimeout(function () { nameInput.style.animation = ''; }, 400);
        }
        return;
      }

      if (name.length < 2) {
        Toast.error('השם חייב להיות לפחות 2 תווים');
        return;
      }

      Socket.emit('player:join', { name: name }, function (response) {
        if (response && response.ok) {
          window.App.state.myName = name;
          window.App.state.myId = response.playerId;
          DOM.hide('join-form');
          DOM.show('player-list-container');
          Toast.success('הצטרפת למקלט!');
          Audio.success();
        } else {
          Toast.error((response && response.error) || 'שגיאה בהצטרפות');
        }
      });
    });

    // Enter key on name input
    DOM.on('player-name-input', 'keydown', function (e) {
      if (e.key === 'Enter') {
        DOM.id('btn-join').click();
      }
    });

    // Start button (host only)
    DOM.on('btn-start', 'click', function () {
      Audio.click();
      Socket.emit('game:start', {}, function (response) {
        if (response && !response.ok) {
          Toast.error((response && response.error) || 'לא ניתן להתחיל');
        }
      });
    });
  };

  /**
   * Handle lobby:update event
   * @param {object} data - { players, hostId, count }
   */
  Lobby.onLobbyUpdate = function (data) {
    var myId = window.App.state.myId;

    // Render the player list
    PlayerList.render(data.players || [], myId);

    // Show/hide start button for host
    var isHost = data.hostId === myId;
    var startBtn = DOM.id('btn-start');
    if (startBtn) {
      DOM.toggleClass(startBtn, 'hidden', !isHost);
    }

    // Show lobby if we haven't joined yet but lobby updated (reconnect)
    if (myId && window.App.state.phase === 'lobby') {
      DOM.hide('join-form');
      DOM.show('player-list-container');
    }

    // If we're currently on lobby screen, make sure it's visible
    if (window.App.state.phase === 'lobby') {
      window.App.showScreen('lobby');
    }
  };

  /** Reset lobby to initial state (for play again) */
  Lobby.reset = function () {
    DOM.show('join-form');
    DOM.hide('player-list-container');
    DOM.hide('btn-start');
    var nameInput = DOM.id('player-name-input');
    if (nameInput) nameInput.value = window.App.state.myName || '';
  };

  window.App.Screens.Lobby = Lobby;
})();
