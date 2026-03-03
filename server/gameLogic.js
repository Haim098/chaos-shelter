// ── Game Logic: roles, meters, win conditions ──────────────────
const {
  PHASE, ROLE, saboteurCount,
  SURVIVAL_WIN, BAKARI_LOSE,
  TASK_REWARD, SABOTAGE,
  DECAY_AMOUNT,
} = require('./constants');

const { state, metersSnapshot } = require('./gameState');

// ── Role Assignment ─────────────────────────────────────────────
// Shuffle array in-place (Fisher-Yates)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function assignRoles() {
  const ids = Object.keys(state.players);
  shuffle(ids);

  const numSaboteurs = saboteurCount(ids.length);

  ids.forEach((id, idx) => {
    state.players[id].role = idx < numSaboteurs ? ROLE.SABOTEUR : ROLE.CREW;
  });
}

// ── Meter Manipulation ──────────────────────────────────────────
function addSurvival(amount) {
  state.survival = Math.min(100, Math.max(0, state.survival + amount));
}

function addBakari(amount) {
  state.bakari = Math.min(100, Math.max(0, state.bakari + amount));
}

// Called when a crew member completes a task
function onTaskComplete(playerId, io) {
  const player = state.players[playerId];
  if (!player || !player.alive) return false;
  if (state.phase !== PHASE.PLAYING) return false;

  addSurvival(TASK_REWARD);

  // Track stats
  if (!state.taskStats[playerId]) state.taskStats[playerId] = 0;
  state.taskStats[playerId]++;

  // Broadcast updated meters
  io.emit('meters:update', metersSnapshot());

  // Check win condition
  return checkWinConditions(io);
}

// ── Sabotage ────────────────────────────────────────────────────
function canSabotage(playerId, actionKey) {
  const player = state.players[playerId];
  if (!player || player.role !== ROLE.SABOTEUR || !player.alive) return false;
  if (state.phase !== PHASE.PLAYING) return false;

  const action = SABOTAGE[actionKey];
  if (!action) return false;

  // Check cooldown
  if (!state.cooldowns[playerId]) state.cooldowns[playerId] = {};
  const lastUsed = state.cooldowns[playerId][actionKey] || 0;
  const now = Date.now();
  if (now - lastUsed < action.cooldown) return false;

  return true;
}

function executeSabotage(playerId, actionKey, io) {
  if (!canSabotage(playerId, actionKey)) return { performed: false };

  const action = SABOTAGE[actionKey];
  state.cooldowns[playerId][actionKey] = Date.now();

  // Reduce bakari meter
  addBakari(-action.cost);

  // Broadcast sabotage event to all players
  io.emit('sabotage:event', {
    actionKey,
    label: action.label,
    bakari: state.bakari,
  });

  // Broadcast updated meters
  io.emit('meters:update', metersSnapshot());

  // Check win condition
  const gameEnded = checkWinConditions(io);
  return { performed: true, gameEnded };
}

// ── Decay (after round timer expires) ───────────────────────────
function decayTick(io) {
  if (state.phase !== PHASE.PLAYING) return;

  addBakari(-DECAY_AMOUNT);
  io.emit('meters:update', metersSnapshot());
  checkWinConditions(io);
}

// ── Voting ──────────────────────────────────────────────────────
function tallyVotes(io) {
  const votes = state.vote.votes;
  const tally = {};  // targetId -> count
  let totalVotes = 0;

  // Only count votes from alive players
  for (const [voterId, targetId] of Object.entries(votes)) {
    const voter = state.players[voterId];
    if (!voter || !voter.alive) continue;
    if (!tally[targetId]) tally[targetId] = 0;
    tally[targetId]++;
    totalVotes++;
  }

  // Find who got the most votes (ties result in no ejection)
  let maxVotes = 0;
  let ejectedId = null;
  let isTied = false;

  for (const [targetId, count] of Object.entries(tally)) {
    if (targetId === 'skip') continue;
    if (count > maxVotes) {
      maxVotes = count;
      ejectedId = targetId;
      isTied = false;
    } else if (count === maxVotes && count > 0) {
      isTied = true;
    }
  }

  // If tied, no one is ejected
  if (isTied) {
    ejectedId = null;
  }

  // Need >50% of alive players to eject
  const alivePlayers = Object.values(state.players).filter(p => p.alive);
  const majority = Math.floor(alivePlayers.length / 2) + 1;

  let ejected = null;
  let wasRole = null;

  if (ejectedId && maxVotes >= majority && state.players[ejectedId]) {
    state.players[ejectedId].alive = false;
    ejected = state.players[ejectedId].name;
    wasRole = state.players[ejectedId].role;
  }

  const result = {
    tally,
    ejected,
    ejectedId,
    wasRole,
    noEjection: !ejected,
  };

  // Broadcast tally
  io.emit('vote:tally', result);

  return result;
}

// ── Win Conditions ──────────────────────────────────────────────
function checkWinConditions(io) {
  if (state.phase !== PHASE.PLAYING && state.phase !== PHASE.VOTING) return false;

  const aliveSaboteurs = Object.values(state.players)
    .filter(p => p.role === ROLE.SABOTEUR && p.alive);
  const alivePlayers = Object.values(state.players).filter(p => p.alive);
  const aliveCrew = alivePlayers.filter(p => p.role === ROLE.CREW);

  // Priority order: check definitive wins first, with early return

  // Crew wins: survival reached 100%
  if (state.survival >= SURVIVAL_WIN) {
    endGame('crew', 'meter_full', io);
    return true;
  }

  // Crew wins: all saboteurs ejected/disconnected
  if (aliveSaboteurs.length === 0) {
    endGame('crew', 'saboteurs_ejected', io);
    return true;
  }

  // Saboteur wins: bakari reached 0%
  if (state.bakari <= BAKARI_LOSE) {
    endGame('saboteur', 'bakari_empty', io);
    return true;
  }

  // Saboteur wins: saboteurs outnumber or equal crew among alive players
  if (aliveSaboteurs.length >= aliveCrew.length) {
    endGame('saboteur', 'saboteur_majority', io);
    return true;
  }

  return false;
}

function endGame(winner, reason, io) {
  // Clear all timers
  clearTimeout(state.roundTimer);
  clearInterval(state.decayTimer);
  clearInterval(state.taskTimer);
  clearTimeout(state.vote.timer);
  state.roundTimer = null;
  state.decayTimer = null;
  state.taskTimer  = null;
  state.vote.timer = null;

  state.phase = PHASE.RESULTS;

  // Reveal all roles
  const playerRoles = {};
  for (const [id, p] of Object.entries(state.players)) {
    playerRoles[id] = { name: p.name, role: p.role, alive: p.alive };
  }

  io.emit('game:over', {
    winner,
    reason,
    players: playerRoles,
    meters:  metersSnapshot(),
    stats:   state.taskStats,
  });
}

// ── Alive player helpers ────────────────────────────────────────
function getAlivePlayers() {
  return Object.values(state.players).filter(p => p.alive);
}

function getAlivePlayerIds() {
  return Object.values(state.players).filter(p => p.alive).map(p => p.id);
}

module.exports = {
  assignRoles,
  addSurvival,
  addBakari,
  onTaskComplete,
  canSabotage,
  executeSabotage,
  decayTick,
  tallyVotes,
  checkWinConditions,
  endGame,
  getAlivePlayers,
  getAlivePlayerIds,
};
