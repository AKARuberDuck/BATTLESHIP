// ===============================
// 🚀 GAME SETUP & GLOBAL STATE
// ===============================
const gridSize = 10;
const shipTypes = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 }
];

let playerGrid = [];
let aiGrid = [];
let playerShips = [];
let aiShips = [];
let playerTurn = true;
let gameStarted = false;
let placingShips = true;
let selectedShip = 0;
let shipDirection = 'horizontal';
let currentUser = null;
let hitStreak = [];

const userDB = JSON.parse(localStorage.getItem('fleetfireUsers')) || {};
// ===============================
// 🧱 CREATE GRIDS & LINK CELLS
// ===============================
function createGrid(id, handler) {
  const grid = [];
  const container = document.getElementById(id);
  container.innerHTML = '';

  for (let r = 0; r < gridSize; r++) {
    const row = [];
    for (let c = 0; c < gridSize; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      if (handler) cell.addEventListener('click', () => handler(r, c));
      if (id === 'ai-grid') {
        cell.addEventListener('mouseenter', () => cell.classList.add('hover'));
        cell.addEventListener('mouseleave', () => cell.classList.remove('hover'));
      }
      container.appendChild(cell);
      row.push({ row: r, col: c, element: cell, status: 'empty' });
    }
    grid.push(row);
  }
  return grid;
}
// ===============================
// 🔐 USER REGISTRATION & LOGIN
// ===============================
document.getElementById('register').onclick = () => {
  const u = username.value.trim();
  const p = password.value;
  if (!u || !p) return alert('Enter username and password');
  if (userDB[u]) return alert('Username already exists');
  userDB[u] = {
    password: p,
    stats: { games: 0, wins: 0, losses: 0, shots: 0, hits: 0 }
  };
  localStorage.setItem('fleetfireUsers', JSON.stringify(userDB));
  alert('Account created. You may now log in.');
};

document.getElementById('login').onclick = () => {
  const u = username.value.trim();
  const p = password.value;
  if (!u || !p) return alert('Enter username and password');
  if (!userDB[u] || userDB[u].password !== p) return alert('Invalid credentials');
  currentUser = u;
  document.getElementById('login-form').classList.add('d-none');
  document.getElementById('battle-area').classList.remove('d-none');
  initGame();
};
// ===============================
// 🚢 PLAYER SHIP PLACEMENT
// ===============================
function placePlayerShip(r, c) {
  if (!placingShips || selectedShip >= shipTypes.length) return;
  const ship = shipTypes[selectedShip];
  if (!canPlace(playerGrid, r, c, ship.size, shipDirection)) return;

  const coords = [];
  for (let i = 0; i < ship.size; i++) {
    const rr = shipDirection === 'horizontal' ? r : r + i;
    const cc = shipDirection === 'horizontal' ? c + i : c;
    playerGrid[rr][cc].status = 'ship';
    playerGrid[rr][cc].element.classList.add('placed');
    coords.push([rr, cc]);
  }

  playerShips.push({ name: ship.name, size: ship.size, coords, hits: 0 });
  selectedShip++;

  if (selectedShip === shipTypes.length) {
    placingShips = false;
    document.getElementById('start-game').classList.remove('d-none');
    logMessage('✅ All ships placed. Ready to engage.');
  }
}

function canPlace(grid, r, c, size, dir) {
  for (let i = 0; i < size; i++) {
    const rr = dir === 'horizontal' ? r : r + i;
    const cc = dir === 'horizontal' ? c + i : c;
    if (rr >= gridSize || cc >= gridSize || grid[rr][cc].status !== 'empty') return false;
  }
  return true;
}

