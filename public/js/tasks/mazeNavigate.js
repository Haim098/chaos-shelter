// ── Mini-Game: Maze Navigate ("מצא את הדרך") ──────────────────────
(function () {
  'use strict';

  window.App = window.App || {};
  App.Tasks = App.Tasks || {};

  var container = null;
  var onDone = null;
  var maze = null;
  var playerRow = 0;
  var playerCol = 0;
  var exitRow = 5;
  var exitCol = 5;
  var cells = null; // 2D array of cell DOM elements
  var gridEl = null;
  var finished = false;
  var touchStartX = 0;
  var touchStartY = 0;
  var keyHandler = null;

  // Pre-made solvable mazes (0=path, 1=wall)
  // Each has a clear path from top-left to bottom-right
  var MAZES = [
    [
      [0, 0, 0, 1, 0, 0],
      [1, 1, 0, 1, 0, 1],
      [0, 0, 0, 0, 0, 1],
      [0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0],
      [1, 1, 0, 0, 0, 0]
    ],
    [
      [0, 0, 1, 0, 0, 0],
      [1, 0, 0, 0, 1, 0],
      [1, 0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 1],
      [0, 0, 0, 0, 0, 0]
    ],
    [
      [0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 0],
      [1, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 1],
      [0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0]
    ]
  ];

  function init(bodyEl, params, callback) {
    container = bodyEl;
    onDone = callback;
    finished = false;

    // Use server maze or pick a random pre-made one
    maze = (params && params.maze) ? params.maze : MAZES[Math.floor(Math.random() * MAZES.length)];

    // Start = top-left open cell
    playerRow = 0;
    playerCol = 0;
    findStart();

    // Exit = bottom-right open cell
    exitRow = maze.length - 1;
    exitCol = maze[0].length - 1;
    findExit();

    // Wrapper with forced LTR to prevent RTL flipping
    var wrapper = document.createElement('div');
    wrapper.style.direction = 'ltr';
    wrapper.style.textAlign = 'center';
    container.appendChild(wrapper);

    // Hint
    var hint = document.createElement('div');
    hint.className = 'maze-hint task-hint';
    hint.textContent = 'מצא את הדרך ליציאה!';
    wrapper.appendChild(hint);

    // Grid - uses cell-based rendering (no absolute positioning)
    gridEl = document.createElement('div');
    gridEl.className = 'maze-grid';
    wrapper.appendChild(gridEl);

    // Build cells as 2D array for easy updates
    cells = [];
    for (var r = 0; r < maze.length; r++) {
      cells[r] = [];
      for (var c = 0; c < maze[r].length; c++) {
        var cell = document.createElement('div');
        cell.className = 'maze-cell';

        if (maze[r][c] === 1) {
          cell.classList.add('maze-wall');
        } else {
          cell.classList.add('maze-path');
        }

        // Mark player start
        if (r === playerRow && c === playerCol) {
          cell.classList.add('maze-player-cell');
        }

        // Mark exit
        if (r === exitRow && c === exitCol) {
          cell.classList.add('maze-exit-cell');
        }

        gridEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    // Direction controls (also forced LTR)
    var controls = document.createElement('div');
    controls.className = 'maze-controls';

    var btnUp = createDirButton('\u25B2', 'up');       // ▲
    var btnRow = document.createElement('div');
    btnRow.className = 'maze-btn-row';
    var btnLeft = createDirButton('\u25C0', 'left');    // ◀
    var btnDown2 = createDirButton('\u25BC', 'down');   // ▼ (center)
    var btnRight = createDirButton('\u25B6', 'right');  // ▶
    btnRow.appendChild(btnLeft);
    btnRow.appendChild(btnDown2);
    btnRow.appendChild(btnRight);

    controls.appendChild(btnUp);
    controls.appendChild(btnRow);
    wrapper.appendChild(controls);

    // Keyboard support
    keyHandler = function (e) {
      if (finished) return;
      var dir = null;
      if (e.key === 'ArrowUp' || e.key === 'w') dir = 'up';
      else if (e.key === 'ArrowDown' || e.key === 's') dir = 'down';
      else if (e.key === 'ArrowLeft' || e.key === 'a') dir = 'left';
      else if (e.key === 'ArrowRight' || e.key === 'd') dir = 'right';
      if (dir) {
        e.preventDefault();
        movePlayer(dir);
      }
    };
    document.addEventListener('keydown', keyHandler);

    // Swipe gesture support on the grid
    gridEl.addEventListener('touchstart', onSwipeStart, { passive: false });
    gridEl.addEventListener('touchend', onSwipeEnd, { passive: false });
  }

  function findStart() {
    for (var r = 0; r < maze.length; r++) {
      for (var c = 0; c < maze[r].length; c++) {
        if (maze[r][c] === 0) {
          playerRow = r;
          playerCol = c;
          return;
        }
      }
    }
  }

  function findExit() {
    for (var r = maze.length - 1; r >= 0; r--) {
      for (var c = maze[r].length - 1; c >= 0; c--) {
        if (maze[r][c] === 0) {
          exitRow = r;
          exitCol = c;
          return;
        }
      }
    }
  }

  function createDirButton(label, direction) {
    var btn = document.createElement('button');
    btn.className = 'maze-btn';
    btn.setAttribute('type', 'button');
    btn.textContent = label;

    var handled = false;

    function onPress(e) {
      e.preventDefault();
      e.stopPropagation();
      if (handled) return;
      handled = true;
      movePlayer(direction);
      setTimeout(function () { handled = false; }, 150);
    }

    btn.addEventListener('pointerdown', onPress);
    btn.addEventListener('touchstart', onPress, { passive: false });
    btn.addEventListener('click', onPress);

    return btn;
  }

  function movePlayer(direction) {
    if (finished || !cells) return;

    var newRow = playerRow;
    var newCol = playerCol;

    if (direction === 'up') newRow--;
    else if (direction === 'down') newRow++;
    else if (direction === 'left') newCol--;
    else if (direction === 'right') newCol++;

    // Check bounds
    if (newRow < 0 || newRow >= maze.length) return;
    if (newCol < 0 || newCol >= maze[0].length) return;

    // Check wall
    if (maze[newRow][newCol] === 1) return;

    // Clear old position
    cells[playerRow][playerCol].classList.remove('maze-player-cell');

    // Set new position
    playerRow = newRow;
    playerCol = newCol;
    cells[playerRow][playerCol].classList.add('maze-player-cell');

    // Check win
    if (playerRow === exitRow && playerCol === exitCol) {
      finished = true;
      cells[playerRow][playerCol].classList.add('maze-player-win');
      setTimeout(function () {
        if (onDone) onDone(true);
      }, 400);
    }
  }

  function onSwipeStart(e) {
    if (e.touches && e.touches.length > 0) {
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }

  function onSwipeEnd(e) {
    if (finished) return;
    if (e.changedTouches && e.changedTouches.length > 0) {
      e.preventDefault();
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      var minSwipe = 20;

      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        movePlayer(dx > 0 ? 'right' : 'left');
      } else {
        movePlayer(dy > 0 ? 'down' : 'up');
      }
    }
  }

  function cleanup() {
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    container = null;
    onDone = null;
    maze = null;
    cells = null;
    gridEl = null;
    playerRow = 0;
    playerCol = 0;
    exitRow = 5;
    exitCol = 5;
    finished = false;
    touchStartX = 0;
    touchStartY = 0;
  }

  // Register with TaskRunner
  function register() {
    if (App.TaskRunner) {
      App.TaskRunner.registerTask('mazeNavigate', {
        init: init,
        cleanup: cleanup,
      });
    } else {
      setTimeout(register, 100);
    }
  }
  register();

  App.Tasks.MazeNavigate = { init: init, cleanup: cleanup };
})();
