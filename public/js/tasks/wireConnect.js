// ── Mini-Game: Wire Connect ("תקן חוטים") ──────────────────────
(function () {
  'use strict';

  window.App = window.App || {};
  App.Tasks = App.Tasks || {};

  var container = null;
  var onDone = null;
  var svgEl = null;
  var activeLine = null;
  var dragSource = null;
  var connectedCount = 0;
  var totalWires = 4;
  var connected = {};  // color -> true

  var WIRE_COLORS = [
    { name: 'red',    hex: '#FF4444', label: 'אדום' },
    { name: 'blue',   hex: '#4488FF', label: 'כחול' },
    { name: 'green',  hex: '#44CC44', label: 'ירוק' },
    { name: 'yellow', hex: '#FFCC00', label: 'צהוב' },
  ];

  function init(bodyEl, params, callback) {
    container = bodyEl;
    onDone = callback;
    connectedCount = 0;
    connected = {};
    dragSource = null;
    activeLine = null;

    // Create layout
    var wrapper = document.createElement('div');
    wrapper.className = 'wire-wrapper';

    // SVG for drawing lines
    svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('class', 'wire-svg');
    svgEl.style.position = 'absolute';
    svgEl.style.top = '0';
    svgEl.style.left = '0';
    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
    svgEl.style.pointerEvents = 'none';
    svgEl.style.zIndex = '5';
    wrapper.appendChild(svgEl);

    // Left column (sources)
    var leftCol = document.createElement('div');
    leftCol.className = 'wire-col wire-col-left';

    // Right column (targets) - shuffled
    var rightCol = document.createElement('div');
    rightCol.className = 'wire-col wire-col-right';

    // Shuffle right side order
    var shuffledRight = WIRE_COLORS.slice();
    for (var i = shuffledRight.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffledRight[i];
      shuffledRight[i] = shuffledRight[j];
      shuffledRight[j] = tmp;
    }

    // Build left endpoints
    WIRE_COLORS.forEach(function (wire) {
      var ep = document.createElement('div');
      ep.className = 'wire-endpoint wire-source';
      ep.setAttribute('data-color', wire.name);
      ep.style.backgroundColor = wire.hex;

      var dot = document.createElement('div');
      dot.className = 'wire-dot';
      dot.style.backgroundColor = wire.hex;
      ep.appendChild(dot);

      leftCol.appendChild(ep);
    });

    // Build right endpoints (shuffled)
    shuffledRight.forEach(function (wire) {
      var ep = document.createElement('div');
      ep.className = 'wire-endpoint wire-target';
      ep.setAttribute('data-color', wire.name);
      ep.style.backgroundColor = wire.hex;

      var dot = document.createElement('div');
      dot.className = 'wire-dot';
      dot.style.backgroundColor = wire.hex;
      ep.appendChild(dot);

      rightCol.appendChild(ep);
    });

    wrapper.appendChild(leftCol);
    wrapper.appendChild(rightCol);
    container.appendChild(wrapper);

    // Hint
    var hint = document.createElement('div');
    hint.className = 'task-hint';
    hint.textContent = 'גרור מהנקודה השמאלית לצבע התואם בימין';
    container.insertBefore(hint, wrapper);

    // Bind touch/mouse events on the wrapper
    bindDragEvents(wrapper);
  }

  function bindDragEvents(wrapper) {
    // Touch events
    wrapper.addEventListener('touchstart', onDragStart, { passive: false });
    wrapper.addEventListener('touchmove', onDragMove, { passive: false });
    wrapper.addEventListener('touchend', onDragEnd, { passive: false });
    wrapper.addEventListener('touchcancel', onDragCancel, { passive: false });

    // Mouse fallback
    wrapper.addEventListener('mousedown', onDragStart);
    wrapper.addEventListener('mousemove', onDragMove);
    wrapper.addEventListener('mouseup', onDragEnd);
    wrapper.addEventListener('mouseleave', onDragCancel);
  }

  function getEventPos(e) {
    // touchmove/touchstart use e.touches; touchend uses e.changedTouches
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onDragStart(e) {
    var target = e.target.closest('.wire-source');
    if (!target) return;

    var color = target.getAttribute('data-color');
    if (connected[color]) return; // already connected

    e.preventDefault();
    dragSource = target;

    // Create SVG line
    var rect = svgEl.getBoundingClientRect();
    var sourceRect = target.getBoundingClientRect();
    var sx = sourceRect.left + sourceRect.width / 2 - rect.left;
    var sy = sourceRect.top + sourceRect.height / 2 - rect.top;

    activeLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    activeLine.setAttribute('x1', sx);
    activeLine.setAttribute('y1', sy);
    activeLine.setAttribute('x2', sx);
    activeLine.setAttribute('y2', sy);
    activeLine.setAttribute('stroke', getColorHex(color));
    activeLine.setAttribute('stroke-width', '4');
    activeLine.setAttribute('stroke-linecap', 'round');
    svgEl.appendChild(activeLine);

    dragSource.classList.add('wire-dragging');
  }

  function onDragMove(e) {
    if (!activeLine || !dragSource) return;
    e.preventDefault();

    var pos = getEventPos(e);
    var rect = svgEl.getBoundingClientRect();

    activeLine.setAttribute('x2', pos.x - rect.left);
    activeLine.setAttribute('y2', pos.y - rect.top);
  }

  function onDragEnd(e) {
    if (!activeLine || !dragSource) return;
    e.preventDefault();

    var pos = getEventPos(e);
    var sourceColor = dragSource.getAttribute('data-color');

    // Find which target we're over
    var targetEl = findTargetAt(pos.x, pos.y);

    if (targetEl) {
      var targetColor = targetEl.getAttribute('data-color');

      if (targetColor === sourceColor) {
        // Correct match!
        connected[sourceColor] = true;
        connectedCount++;

        // Snap line to target center
        var rect = svgEl.getBoundingClientRect();
        var targetRect = targetEl.getBoundingClientRect();
        activeLine.setAttribute('x2', targetRect.left + targetRect.width / 2 - rect.left);
        activeLine.setAttribute('y2', targetRect.top + targetRect.height / 2 - rect.top);
        activeLine.classList.add('wire-connected');

        dragSource.classList.add('wire-done');
        dragSource.classList.remove('wire-dragging');
        targetEl.classList.add('wire-done');

        // Check if all connected
        if (connectedCount >= totalWires) {
          if (onDone) onDone(true);
        }

        // Reset drag state but keep the line
        dragSource = null;
        activeLine = null;
        return;
      }
    }

    // Wrong or missed - snap back
    snapBack();
  }

  function onDragCancel() {
    if (activeLine) snapBack();
  }

  function snapBack() {
    if (activeLine) {
      activeLine.classList.add('wire-snapback');
      var lineToRemove = activeLine;
      setTimeout(function () {
        if (lineToRemove.parentNode) {
          lineToRemove.parentNode.removeChild(lineToRemove);
        }
      }, 300);
    }

    if (dragSource) {
      dragSource.classList.remove('wire-dragging');
    }

    activeLine = null;
    dragSource = null;
  }

  function findTargetAt(x, y) {
    var targets = container.querySelectorAll('.wire-target');
    for (var i = 0; i < targets.length; i++) {
      // Skip already-connected targets
      if (targets[i].classList.contains('wire-done')) continue;
      var r = targets[i].getBoundingClientRect();
      // Generous hit area for touch
      var pad = 15;
      if (x >= r.left - pad && x <= r.right + pad &&
          y >= r.top - pad && y <= r.bottom + pad) {
        return targets[i];
      }
    }
    return null;
  }

  function getColorHex(name) {
    for (var i = 0; i < WIRE_COLORS.length; i++) {
      if (WIRE_COLORS[i].name === name) return WIRE_COLORS[i].hex;
    }
    return '#fff';
  }

  function cleanup() {
    container = null;
    onDone = null;
    svgEl = null;
    activeLine = null;
    dragSource = null;
    connectedCount = 0;
    connected = {};
  }

  // Register with TaskRunner
  function register() {
    if (App.TaskRunner) {
      App.TaskRunner.registerTask('wireConnect', {
        init: init,
        cleanup: cleanup,
      });
    } else {
      setTimeout(register, 100);
    }
  }
  register();

  App.Tasks.WireConnect = { init: init, cleanup: cleanup };
})();
