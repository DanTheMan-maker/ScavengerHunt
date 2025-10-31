const socket = io();

const btnCreate = document.getElementById('btnCreate');
const createResult = document.getElementById('createResult');
const btnJoin = document.getElementById('btnJoin');
const joinCodeInput = document.getElementById('joinCode');
const playerNameInput = document.getElementById('playerName');
const lobbyDiv = document.getElementById('lobby');
const gameArea = document.getElementById('gameArea');
const btnStart = document.getElementById('btnStart');
const checkpointsDiv = document.getElementById('checkpoints');
const leaderboardDiv = document.getElementById('leaderboard');

let currentCode = null;
let amHost = false;

btnCreate.onclick = async () => {
  const res = await fetch('/api/game/create', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) });
  const json = await res.json();
  createResult.innerText = `Code: ${json.code} — Join URL: ${json.joinUrl}`;
  joinCodeInput.value = json.code;
};

btnJoin.onclick = () => {
  const code = (joinCodeInput.value || '').trim();
  const name = (playerNameInput.value || 'Player').trim();
  if (!code) return alert('Enter code');
  socket.emit('join_game', { code, name }, (resp) => {
    if (resp && resp.error) return alert(resp.error);
    currentCode = code;
    gameArea.style.display = 'block';
  });
};

socket.on('lobby_update', ({ players }) => {
  lobbyDiv.innerHTML = '<strong>Lobby</strong><br>' + players.map(p => p.name || p.id).join('<br>');
  // show start button for host (first player)
  // approximation: if my socket id matches first player (not perfect)
  // ask server for host status in production
  // For demo, just show Start if there is at least 1 player
  if (players.length > 0) {
    btnStart.style.display = 'inline-block';
  }
});

btnStart.onclick = () => {
  if (!currentCode) return;
  socket.emit('start_game', { code: currentCode }, (resp) => {
    if (resp && resp.error) return alert(resp.error);
    btnStart.style.display = 'none';
  });
};

socket.on('game_started', ({ checkpoints }) => {
  checkpointsDiv.innerHTML = '<strong>Checkpoints</strong><br>' + checkpoints.map(c => c.id + ': ' + c.question).join('<br>');
});

socket.on('leaderboard_update', ({ leaderboard }) => {
  leaderboardDiv.innerHTML = '<strong>Leaderboard</strong><br>' + leaderboard.map(l => `${l.name}: ${l.score}`).join('<br>');
});

