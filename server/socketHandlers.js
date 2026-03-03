// ── Socket.IO Event Handlers ────────────────────────────────────
const {
  PHASE, ROLE, MIN_PLAYERS, MAX_PLAYERS,
  ROLE_REVEAL_DURATION, ROUND_DURATION,
  VOTE_DURATION, DECAY_INTERVAL, RESULTS_DURATION,
} = require('./constants');

const {
  state, createPlayer, resetGame,
  publicPlayerList, metersSnapshot,
} = require('./gameState');

const {
  assignRoles, onTaskComplete, executeSabotage,
  decayTick, tallyVotes, checkWinConditions,
  getAlivePlayers,
} = require('./gameLogic');

const { startTaskLoop, stopTaskLoop } = require('./taskManager');

// ── Register all socket handlers ────────────────────────────────
function registerHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[connect] ${socket.id}`);

    // ── player:join ─────────────────────────────────────────────
    socket.on('player:join', (data, ack) => {
      const name = (data && data.name || '').trim().slice(0, 20);
      if (!name) {
        if (ack) ack({ ok: false, error: 'שם לא תקין' });
        return;
      }

      // Reconnection support: check if a disconnected player with same name exists
      const existingEntry = Object.entries(state.players).find(
        ([, p]) => p.name.toLowerCase() === name.toLowerCase()
      );

      if (existingEntry && state.phase !== PHASE.LOBBY) {
        const [oldId, existingPlayer] = existingEntry;

        if (!existingPlayer.connected) {
          // Reconnecting player: migrate to new socket id
          existingPlayer.id = socket.id;
          existingPlayer.connected = true;
          state.players[socket.id] = existingPlayer;
          delete state.players[oldId];

          // Reassign host if needed
          if (state.hostId === oldId) {
            state.hostId = socket.id;
          }

          if (ack) ack({ ok: true, playerId: socket.id, reconnected: true, phase: state.phase, role: existingPlayer.role });

          // Send current game state to reconnected player
          if (state.phase === PHASE.PLAYING || state.phase === PHASE.VOTING) {
            socket.emit('game:playing', {
              meters:   metersSnapshot(),
              players:  publicPlayerList(),
              duration: ROUND_DURATION,
              startedAt: state.roundStartedAt || Date.now(),
              aliveCount: getAlivePlayers().length,
              totalCount: Object.keys(state.players).length,
            });
          }

          console.log(`[reconnect] ${name} (${oldId} -> ${socket.id})`);
          return;
        }
      }

      if (state.phase !== PHASE.LOBBY) {
        if (ack) ack({ ok: false, error: 'המשחק כבר התחיל' });
        return;
      }

      if (Object.keys(state.players).length >= MAX_PLAYERS) {
        if (ack) ack({ ok: false, error: 'המקלט מלא! (מקסימום 8)' });
        return;
      }

      // Check duplicate name
      const nameExists = Object.values(state.players).some(
        p => p.name.toLowerCase() === name.toLowerCase()
      );
      if (nameExists) {
        if (ack) ack({ ok: false, error: 'השם הזה כבר תפוס' });
        return;
      }

      // Create the player
      state.players[socket.id] = createPlayer(socket.id, name);

      // First player is the host
      if (!state.hostId || !state.players[state.hostId]) {
        state.hostId = socket.id;
      }

      if (ack) ack({ ok: true, playerId: socket.id });

      // Broadcast updated lobby
      io.emit('lobby:update', {
        players: publicPlayerList(),
        hostId:  state.hostId,
        count:   Object.keys(state.players).length,
      });

      console.log(`[join] ${name} (${socket.id}) - ${Object.keys(state.players).length} players`);
    });

    // ── game:start (host only) ──────────────────────────────────
    socket.on('game:start', (_, ack) => {
      if (socket.id !== state.hostId) {
        if (ack) ack({ ok: false, error: 'רק המארח יכול להתחיל' });
        return;
      }

      if (state.phase !== PHASE.LOBBY) {
        if (ack) ack({ ok: false, error: 'המשחק כבר רץ' });
        return;
      }

      const playerCount = Object.keys(state.players).length;
      if (playerCount < MIN_PLAYERS) {
        if (ack) ack({ ok: false, error: `צריך לפחות ${MIN_PLAYERS} שחקנים` });
        return;
      }

      // ── Assign roles ──────────────────────────────────────────
      assignRoles();
      state.phase = PHASE.ROLE_REVEAL;

      if (ack) ack({ ok: true });

      // Send each player their personal role reveal
      for (const [id, player] of Object.entries(state.players)) {
        const s = io.sockets.sockets.get(id);
        if (s) {
          s.emit('game:roleReveal', {
            role:    player.role,
            name:    player.name,
            players: publicPlayerList(),
          });
        }
      }

      console.log(`[game:start] Roles assigned, revealing for ${ROLE_REVEAL_DURATION / 1000}s`);

      // After reveal, start playing phase
      setTimeout(() => {
        startPlayingPhase(io);
      }, ROLE_REVEAL_DURATION);
    });

    // ── task:complete ───────────────────────────────────────────
    socket.on('task:complete', (data, ack) => {
      if (state.phase !== PHASE.PLAYING) {
        if (ack) ack({ ok: false });
        return;
      }

      const player = state.players[socket.id];
      if (!player || !player.alive) {
        if (ack) ack({ ok: false });
        return;
      }

      // Saboteur fake task completions are accepted silently (no meter change)
      if (player.role === ROLE.SABOTEUR) {
        if (ack) ack({ ok: true, fake: true });
        return;
      }

      // Real crew task completion
      const gameEnded = onTaskComplete(socket.id, io);
      if (ack) ack({ ok: true });
    });

    // ── sabotage:action ─────────────────────────────────────────
    socket.on('sabotage:action', (data, ack) => {
      const actionKey = data && data.action;
      if (!actionKey) {
        if (ack) ack({ ok: false, error: 'פעולה לא תקינה' });
        return;
      }

      const result = executeSabotage(socket.id, actionKey, io);
      if (ack) ack({ ok: result.performed, performed: result.performed });
    });

    // ── vote:call ───────────────────────────────────────────────
    socket.on('vote:call', (_, ack) => {
      if (state.phase !== PHASE.PLAYING) {
        if (ack) ack({ ok: false, error: 'לא בזמן משחק' });
        return;
      }

      const player = state.players[socket.id];
      if (!player || !player.alive) {
        if (ack) ack({ ok: false, error: 'לא ניתן להצביע' });
        return;
      }

      // Start voting phase - stop all gameplay timers
      stopTaskLoop();
      clearTimeout(state.roundTimer);
      clearInterval(state.decayTimer);
      state.roundTimer = null;
      state.decayTimer = null;

      state.phase = PHASE.VOTING;
      state.vote = {
        callerId:  socket.id,
        votes:     {},
        timer:     null,
        startedAt: Date.now(),
      };

      if (ack) ack({ ok: true });

      const alivePlayers = getAlivePlayers().map(p => ({
        id: p.id, name: p.name,
      }));

      io.emit('vote:started', {
        callerId:   socket.id,
        callerName: player.name,
        players:    alivePlayers,
        duration:   VOTE_DURATION,
      });

      console.log(`[vote:call] ${player.name} called a vote`);

      // Vote timer
      state.vote.timer = setTimeout(() => {
        resolveVote(io);
      }, VOTE_DURATION);
    });

    // ── vote:cast ───────────────────────────────────────────────
    socket.on('vote:cast', (data, ack) => {
      if (state.phase !== PHASE.VOTING) {
        if (ack) ack({ ok: false });
        return;
      }

      const player = state.players[socket.id];
      if (!player || !player.alive) {
        if (ack) ack({ ok: false });
        return;
      }

      const targetId = data && data.targetId; // targetId or 'skip'
      if (!targetId) {
        if (ack) ack({ ok: false });
        return;
      }

      // Validate target
      if (targetId !== 'skip') {
        const target = state.players[targetId];
        if (!target || !target.alive) {
          if (ack) ack({ ok: false, error: 'יעד לא תקין' });
          return;
        }
      }

      state.vote.votes[socket.id] = targetId;
      if (ack) ack({ ok: true });

      // Broadcast vote count progress
      const alivePlayers = getAlivePlayers();
      const voteCount = Object.keys(state.vote.votes).length;
      io.emit('vote:progress', {
        voted: voteCount,
        total: alivePlayers.length,
      });

      // If everyone voted, resolve early
      if (voteCount >= alivePlayers.length) {
        clearTimeout(state.vote.timer);
        resolveVote(io);
      }
    });

    // ── game:restart (host only, from results) ──────────────────
    socket.on('game:restart', (_, ack) => {
      if (socket.id !== state.hostId) {
        if (ack) ack({ ok: false, error: 'רק המארח יכול להתחיל מחדש' });
        return;
      }

      resetGame();

      if (ack) ack({ ok: true });

      io.emit('lobby:update', {
        players: publicPlayerList(),
        hostId:  state.hostId,
        count:   Object.keys(state.players).length,
      });

      console.log('[game:restart] Back to lobby');
    });

    // ── disconnect ──────────────────────────────────────────────
    socket.on('disconnect', () => {
      const player = state.players[socket.id];
      if (!player) return;

      console.log(`[disconnect] ${player.name} (${socket.id})`);

      // In lobby, remove completely
      if (state.phase === PHASE.LOBBY) {
        delete state.players[socket.id];
      } else {
        // During game, mark as disconnected but keep alive for reconnection
        player.connected = false;

        // If voting, remove their vote and check if all remaining alive players voted
        if (state.phase === PHASE.VOTING) {
          delete state.vote.votes[socket.id];
          const alivePlayers = getAlivePlayers();
          const voteCount = Object.keys(state.vote.votes).length;
          io.emit('vote:progress', {
            voted: voteCount,
            total: alivePlayers.length,
          });
          if (alivePlayers.length > 0 && voteCount >= alivePlayers.length) {
            clearTimeout(state.vote.timer);
            resolveVote(io);
          }
        }
      }

      // Reassign host if needed
      if (state.hostId === socket.id) {
        const remaining = Object.keys(state.players);
        state.hostId = remaining.length > 0 ? remaining[0] : null;
      }

      // If no players left, full reset
      if (Object.keys(state.players).length === 0) {
        resetGame();
        return;
      }

      // Update lobby or check win conditions
      if (state.phase === PHASE.LOBBY) {
        io.emit('lobby:update', {
          players: publicPlayerList(),
          hostId:  state.hostId,
          count:   Object.keys(state.players).length,
        });
      } else if (state.phase !== PHASE.VOTING) {
        // Don't double-check during voting; resolveVote handles it
        io.emit('meters:update', metersSnapshot());
        checkWinConditions(io);
      }
    });
  });
}

// ── Start Playing Phase ─────────────────────────────────────────
function startPlayingPhase(io) {
  state.phase = PHASE.PLAYING;
  state.roundStartedAt = Date.now();

  io.emit('game:playing', {
    meters:   metersSnapshot(),
    players:  publicPlayerList(),
    duration: ROUND_DURATION,
    startedAt: state.roundStartedAt,
    aliveCount: getAlivePlayers().length,
    totalCount: Object.keys(state.players).length,
  });

  // Start task assignment loop
  startTaskLoop(io);

  // Round timer: after ROUND_DURATION, start meter decay
  state.roundTimer = setTimeout(() => {
    console.log('[round] Timer expired, starting decay');
    state.decayTimer = setInterval(() => {
      decayTick(io);
    }, DECAY_INTERVAL);
  }, ROUND_DURATION);

  console.log(`[playing] Game started! Round: ${ROUND_DURATION / 1000}s`);
}

// ── Resolve Voting ──────────────────────────────────────────────
function resolveVote(io) {
  if (state.phase !== PHASE.VOTING) return;

  const result = tallyVotes(io);

  console.log(`[vote:tally] ${result.ejected ? `Ejected: ${result.ejected} (${result.wasRole})` : 'No ejection'}`);

  // Check win conditions after ejection
  const gameEnded = checkWinConditions(io);

  if (!gameEnded) {
    // Resume playing after a short delay
    // Keep phase as VOTING until startPlayingPhase transitions it
    setTimeout(() => {
      if (state.phase !== PHASE.VOTING) return;
      startPlayingPhase(io);
    }, 3000);
  }
}

module.exports = { registerHandlers };
