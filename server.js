// ── Chaos Shelter Server ────────────────────────────────────────
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout:  5000,
});

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Socket handling ─────────────────────────────────────────────
const { registerHandlers } = require('./server/socketHandlers');
registerHandlers(io);

// ── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  // Find local IP for LAN play
  const nets = require('os').networkInterfaces();
  let lanIP = 'localhost';
  for (const iface of Object.values(nets)) {
    for (const cfg of iface) {
      if (cfg.family === 'IPv4' && !cfg.internal) {
        lanIP = cfg.address;
        break;
      }
    }
  }
  console.log(`\n🎮  כאוס במקלט - Server running!`);
  console.log(`    Local:  http://localhost:${PORT}`);
  console.log(`    LAN:    http://${lanIP}:${PORT}\n`);
});
