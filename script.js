// === Fleetfire: Divide & Conquer ===
// SCRIPT.JS — Game Engine

// === GLOBAL STATE ===
let player1Name = '';
let player2Name = '';
let teamKey = '';
let currentTurn = 'p1';
let activeMission = '';
let isGameActive = false;
let aiBehavior = 'balanced';
let gridSize = 10;
let teamStats = {};
let powerUpUsed = { sonar: false, emp: false };
let placementMode = false;

const grids = {
  p1: [],
  p2: [],
  ai1: [],
  ai2: []
};

const gridRefs = {
  p1: document.getElementById('grid-p1'),
  p2: document.getElementById('grid-p2'),
  ai1: document.getElementById('grid-ai1'),
  ai2: document.getElementById('grid-ai2')
};

// === DOM ELEMENTS ===
const campaignScreen = document.getElementById('campaign-screen');
const userSetup = document.getElementById('user-setup');
const gameUI = document.getElementById('game-ui');
const missionTitle = document.getElementById('mission-title');
const log = document.getElementById('battle-log');
const toast = document.getElementById('achievement-toast');

// === MISSION DATA ===
const missions = {
  harbor: { title: 'Operation: Iron Harbor', aiShips: 5, difficulty: 1 },
  abyss:  { title: 'Operation: Sunken Abyss', aiShips: 7, difficulty: 2 },
  wrath:  { title: 'Operation: AI Wrath', aiShips: 9, difficulty: 3 }
};

// === CAMPAIGN SELECT ===
document.querySelectorAll('.campaign-option').forEach(btn => {
  btn.addEventListener('click', () => {
    activeMission = btn.dataset.mission;
    missionTitle.textContent = missions[activeMission].title;
    campaignScreen.style.display = 'none';
    userSetup.style.display = 'block';
  });
});
// === PLAYER SETUP ===
document.getElementById('confirm-names').addEventListener('click', () => {
  player1Name = document.getElementById('player1-name').value.trim();
  player2Name = document.getElementById('player2-name').value.trim();
  aiBehavior = document.getElementById('ai-personality').value;
  if (!player1Name || !player2Name) return alert('Both players must enter names.');

  teamKey = `${player1Name}_${player2Name}_${activeMission}`;
  document.getElementById('name-p1').textContent = player1Name;
  document.getElementById('name-p2').textContent = player2Name;

  userSetup.style.display = 'none';
  gameUI.style.display = 'block';
  loadStats();
  generateAllGrids();
});

// === THEME TOGGLE ===
document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
});

// === GRID GENERATION ===
function generateAllGrids() {
  const size = parseInt(document.getElementById('grid-size').value);
  gridSize = size;

  ['p1', 'p2', 'ai1', 'ai2'].forEach(id => {
    const grid = [];
    const container = gridRefs[id];
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    for (let r = 0; r < size; r++) {
      grid[r] = [];
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell border';
        cell.dataset.row = r;
        cell.dataset.col = c;
        grid[r][c] = { element: cell, status: 'empty' };
        container.appendChild(cell);
      }
    }
    grids[id] = grid;
  });
}

// === RANDOM SHIP PLACEMENT ===
document.getElementById('randomize-ships').addEventListener('click', () => {
  ['p1', 'p2', 'ai1', 'ai2'].forEach(id => randomizeShips(id, 5));
  logMessage('Fleet randomized and deployed.');
});

// === MANUAL PLACEMENT MODE ===
document.getElementById('place-manually').addEventListener('click', () => {
  placementMode = true;
  clearGridShips('p1');
  initManualPlacement('p1');
  logMessage('Manual ship placement mode activated for Player 1.');
});

function clearGridShips(id) {
  const grid = grids[id];
  for (let row of grid) {
    for (let cell of row) {
      cell.status = 'empty';
      cell.element.classList.remove('ship', 'placing');
      cell.element.innerHTML = '';
    }
  }
}

// === POWER-UP BUTTONS ===
document.getElementById('use-sonar').addEventListener('click', () => {
  if (powerUpUsed.sonar) return alert('Sonar already used!');
  powerUpUsed.sonar = true;
  useSonarScan('ai1'); // Scan left AI grid
});

document.getElementById('use-emp').addEventListener('click', () => {
  if (powerUpUsed.emp) return alert('EMP already used!');
  powerUpUsed.emp = true;
  stunAI(); // EMP disables next AI turn
});
// === SHIP RANDOMIZATION FUNCTION ===
function randomizeShips(id, count) {
  const grid = grids[id];
  let placed = 0;
  while (placed < count) {
    const r = Math.floor(Math.random() * gridSize);
    const c = Math.floor(Math.random() * gridSize);
    if (grid[r][c].status === 'empty') {
      grid[r][c].status = 'ship';
      grid[r][c].element.classList.add('ship');
      grid[r][c].element.innerHTML = '<i class="fas fa-ship ship-icon"></i>';
      placed++;
    }
  }
}

// === START GAME ===
document.getElementById('start-game').addEventListener('click', () => {
  isGameActive = true;
  logMessage(`🟢 Mission Started: ${missions[activeMission].title}`);
});

// === TURN LOGIC ===
function swapTurn() {
  if (currentTurn === 'p1') {
    currentTurn = 'p2';
  } else if (currentTurn === 'p2') {
    currentTurn = 'ai1';
    setTimeout(() => aiFire('ai1', 'p1'), 500);
    setTimeout(() => aiFire('ai2', 'p2'), 1200);
    currentTurn = 'p1';
  }
}

