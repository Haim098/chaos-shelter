// ── Mini-Game: Catch Items ("תפוס אספקה!") ─────────────────────
(function () {
  'use strict';

  window.App = window.App || {};
  App.Tasks = App.Tasks || {};

  var container = null;
  var onDone = null;
  var score = 0;
  var target = 8;
  var spawnInterval = null;
  var catchArea = null;
  var scoreEl = null;

  var GOOD_ITEMS = ['💧', '🔦', '🧣', '🍞', '🥫', '🔋'];
  var BAD_ITEMS = ['🐀', '🪳'];

  function init(bodyEl, params, callback) {
    container = bodyEl;
    onDone = callback;
    score = 0;

    target = (params && params.target) ? params.target : 8;

    // Hint
    var hint = document.createElement('div');
    hint.className = 'catch-hint task-hint';
    hint.textContent = 'תפוס אספקה! אל תיגע בחרקים!';
    container.appendChild(hint);

    // Catch area
    catchArea = document.createElement('div');
    catchArea.className = 'catch-area';
    container.appendChild(catchArea);

    // Score display
    scoreEl = document.createElement('div');
    scoreEl.className = 'catch-score';
    scoreEl.textContent = '0 / ' + target;
    container.appendChild(scoreEl);

    // Inject keyframes if not already present
    injectKeyframes();

    // Start spawning items
    spawnInterval = setInterval(spawnItem, 400);
  }

  function injectKeyframes() {
    if (document.getElementById('catch-fall-keyframes')) return;
    var style = document.createElement('style');
    style.id = 'catch-fall-keyframes';
    style.textContent =
      '@keyframes catchFall { 0% { transform: translateY(0); opacity: 1; } ' +
      '90% { opacity: 1; } 100% { transform: translateY(300px); opacity: 0; } }' +
      '@keyframes catchGrabbed { 0% { transform: scale(1); opacity: 1; } ' +
      '100% { transform: scale(1.5); opacity: 0; } }';
    document.head.appendChild(style);
  }

  function spawnItem() {
    if (!catchArea || !onDone) return;

    var isGood = Math.random() > 0.2; // 80% good, 20% bad
    var pool = isGood ? GOOD_ITEMS : BAD_ITEMS;
    var symbol = pool[Math.floor(Math.random() * pool.length)];

    var item = document.createElement('div');
    item.className = 'catch-item';
    item.setAttribute('data-good', isGood ? 'true' : 'false');
    item.textContent = symbol;

    // Random horizontal position
    var xPos = 5 + Math.random() * 80; // 5% to 85%
    item.style.left = xPos + '%';
    item.style.top = '0';
    item.style.position = 'absolute';
    item.style.animation = 'catchFall 2.5s linear forwards';

    // Touch + click handler (with guard to prevent double-fire on mobile)
    (function (itemEl, good) {
      var touchFired = false;
      itemEl.addEventListener('touchstart', function (e) {
        e.preventDefault();
        touchFired = true;
        onItemTap(itemEl, good);
      }, { passive: false });
      itemEl.addEventListener('click', function (e) {
        e.preventDefault();
        if (touchFired) { touchFired = false; return; }
        onItemTap(itemEl, good);
      });
    })(item, isGood);

    catchArea.appendChild(item);

    // Auto-remove after animation ends
    setTimeout(function () {
      if (item.parentNode) {
        item.parentNode.removeChild(item);
      }
    }, 2500);
  }

  function onItemTap(itemEl, isGood) {
    if (!onDone) return;
    if (itemEl.classList.contains('catch-grabbed') || itemEl.classList.contains('catch-bad-hit')) return;

    if (isGood) {
      score++;
      itemEl.classList.add('catch-grabbed');
      itemEl.style.animation = 'catchGrabbed 0.3s ease-out forwards';
      itemEl.style.pointerEvents = 'none';

      // Remove after animation
      setTimeout(function () {
        if (itemEl.parentNode) {
          itemEl.parentNode.removeChild(itemEl);
        }
      }, 300);
    } else {
      // BAD ITEM (roach/rat) = instant fail!
      if (spawnInterval) clearInterval(spawnInterval);
      spawnInterval = null;

      // Stop the fall animation and show big red X
      itemEl.style.animation = 'none';
      itemEl.style.transform = 'scale(2)';
      itemEl.style.filter = 'drop-shadow(0 0 12px red)';
      itemEl.style.pointerEvents = 'none';
      itemEl.classList.add('catch-bad-hit');

      // Flash the whole area red
      if (catchArea) {
        catchArea.style.background = 'rgba(255, 0, 0, 0.2)';
        catchArea.style.boxShadow = 'inset 0 0 40px rgba(255, 0, 0, 0.4)';
      }

      // Update score to show failure
      if (scoreEl) {
        scoreEl.textContent = 'נגעת בחרק!';
        scoreEl.style.color = '#ff4444';
        scoreEl.style.fontSize = '1.3rem';
      }

      // Disable all remaining items
      if (catchArea) {
        var items = catchArea.querySelectorAll('.catch-item');
        for (var i = 0; i < items.length; i++) {
          items[i].style.pointerEvents = 'none';
        }
      }

      // Fail the task after brief feedback
      var doneRef = onDone;
      onDone = null; // prevent further callbacks
      setTimeout(function () {
        if (doneRef) doneRef(false);
      }, 600);
      return;
    }

    // Update score display
    if (scoreEl) scoreEl.textContent = score + ' / ' + target;

    // Check win
    if (score >= target) {
      if (spawnInterval) clearInterval(spawnInterval);
      setTimeout(function () {
        if (onDone) onDone(true);
      }, 300);
    }
  }

  function cleanup() {
    if (spawnInterval) clearInterval(spawnInterval);
    container = null;
    onDone = null;
    score = 0;
    target = 8;
    spawnInterval = null;
    catchArea = null;
    scoreEl = null;
  }

  // Register with TaskRunner
  function register() {
    if (App.TaskRunner) {
      App.TaskRunner.registerTask('catchItems', {
        init: init,
        cleanup: cleanup,
      });
    } else {
      setTimeout(register, 100);
    }
  }
  register();

  App.Tasks.CatchItems = { init: init, cleanup: cleanup };
})();
