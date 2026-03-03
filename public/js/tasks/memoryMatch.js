// ── Mini-Game: Memory Match ("זכור וגלה") ──────────────────────
(function () {
  'use strict';

  window.App = window.App || {};
  App.Tasks = App.Tasks || {};

  var container = null;
  var onDone = null;
  var matchedCount = 0;
  var totalPairs = 4;
  var firstCard = null;
  var secondCard = null;
  var locked = false;
  var revealTimeout = null;
  var mismatchTimeout = null;

  var SYMBOLS = ['💧', '🔦', '🧣', '🍞', '🥫', '🔋', '🧴', '🕯️'];

  function init(bodyEl, params, callback) {
    container = bodyEl;
    onDone = callback;
    matchedCount = 0;
    firstCard = null;
    secondCard = null;
    locked = false;

    totalPairs = (params && params.pairs) ? params.pairs : 4;

    // Pick symbols for this round
    var symbols = SYMBOLS.slice(0, totalPairs);

    // Create pairs array and shuffle
    var cards = [];
    for (var i = 0; i < symbols.length; i++) {
      cards.push(symbols[i]);
      cards.push(symbols[i]);
    }
    shuffle(cards);

    // Hint
    var hint = document.createElement('div');
    hint.className = 'task-hint';
    hint.textContent = 'זכור את המיקומים וגלה את הזוגות!';
    container.appendChild(hint);

    // Grid
    var grid = document.createElement('div');
    grid.className = 'memory-grid';
    container.appendChild(grid);

    for (var j = 0; j < cards.length; j++) {
      var card = document.createElement('div');
      card.className = 'memory-card';
      card.setAttribute('data-index', j);
      card.setAttribute('data-symbol', cards[j]);

      var inner = document.createElement('div');
      inner.className = 'memory-card-inner';

      var front = document.createElement('div');
      front.className = 'memory-card-front';
      front.textContent = cards[j];

      var back = document.createElement('div');
      back.className = 'memory-card-back';
      back.textContent = '?';

      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);

      // Touch + click handler (with guard to prevent double-fire on mobile)
      (function (cardEl) {
        var touchFired = false;
        cardEl.addEventListener('touchstart', function (e) {
          e.preventDefault();
          touchFired = true;
          onCardTap(cardEl);
        }, { passive: false });
        cardEl.addEventListener('click', function (e) {
          e.preventDefault();
          if (touchFired) { touchFired = false; return; }
          onCardTap(cardEl);
        });
      })(card);

      grid.appendChild(card);
    }

    // Reveal all cards for 2 seconds
    locked = true;
    var allCards = grid.querySelectorAll('.memory-card');
    for (var k = 0; k < allCards.length; k++) {
      allCards[k].classList.add('memory-revealed');
    }

    revealTimeout = setTimeout(function () {
      for (var m = 0; m < allCards.length; m++) {
        allCards[m].classList.remove('memory-revealed');
      }
      locked = false;
    }, 2000);
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function onCardTap(cardEl) {
    if (!onDone) return;
    if (locked) return;
    if (cardEl.classList.contains('memory-revealed')) return;
    if (cardEl.classList.contains('memory-matched')) return;

    cardEl.classList.add('memory-revealed');

    if (!firstCard) {
      firstCard = cardEl;
      return;
    }

    secondCard = cardEl;
    locked = true;

    var sym1 = firstCard.getAttribute('data-symbol');
    var sym2 = secondCard.getAttribute('data-symbol');

    if (sym1 === sym2) {
      // Match found
      firstCard.classList.add('memory-matched');
      secondCard.classList.add('memory-matched');
      matchedCount++;
      firstCard = null;
      secondCard = null;
      locked = false;

      if (matchedCount >= totalPairs) {
        if (onDone) onDone(true);
      }
    } else {
      // No match - flip back after 0.5s
      var c1 = firstCard;
      var c2 = secondCard;
      mismatchTimeout = setTimeout(function () {
        c1.classList.remove('memory-revealed');
        c2.classList.remove('memory-revealed');
        firstCard = null;
        secondCard = null;
        locked = false;
      }, 500);
    }
  }

  function cleanup() {
    if (revealTimeout) clearTimeout(revealTimeout);
    if (mismatchTimeout) clearTimeout(mismatchTimeout);
    container = null;
    onDone = null;
    matchedCount = 0;
    totalPairs = 4;
    firstCard = null;
    secondCard = null;
    locked = false;
    revealTimeout = null;
    mismatchTimeout = null;
  }

  // Register with TaskRunner
  function register() {
    if (App.TaskRunner) {
      App.TaskRunner.registerTask('memoryMatch', {
        init: init,
        cleanup: cleanup,
      });
    } else {
      setTimeout(register, 100);
    }
  }
  register();

  App.Tasks.MemoryMatch = { init: init, cleanup: cleanup };
})();
