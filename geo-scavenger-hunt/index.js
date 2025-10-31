// Minimal server for Geo Scavenger Hunt (Express + Socket.IO)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store (swap for DB in production)
const games = {}; // { code: { hostId, players: [{id,name}], checkpoints: [], status } }

// Simple join-code generator
function generateJoinCode(len = 6) {
  return Math.random().toString(36).substring(2, 2+len).toUpperCase();
}

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Create a game
app.post('/api/game/create', (req, res) => {
  const { boundary, timeLimit, settings } = req.body || {};
  const code = generateJoinCode(6);
  games[code] = {
    hostId: null,
    players: [],
    settings: { boundary, timeLimit, ...settings },
    status: 'waiting',
    createdAt: Date.now()
  };
  res.json({ code, joinUrl: `/join/${code}` });
});

// Simple endpoint to fetch game state (for debugging)
app.get('/api/game/:code', (req, res) => {
  const g = games[req.params.code];
  if (!g) return res.status(404).json({ error: 'not found' });
  res.json(g);
});

// Serve index (frontend) for any other path (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join_game', ({ code, name }, cb) => {
    const game = games[code];
    if (!game) {
      return cb && cb({ error: 'Game not found' });
    }
    // add player
    const player = { id: socket.id, name, score: 0, visited: [] };
    game.players.push(player);
    socket.join(code);
    // set host if first player
    if (!game.hostId) game.hostId = socket.id;
    // broadcast updated lobby
    io.to(code).emit('lobby_update', { players: game.players.map(p => ({ id: p.id, name: p.name })) });
    cb && cb({ ok: true, playerId: player.id });
  });

  socket.on('start_game', ({ code }, cb) => {
    const game = games[code];
    if (!game) return cb && cb({ error: 'Game not found' });
    if (socket.id !== game.hostId) return cb && cb({ error: 'Only host can start' });
    game.status = 'active';
    // For demo: auto-generate simple checkpoints
    game.checkpoints = [
      { id: 'c1', lat: 0, lon: 0, question: 'Demo Q1' },
      { id: 'c2', lat: 0, lon: 0, question: 'Demo Q2' }
    ];
    io.to(code).emit('game_started', { checkpoints: game.checkpoints });
    cb && cb({ ok: true });
  });

  socket.on('player_location', ({ code, lat, lon }) => {
    // For production: validate proximity server-side if desired
    // Broadcast to other players for demo (e.g., show live positions)
    socket.to(code).emit('player_moved', { id: socket.id, lat, lon });
  });

  socket.on('submit_answer', ({ code, checkpointId, answer }, cb) => {
    const game = games[code];
    if (!game) return cb && cb({ error: 'Game not found' });
    const player = game.players.find(p => p.id === socket.id);
    if (!player) return cb && cb({ error: 'Player not found' });
    // Simple scoring: +10 per answer
    player.score = (player.score || 0) + 10;
    io.to(code).emit('leaderboard_update', { leaderboard: game.players.map(p => ({ name: p.name, score: p.score })) });
    cb && cb({ ok: true });
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
    // Remove player from any games
    for (const code of Object.keys(games)) {
      const g = games[code];
      const idx = g.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        g.players.splice(idx, 1);
        io.to(code).emit('lobby_update', { players: g.players.map(p => ({ id: p.id, name: p.name })) });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server listening on', PORT));
