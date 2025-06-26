// === BATTLESHIP: Divide & Conquer ===
// Entire Contents of script.js

// === GLOBAL STATE ===
let player1Name = '';
let player2Name = '';
let currentTurn = 'p1';
let teamStats = {};
let teamKey = '';
let gridSize = 10;
let isGameActive = false;
let adaptiveAI = false;

const grids = {
  p1: [],
  p2: [],
  ai1: [],
  ai2: []
};

// === DOM ELEMENTS ===
const setupPanel = document.getElementById('user-setup');
const gameUI = document.getElementById('game-ui');
const nameP1 = document.getElementById('name-p1');
const nameP2 = document.getElementById('name-p2');
const startBtn = document.getElementById('start-game');
const resetBtn = document.getElementById('reset-game');
const replayBtn = document.getElementById('replay-button');
const log = document.getElementById('battle-log');
const achievementToast = document.getElementById('achievement-toast');
const statsChart = document.getElementById('team-stats-chart');

// === SETUP ENTRY ===
document.getElementById('enter-game').addEventListener('click', () => {
  player1Name = document.getElementById('player1-name').value.trim();
  player2Name = document.getElementById('player2-name').value.trim();
  if (!player1Name || !player2Name) return alert('Both players must enter names.');

  teamKey = `${player1Name}_${player2Name}`;
  document.getElementById('name-p1').textContent = player1Name;
  document.getElementById('name-p2').textContent = player2Name;
  setupPanel.style.display = 'none';
  gameUI.style.display = 'block';
  loadStats();
  generateAllGrids();
});

// === THEME TOGGLE ===
document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
});

// === FULLSCREEN SHORTCUT ===
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'f') {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
});

// === GAME LOGIC ===
startBtn.addEventListener('click', () => {
  adaptiveAI = document.getElementById('adaptive-ai').checked;
  gridSize = parseInt(document.getElementById('grid-size').value);
  isGameActive = true;
  logMessage('Mission started. Team up and engage!');
});

resetBtn.addEventListener('click', () => {
  location.reload();
});

replayBtn.addEventListener('click', () => {
  location.reload();
});

// === GRID GENERATION ===
function generateAllGrids() {
  ['p1', 'p2', 'ai1', 'ai2'].forEach(id => {
    const grid = [];
    const container = document.getElementById(`grid-${id}`);
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    for (let r = 0; r < gridSize; r++) {
      grid[r] = [];
      for (let c = 0; c < gridSize; c++) {
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

// === FAKE RANDOMIZED SHIP PLACEMENT ===
document.getElementById('randomize-ships').addEventListener('click', () => {
  Object.keys(grids).forEach(id => randomizeShips(id));
  logMessage('Fleet formation randomized.');
});

function randomizeShips(id) {
  const shipCount = 5;
  for (let i = 0; i < shipCount; i++) {
    const r = Math.floor(Math.random() * gridSize);
    const c = Math.floor(Math.random() * gridSize);
    grids[id][r][c].status = 'ship';
  }
}

// === TURN SYSTEM & AI ===
function processTurn(targetGridId) {
  if (!isGameActive) return;
  const opponent = targetGridId;
  const r = Math.floor(Math.random() * gridSize);
  const c = Math.floor(Math.random() * gridSize);
  const target = grids[opponent][r][c];

  if (target.status === 'hit' || target.status === 'miss') {
    return; // Already attacked
  }

  if (target.status === 'ship') {
    target.status = 'hit';
    animateHit(target.element);
    logMessage(`${opponent.toUpperCase()} ship HIT at (${r + 1}, ${c + 1})`);
    showAchievement('Direct Hit!');
    checkWinCondition();
  } else {
    target.status = 'miss';
    animateMiss(target.element);
    logMessage(`Attack missed at (${r + 1}, ${c + 1})`);
  }

  swapTurn();
}

function swapTurn() {
  if (currentTurn === 'p1') {
    currentTurn = 'p2';
  } else if (currentTurn === 'p2') {
    currentTurn = 'ai1';
    setTimeout(() => processTurn('p1'), 500);
    setTimeout(() => processTurn('p2'), 1000);
    currentTurn = 'p1'; // Reset to Player 1 after AI
  }
}

// === UI FEEDBACK ===
function animateHit(cell) {
  anime({
    targets: cell,
    backgroundColor: '#ff3e3e',
    scale: [1, 1.3, 1],
    duration: 300
  });
  cell.classList.add('hit');
}

function animateMiss(cell) {
  anime({
    targets: cell,
    backgroundColor: '#6c757d',
    scale: [1, 1.1, 1],
    duration: 300
  });
  cell.classList.add('miss');
}

function logMessage(msg) {
  const li = document.createElement('li');
  li.className = 'list-group-item';
  li.textContent = msg;
  log.prepend(li);
}

function showAchievement(text) {
  achievementToast.textContent = `★ ${text}`;
  achievementToast.classList.remove('d-none');
  setTimeout(() => {
    achievementToast.classList.add('d-none');
  }, 3000);
}

// === STATS MANAGEMENT ===
function loadStats() {
  const raw = localStorage.getItem('battleshipTeamStats');
  if (raw) {
    teamStats = JSON.parse(raw);
  }
  if (!teamStats[teamKey]) {
    teamStats[teamKey] = { wins: 0, losses: 0 };
  }
  updateChart();
}

function saveStat(result) {
  if (!teamStats[teamKey]) return;
  teamStats[teamKey][result]++;
  localStorage.setItem('battleshipTeamStats', JSON.stringify(teamStats));
  updateChart();
}

// === ENDGAME ===
function checkWinCondition() {
  const allAI = [...grids.ai1.flat(), ...grids.ai2.flat()];
  const anyShipsLeft = allAI.some(cell => cell.status === 'ship');
  if (!anyShipsLeft) {
    isGameActive = false;
    document.getElementById('endgame-message').textContent = 'Mission Accomplished! You defeated the AI Armada.';
    new bootstrap.Modal(document.getElementById('endgameModal')).show();
    saveStat('wins');
    showAchievement('Flawless Victory');
  }
}

// === CHART DISPLAY ===
function updateChart() {
  const ctx = statsChart.getContext('2d');
  if (statsChart.chart) {
    statsChart.chart.destroy();
  }
  statsChart.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Wins', 'Losses'],
      datasets: [{
        label: `${player1Name} & ${player2Name}`,
        data: [
          teamStats[teamKey].wins,
          teamStats[teamKey].losses
        ],
        backgroundColor: ['#198754', '#dc3545']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Team Battle History'
        }
      }
    }
  });
}
