// ── Task Manager: assigns tasks to players on a timer ───────────
const {
  TASK_TYPES, TASK_INTERVAL, QUESTIONS, ROLE, PHASE,
} = require('./constants');

const { state } = require('./gameState');
const { getAlivePlayerIds } = require('./gameLogic');

// ── Generate a random task definition ───────────────────────────
function generateTask() {
  const template = TASK_TYPES[Math.floor(Math.random() * TASK_TYPES.length)];
  const task = {
    id:       `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type:     template.type,
    label:    template.label,
    duration: template.duration,
  };

  // Add type-specific data
  switch (template.type) {
    case 'tapCircles': {
      const count = template.circles.min +
        Math.floor(Math.random() * (template.circles.max - template.circles.min + 1));
      task.circleCount = count;
      break;
    }
    case 'wireConnect': {
      const colors = ['red', 'blue', 'green', 'yellow'];
      // Shuffle colors for the right side
      const shuffled = [...colors].sort(() => Math.random() - 0.5);
      task.wires = colors.map((c, i) => ({ color: c, target: shuffled[i] }));
      break;
    }
    case 'tapToWake': {
      task.requiredTaps = 15;
      break;
    }
    case 'chooseAnswer': {
      const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      task.question = q.q;
      task.answers  = q.answers;
      task.correct  = q.correct;
      break;
    }
    case 'memoryMatch': {
      task.pairs = template.pairs || 4;
      break;
    }
    case 'simonSays': {
      var seqLen = template.sequenceLength || 5;
      var seq = [];
      for (var i = 0; i < seqLen; i++) {
        seq.push(Math.floor(Math.random() * 4));
      }
      task.sequence = seq;
      break;
    }
    case 'catchItems': {
      task.target = template.target || 8;
      break;
    }
    case 'colorSort': {
      task.cans = template.cans || 6;
      break;
    }
    case 'balanceMeter': {
      task.holdTime = template.holdTime || 3;
      task.speed = template.speed || 2;
      break;
    }
    case 'mazeNavigate': {
      // Generate a simple 6x6 maze
      var maze = [
        [0,0,1,0,0,0],
        [1,0,1,0,1,0],
        [0,0,0,0,1,0],
        [0,1,1,0,0,0],
        [0,0,1,0,1,0],
        [1,0,0,0,0,0]
      ];
      // Randomly pick from a few preset mazes for variety
      var mazes = [
        [[0,0,1,0,0,0],[1,0,1,0,1,0],[0,0,0,0,1,0],[0,1,1,0,0,0],[0,0,1,0,1,0],[1,0,0,0,0,0]],
        [[0,0,0,1,0,0],[0,1,0,1,0,0],[0,1,0,0,0,1],[0,0,1,0,1,0],[1,0,1,0,0,0],[0,0,0,0,1,0]],
        [[0,1,0,0,0,0],[0,0,0,1,1,0],[1,1,0,0,0,0],[0,0,0,1,0,1],[0,1,0,1,0,0],[0,0,0,0,0,0]]
      ];
      task.maze = mazes[Math.floor(Math.random() * mazes.length)];
      break;
    }
  }

  return task;
}

// ── Generate a fake task for saboteurs (auto-completes) ─────────
function generateFakeTask() {
  const task = generateTask();
  task.fake = true;
  return task;
}

// ── Assign tasks to all alive players ───────────────────────────
function assignTasks(io) {
  if (state.phase !== PHASE.PLAYING) return;

  const aliveIds = getAlivePlayerIds();

  for (const id of aliveIds) {
    const player = state.players[id];
    if (!player || !player.alive) continue;

    const socket = io.sockets.sockets.get(id);
    if (!socket) continue;

    if (player.role === ROLE.SABOTEUR) {
      // Saboteurs get fake tasks
      const fakeTask = generateFakeTask();
      socket.emit('task:assign', fakeTask);
    } else {
      // Crew gets real tasks
      const task = generateTask();
      socket.emit('task:assign', task);
    }
  }
}

// ── Start the task assignment loop ──────────────────────────────
function startTaskLoop(io) {
  // Assign first batch immediately
  assignTasks(io);

  // Then assign every TASK_INTERVAL
  state.taskTimer = setInterval(() => {
    assignTasks(io);
  }, TASK_INTERVAL);
}

// ── Stop the task loop ──────────────────────────────────────────
function stopTaskLoop() {
  clearInterval(state.taskTimer);
  state.taskTimer = null;
}

module.exports = {
  generateTask,
  generateFakeTask,
  assignTasks,
  startTaskLoop,
  stopTaskLoop,
};
