/**
 * PlayerList Component
 * Renders and updates the lobby player list.
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Components = window.App.Components || {};

  var DOM = window.App.Utils.DOM;

  var PlayerList = {};

  /**
   * Render player list in lobby.
   * @param {Array} players - [{id, name, isHost}]
   * @param {string} myId - current player socket id
   */
  PlayerList.render = function (players, myId) {
    var list = DOM.id('player-list');
    if (!list) return;
    DOM.clear(list);

    players.forEach(function (player) {
      var li = DOM.create('li', 'player-item');
      if (player.id === myId) {
        li.classList.add('is-me');
      }

      var avatar = document.createElement('img');
      avatar.src = '/assets/icon-player-avatar.png';
      avatar.alt = player.name;
      avatar.className = 'player-item-avatar';

      var name = DOM.create('span', 'player-item-name', player.name);

      li.appendChild(avatar);
      li.appendChild(name);

      if (player.isHost) {
        var crown = document.createElement('img');
        crown.src = '/assets/icon-crown-host.png';
        crown.alt = 'מארח';
        crown.className = 'player-item-host';
        li.appendChild(crown);
      }

      list.appendChild(li);
    });

    // Update player count
    DOM.setText('player-count', players.length + ' / 10');
  };

  /**
   * Render vote cards for voting screen.
   * @param {Array} players - [{id, name}]
   * @param {string} myId - current player id (excluded from voting)
   * @param {function} onVote - callback when vote card is tapped
   */
  PlayerList.renderVoteCards = function (players, myId, onVote) {
    var container = DOM.id('vote-cards');
    if (!container) return;
    DOM.clear(container);

    players.forEach(function (player) {
      var card = DOM.create('div', 'vote-card');
      card.setAttribute('data-player-id', player.id);

      if (player.id === myId) {
        card.classList.add('disabled');
      }

      var avatar = document.createElement('img');
      avatar.src = '/assets/icon-player-avatar.png';
      avatar.alt = player.name;
      avatar.className = 'vote-card-avatar';

      var name = DOM.create('span', 'vote-card-name', player.name);
      var votes = DOM.create('span', 'vote-card-votes', '0 הצבעות');

      card.appendChild(avatar);
      card.appendChild(name);
      card.appendChild(votes);

      card.addEventListener('click', function () {
        if (card.classList.contains('disabled')) return;
        // Deselect all
        DOM.qsa('.vote-card', container).forEach(function (c) {
          c.classList.remove('selected');
        });
        card.classList.add('selected');
        if (onVote) onVote(player.id);
      });

      container.appendChild(card);
    });
  };

  /**
   * Show vote results on cards.
   * @param {object} votes - { playerId: voteCount }
   */
  PlayerList.showVoteResults = function (votes) {
    var container = DOM.id('vote-cards');
    if (!container) return;

    DOM.qsa('.vote-card', container).forEach(function (card) {
      var pid = card.getAttribute('data-player-id');
      var count = (votes && votes[pid]) || 0;
      var votesEl = DOM.qs('.vote-card-votes', card);
      if (votesEl) {
        votesEl.textContent = count + ' הצבעות';
      }
      card.classList.add('show-votes');
      card.classList.add('disabled');
    });
  };

  /**
   * Render results roles list.
   * @param {Array} roles - [{id, name, role, ejected}]
   */
  PlayerList.renderResultRoles = function (roles) {
    var container = DOM.id('results-roles');
    if (!container) return;
    DOM.clear(container);

    roles.forEach(function (player) {
      var item = DOM.create('div', 'results-role-item ' + player.role);
      if (player.ejected) item.classList.add('ejected');

      var avatar = document.createElement('img');
      avatar.src = player.ejected ? '/assets/icon-player-ejected.png' : '/assets/icon-player-avatar.png';
      avatar.alt = player.name;
      avatar.className = 'results-role-avatar';

      var name = DOM.create('span', 'results-role-name', player.name);
      var badge = DOM.create('span', 'results-role-badge ' + player.role,
        player.role === 'saboteur' ? 'מחבל' : 'צוות');

      item.appendChild(avatar);
      item.appendChild(name);
      item.appendChild(badge);

      container.appendChild(item);
    });
  };

  window.App.Components.PlayerList = PlayerList;
})();
