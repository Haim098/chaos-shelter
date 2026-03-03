/**
 * Voting Screen Module
 */
(function () {
  'use strict';

  window.App = window.App || {};
  window.App.Screens = window.App.Screens || {};

  var DOM = window.App.Utils.DOM;
  var Socket = window.App.Utils.Socket;
  var Audio = window.App.Utils.Audio;
  var Timer = window.App.Components.Timer;
  var Toast = window.App.Components.Toast;
  var PlayerList = window.App.Components.PlayerList;

  var Voting = {};
  var selectedTarget = null;
  var hasVoted = false;

  Voting.init = function () {
    // Skip vote button
    DOM.on('btn-skip-vote', 'click', function () {
      if (hasVoted) return;
      Audio.click();
      _castVote('skip');
    });
  };

  /**
   * Called when vote:started event fires
   * @param {object} data - { callerId, callerName, players, duration }
   */
  Voting.onVoteStarted = function (data) {
    selectedTarget = null;
    hasVoted = false;

    Toast.warning(data.callerName + ' קרא להצבעה!');
    Audio.alarm();

    // Render vote cards - cast vote immediately on selection
    PlayerList.renderVoteCards(data.players || [], window.App.state.myId, function (targetId) {
      if (hasVoted) return;
      selectedTarget = targetId;
      Audio.click();
      _castVote(targetId);
    });

    // Enable skip button
    var skipBtn = DOM.id('btn-skip-vote');
    if (skipBtn) skipBtn.disabled = false;

    // Start vote timer
    var duration = Math.floor((data.duration || 30000) / 1000);
    Timer.start('voting', 'vote-timer', duration, {
      urgentAt: 10,
      onDone: function () {
        // Auto-cast vote or skip
        if (!hasVoted) {
          _castVote(selectedTarget || 'skip');
        }
      }
    });
  };

  /**
   * Handle vote:progress
   * @param {object} data - { voted, total }
   */
  Voting.onVoteProgress = function (data) {
    Toast.info(data.voted + '/' + data.total + ' הצביעו', 1500);
  };

  /**
   * Handle vote:tally results
   * Server sends: { tally, ejected (name string), ejectedId, wasRole, noEjection }
   */
  Voting.onVoteTally = function (data) {
    Timer.stop('voting');

    // Show vote counts on cards (server sends 'tally', not 'votes')
    var voteCounts = data.tally || data.votes;
    if (voteCounts) {
      PlayerList.showVoteResults(voteCounts);
    }

    // After a short delay, show ejection result
    setTimeout(function () {
      if (data.ejectedId || (data.ejected && !data.noEjection)) {
        // Mark ejected card by ID
        var ejectedId = data.ejectedId;
        if (ejectedId) {
          var ejectedCard = DOM.qs('.vote-card[data-player-id="' + ejectedId + '"]');
          if (ejectedCard) {
            ejectedCard.classList.add('ejected');
          }
        }

        // data.ejected is the name string from server
        var ejectedName = data.ejected || data.ejectedName || 'שחקן';
        var roleText = data.wasRole === 'saboteur' ? 'מחבל!' : 'צוות...';
        Toast.show(
          ejectedName + ' גורש מהמקלט! הוא היה: ' + roleText,
          data.wasRole === 'saboteur' ? 'success' : 'error',
          4000
        );

        if (data.wasRole === 'saboteur') {
          Audio.success();
        } else {
          Audio.fail();
        }
      } else {
        Toast.info('אף אחד לא גורש', 3000);
      }
    }, 1500);
  };

  function _castVote(targetId) {
    if (hasVoted) return;
    hasVoted = true;

    Socket.emit('vote:cast', { targetId: targetId }, function (response) {
      if (response && response.ok) {
        Toast.success('הצבעה נרשמה!');
        Audio.vote();
      }
    });

    // Disable all vote cards and skip
    DOM.qsa('.vote-card').forEach(function (card) {
      card.classList.add('disabled');
    });
    var skipBtn = DOM.id('btn-skip-vote');
    if (skipBtn) skipBtn.disabled = true;
  }

  window.App.Screens.Voting = Voting;
})();