document.addEventListener('keydown', e => {
  if (e.key && e.key.toLowerCase() === 'r' && placingShips) {
    shipDirection = shipDirection === 'horizontal' ? 'vertical' : 'horizontal';
  }
});
// ===============================
// 🎲 AI SHIP PLACEMENT
// ===============================
function placeAIShips() {
  aiShips = [];
  for (const ship of shipTypes) {
    let placed = false;
    while (!placed) {
      const dir = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      const r = Math.floor(Math.random() * gridSize);
      const c = Math.floor(Math.random() * gridSize);
      if (!canPlace(aiGrid, r, c, ship.size, dir)) continue;

      const coords = [];
      for (let i = 0; i < ship.size; i++) {
        const rr = dir === 'horizontal' ? r : r + i;
        const cc = dir === 'horizontal' ? c + i : c;
        aiGrid[rr][cc].status = 'ship';
        coords.push([rr, cc]);
      }
      aiShips.push({ name: ship.name, size: ship.size, coords, hits: 0 });
      placed = true;
    }
  }
}
// ===============================
// 🔫 PLAYER ATTACK TURN (SALVO MODE)
// ===============================
function fireAt(r, c) {
  if (!gameStarted || !playerTurn) return;
  const cell = aiGrid[r][c];
  if (cell.status === 'hit' || cell.status === 'miss') return;

  const allowedShots = playerShips.filter(s => s.hits < s.size).length;
  const shotsFired = aiGrid.flat().filter(c => c.status === 'hit' || c.status === 'miss').length
                    - stats().hits - stats().missesThisRound;

  if (shotsFired >= allowedShots) {
    return logMessage('⚠️ No more shots this round.');
  }

  stats().shots++;
  stats().missesThisRound = stats().missesThisRound || 0;

  if (cell.status === 'ship') {
    cell.status = 'hit';
    cell.element.classList.add('hit');
    stats().hits++;
    logShot(`🎯 Hit at ${String.fromCharCode(65 + r)}${c + 1}`);
    checkShipSunk(aiShips, r, c, false);
    checkWin();
  } else {
    cell.status = 'miss';
    cell.element.classList.add('miss');
    stats().missesThisRound++;
    logShot(`💨 Miss at ${String.fromCharCode(65 + r)}${c + 1}`);
  }

  // If all shots used, pass turn
  const newTotal = aiGrid.flat().filter(c => c.status === 'hit' || c.status === 'miss').length
                   - stats().hits - stats().missesThisRound;
  if (newTotal >= allowedShots - 1) {
    playerTurn = false;
    stats().missesThisRound = 0;
    setTimeout(aiTurn, 1000);
  }
}
// ===============================
// 🧠 AI TURN WITH HUNT-ON-HIT LOGIC
// ===============================
function aiTurn() {
  const salvo = aiShips.filter(s => s.hits < s.size).length;
  let shots = 0;

  while (shots < salvo) {
    let target = null;
    if (hitStreak.length) {
      const [r, c] = hitStreak[0];
      const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
      for (let [dr, dc] of dirs) {
        const tr = r + dr;
        const tc = c + dc;
        if (isValid(tr, tc) && !['hit','miss'].includes(playerGrid[tr][tc].status)) {
          target = [tr, tc];
          break;
        }
      }
    }

    if (!target) {
      do {
        target = [Math.floor(Math.random() * gridSize), Math.floor(Math.random() * gridSize)];
      } while (['hit','miss'].includes(playerGrid[target[0]][target[1]].status));
    }

    const [r, c] = target;
    const cell = playerGrid[r][c];

    if (cell.status === 'ship') {
      cell.status = 'hit';
      cell.element.classList.add('hit');
      hitStreak.unshift([r, c]);
      logShot(`💥 AI hit at ${String.fromCharCode(65 + r)}${c + 1}`);
      checkShipSunk(playerShips, r, c, true);
      checkLoss();
    } else {
      cell.status = 'miss';
      cell.element.classList.add('miss');
      logShot(`🧨 AI miss at ${String.fromCharCode(65 + r)}${c + 1}`);
    }

    shots++;
  }

  playerTurn = true;
  document.getElementById('turn-info').textContent = '🫵 Your Turn';
}
// ===============================
// 🚨 SHIP SINKING + REVEAL
// ===============================
function checkShipSunk(ships, r, c, isPlayer) {
  for (const ship of ships) {
    if (ship.coords.some(pos => pos[0] === r && pos[1] === c)) {
      ship.hits++;
      if (ship.hits === ship.size) {
        revealShip(ship, isPlayer);
        logMessage(`${isPlayer ? '🛑 You lost your' : '💀 You sank their'} ${ship.name}!`);
        if (!isPlayer && currentUser) checkMedals(ship);
        if (isPlayer) hitStreak = []; // AI resets memory
      }
    }
  }
}

