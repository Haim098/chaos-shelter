# כאוס במקלט: משמר הבקרי

Multiplayer LAN party game for 3-8 players. One (or two) saboteurs try to drain the bakari supply while the crew works together to survive.

## Quick Start

```bash
npm install
npm start
```

Then open `http://localhost:3000` in a browser. All players on the same WiFi can join using the LAN IP printed in the terminal.

## Setup on Termux (Android)

```bash
chmod +x scripts/termux-setup.sh
./scripts/termux-setup.sh
```

## How to Play

1. **Lobby** - Players join by entering a name. The host starts the game when 3-8 players are ready.
2. **Role Reveal** - Each player secretly sees their role: Crew or Saboteur.
3. **Playing** - Crew members complete tasks to fill the survival meter. Saboteurs secretly sabotage the bakari supply.
4. **Voting** - Any player can call a vote to eject a suspected saboteur. Majority rules.
5. **Results** - The game ends when crew fills survival to 100%, bakari drops to 0%, or all saboteurs are ejected.

## Win Conditions

| Winner | Condition |
|--------|-----------|
| Crew | Survival meter reaches 100% |
| Crew | All saboteurs are voted out |
| Saboteur | Bakari meter drops to 0% |
| Saboteur | Saboteurs outnumber crew |

## Game Rules

- **3-6 players**: 1 saboteur
- **7-8 players**: 2 saboteurs
- **Tasks**: Give +5% survival per completion
- **Sabotage actions**: Lights (-5%), Alarm (-8%), Steal (-10%) with cooldowns
- **Voting**: >50% majority needed to eject
- **Round timer**: 180 seconds, then bakari decays over time

## Project Structure

```
chaos-shelter/
  server.js              # Express + Socket.IO server
  package.json
  server/
    constants.js         # Game constants and configuration
    gameState.js         # Shared mutable game state
    gameLogic.js         # Roles, meters, win conditions
    taskManager.js       # Task generation and assignment
    socketHandlers.js    # All socket event handlers
  public/
    index.html           # Single-page app with all screens
    css/                 # Stylesheets
    js/                  # Client-side JavaScript
    assets/              # Images and icons
  scripts/
    termux-setup.sh      # Android/Termux setup script
```

## Tech Stack

- **Server**: Node.js, Express, Socket.IO
- **Client**: Vanilla HTML/CSS/JS (no framework, mobile-first)
- **Network**: LAN/WiFi, no internet required
