// ── Shared mutable game state ───────────────────────────────────
const { PHASE, SURVIVAL_START, BAKARI_START } = require('./constants');

const state = {
  phase: PHASE.LOBBY,

  // Map<socketId, playerObj>
  players: {},

  // Host socket id (first player to join)
  hostId: null,

  // Meters
  survival: SURVIVAL_START,
  bakari:   BAKARI_START,

  // Round timer id
  roundTimer:  null,
  decayTimer:  null,
  taskTimer:   null,

  // Voting state
  vote: {
    callerId:  null,
    votes:     {},     // { voterId: targetId | 'skip' }
    timer:     null,
    startedAt: null,
  },

  // Per-player sabotage cooldowns: { socketId: { actionKey: lastUsedTimestamp } }
  cooldowns: {},

  // Track how many tasks each player completed (for stats)
  taskStats: {},
};

// ── Helper: build a player object ───────────────────────────────
function createPlayer(id, name) {
  return {
    id,
    name,
    role:     null,   // assigned on game start
    alive:    true,
    connected: true,
  };
}

// ── Reset the game state back to lobby defaults ─────────────────
function resetGame() {
  // Clear timers
  clearTimeout(state.roundTimer);
  clearInterval(state.decayTimer);
  clearInterval(state.taskTimer);

  state.phase     = PHASE.LOBBY;
  state.survival  = SURVIVAL_START;
  state.bakari    = BAKARI_START;
  state.roundTimer = null;
  state.decayTimer = null;
  state.taskTimer  = null;
  state.cooldowns  = {};
  state.taskStats  = {};

  state.vote = {
    callerId: null,
    votes: {},
    timer: null,
    startedAt: null,
  };

  // Reset player roles but keep them in lobby
  for (const p of Object.values(state.players)) {
    p.role  = null;
    p.alive = true;
  }
}

// ── Snapshot: safe object to send to clients ────────────────────
function publicPlayerList() {
  return Object.values(state.players).map(p => ({
    id:    p.id,
    name:  p.name,
    alive: p.alive,
  }));
}

function metersSnapshot() {
  return {
    survival: state.survival,
    bakari:   state.bakari,
  };
}

module.exports = {
  state,
  createPlayer,
  resetGame,
  publicPlayerList,
  metersSnapshot,
};