function revealShip(ship, isPlayer) {
  const grid = isPlayer ? playerGrid : aiGrid;
  for (const [r, c] of ship.coords) {
    grid[r][c].element.classList.add('hit');
  }
}
// ===============================
// 🏁 VICTORY / DEFEAT
// ===============================
function checkWin() {
  if (aiShips.every(s => s.hits === s.size)) {
    logMessage('🎉 Victory! All enemy ships destroyed.');
    stats().wins++;
    stats().games++;
    saveStats();
    revealEnemyFleet();
    gameStarted = false;
    document.getElementById('turn-info').textContent = '🎊 You Win!';
  }
}

function checkLoss() {
  if (playerShips.every(s => s.hits === s.size)) {
    logMessage('💥 Defeat. Your fleet is lost.');
    stats().losses++;
    stats().games++;
    saveStats();
    gameStarted = false;
    document.getElementById('turn-info').textContent = '⚠️ You Lost!';
  }
}

function revealEnemyFleet() {
  for (const ship of aiShips) {
    revealShip(ship, false);
  }
}
// ===============================
// 📊 STATS & RANK MODAL
// ===============================
function stats() {
  return userDB[currentUser].stats;
}

function saveStats() {
  localStorage.setItem('fleetfireUsers', JSON.stringify(userDB));
}

function updateStatsModal() {
  const s = stats();
  const acc = s.shots ? Math.round((s.hits / s.shots) * 100) : 0;
  const rank = s.wins >= 15 ? 'Admiral'
             : s.wins >= 10 ? 'Commander'
             : s.wins >= 5 ? 'Lieutenant'
             : 'Cadet';
  statGames.textContent = s.games;
  statWins.textContent = s.wins;
  statLosses.textContent = s.losses;
  statAccuracy.textContent = `${acc}%`;
  statRank.textContent = rank;
}

function checkMedals(ship) {
  const s = stats();
  const acc = s.shots ? s.hits / s.shots : 0;
  if (ship.name === 'Carrier' && acc >= 0.8) {
    logMessage('🏅 Medal Earned: Sharp Shooter!');
  }
  if (playerShips.filter(s => s.hits < s.size).length === 1) {
    logMessage('🏅 Medal Earned: Comeback Commander!');
  }
}
// ===============================
// 🔁 GAME INIT & RESET
// ===============================
function initGame() {
  playerGrid = createGrid('player-grid', placePlayerShip);
  aiGrid = createGrid('ai-grid', fireAt);
  playerShips = [];
  aiShips = [];
  hitStreak = [];
  selectedShip = 0;
  placingShips = true;
  shipDirection = 'horizontal';
  stats().missesThisRound = 0;
  document.getElementById('start-game').classList.add('d-none');
  document.getElementById('turn-info').textContent = '⚙️ Place your ships';
  shotLog.innerHTML = '';
  updateStatsModal();

  document.getElementById('start-game').onclick = () => {
    placeAIShips();
    gameStarted = true;
    playerTurn = true;
    placingShips = false;
    document.getElementById('turn-info').textContent = '🫵 Your Turn';
    document.getElementById('start-game').classList.add('d-none');
  };
}

document.getElementById('reset-game').onclick = () => {
  initGame();
};
// ===============================
// 📜 BATTLE LOGGING
// ===============================
function logMessage(msg) {
  const item = document.createElement('li');
  item.className = 'list-group-item small';
  item.textContent = msg;
  shotLog.appendChild(item);
  shotLog.scrollTop = shotLog.scrollHeight;
}

function logShot(msg) {
  logMessage(msg);
}