// === PLAYER CLICK ATTACK ===
['ai1', 'ai2'].forEach(aiId => {
  gridRefs[aiId].addEventListener('click', e => {
    if (!isGameActive || !e.target.classList.contains('cell')) return;
    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);
    processFire(aiId, r, c);
    swapTurn();
  });
});

function processFire(targetId, r, c) {
  const cell = grids[targetId][r][c];
  if (cell.status === 'hit' || cell.status === 'miss') return;

  if (cell.status === 'ship') {
    cell.status = 'hit';
    animateHit(cell.element);
    logMessage(`🎯 Hit confirmed at (${r+1}, ${c+1})`);
    cell.element.innerHTML = '<i class="fas fa-burst hit-icon"></i>';
    cell.element.classList.add('revealed');
    showAchievement('Direct Hit!');
    checkWin();
  } else {
    cell.status = 'miss';
    animateMiss(cell.element);
    logMessage(`Missed at (${r+1}, ${c+1})`);
    cell.element.innerHTML = '<i class="fas fa-water miss-icon"></i>';
    cell.element.classList.add('revealed');
  }
}

// === AI FIRE ===
function aiFire(aiId, playerId) {
  if (!isGameActive) return;
  const grid = grids[playerId];
  const attempts = [];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell.status !== 'hit' && cell.status !== 'miss') {
        attempts.push({ r, c });
      }
    }
  }

  // Behavior Strategy
  const move = (aiBehavior === 'aggressive') ? _.shuffle(attempts)[0]
            : (aiBehavior === 'evasive')   ? attempts[attempts.length - 1]
            : (aiBehavior === 'calculated') ? attempts.find(p => p.r === p.c) || attempts[0]
            : attempts[Math.floor(Math.random() * attempts.length)];

  const cell = grid[move.r][move.c];

  if (cell.status === 'ship') {
    cell.status = 'hit';
    cell.element.classList.add('hit');
    cell.element.innerHTML = '<i class="fas fa-burst hit-icon"></i>';
    logMessage(`${aiId.toUpperCase()} hit a player ship at (${move.r+1}, ${move.c+1})`);
    showAchievement('Brace for impact!');
  } else {
    cell.status = 'miss';
    cell.element.classList.add('miss');
    cell.element.innerHTML = '<i class="fas fa-water miss-icon"></i>';
    logMessage(`${aiId.toUpperCase()} missed at (${move.r+1}, ${move.c+1})`);
  }
}

// === POWER-UP: SONAR ===
function useSonarScan(targetId) {
  const grid = grids[targetId];
  const centerR = Math.floor(gridSize / 2);
  const centerC = Math.floor(gridSize / 2);

  for (let r = centerR - 1; r <= centerR + 1; r++) {
    for (let c = centerC - 1; c <= centerC + 1; c++) {
      if (grid[r] && grid[r][c]) {
        grid[r][c].element.classList.add('sonar-ping', 'revealed');
      }
    }
  }
  logMessage('🔍 Sonar activated — central sector revealed!');
}

// === POWER-UP: EMP ===
function stunAI() {
  // Simplified: skip AI turn for 1 round
  logMessage('⚡ EMP deployed — AI turn disrupted.');
  currentTurn = 'p1'; // skips AI
}

// === ANIMATIONS ===
function animateHit(cell) {
  anime({
    targets: cell,
    backgroundColor: '#ff3e3e',
    scale: [1, 1.3, 1],
    duration: 300
  });
}

function animateMiss(cell) {
  anime({
    targets: cell,
    backgroundColor: '#6c757d',
    scale: [1, 1.1, 1],
    duration: 300
  });
}

// === LOG + ACHIEVEMENTS ===
function logMessage(text) {
  const li = document.createElement('li');
  li.className = 'list-group-item';
  li.textContent = text;
  log.prepend(li);
}

function showAchievement(text) {
  toast.textContent = `★ ${text}`;
  toast.classList.remove('d-none');
  setTimeout(() => toast.classList.add('d-none'), 3000);
}

// === CHECK WIN ===
function checkWin() {
  const remainingAI = [...grids.ai1.flat(), ...grids.ai2.flat()].some(c => c.status === 'ship');
  if (!remainingAI) {
    isGameActive = false;
    document.getElementById('endgame-message').textContent = '🌊 Mission Complete. Enemy fleets destroyed.';
    new bootstrap.Modal(document.getElementById('endgameModal')).show();
    saveStat('wins');
  }
}

// === REPLAY ===
document.getElementById('replay-button').addEventListener('click', () => location.reload());

// === LOCAL STORAGE STATS ===
function loadStats() {
  const raw = localStorage.getItem('fleetfireStats');
  if (raw) teamStats = JSON.parse(raw);
  if (!teamStats[teamKey]) teamStats[teamKey] = { wins: 0, losses: 0 };
  updateChart();
}

function saveStat(result) {
  if (!teamStats[teamKey]) return;
  teamStats[teamKey][result]++;
  localStorage.setItem('fleetfireStats', JSON.stringify(teamStats));
  updateChart();
}

// === CHART.JS ===
function updateChart() {
  const ctx = document.getElementById('team-stats-chart').getContext('2d');
  if (window.fleetChart) window.fleetChart.destroy();
  window.fleetChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Wins', 'Losses'],
      datasets: [{
        label: `${player1Name} & ${player2Name}`,
        data: [
          teamStats[teamKey].wins || 0,
          teamStats[teamKey].losses || 0
        ],
        backgroundColor: ['#198754', '#dc3545']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Campaign Performance' }
      }
    }
  });
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('Service worker ready:', reg.scope))
      .catch(err => console.error('SW error:', err));
  });
}
