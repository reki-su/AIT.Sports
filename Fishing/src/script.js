let screen = "start";
let gauge = 50;
let points = 0; 
let isHolding = false;
let currentFish = null;
let fishBite = false;
let gameInterval = null;
let biteReactionTimer = null; 
let isPaused = false; 
let currentUser = "ゲスト";

// ポーズ直前のゲーム状態（aim / waiting）を安全に記憶する変数
let prePauseScreen = "aim"; 

let castTimeoutId = null;
let castStartTime = 0;
let castRemainingTime = 0;

const fishes = [
    { name: "小魚", img: "images/fish_small.png", speed: 1.2, points: 100 },
    { name: "中魚", img: "images/fish_medium.png", speed: 2.2, points: 500 },
    { name: "大物", img: "images/fish_big.png", speed: 4.0, points: 2000 }
];

const rankTable = [
    { min: 5000, rank: "S" },
    { min: 3500, rank: "A" },
    { min: 2000, rank: "B" },
    { min: 500,  rank: "C" },
    { min: 0,    rank: "D" }
];

const rodImg = document.getElementById('rod-display');
const reelingUI = document.getElementById('reeling-ui');
const pointsDisplay = document.getElementById('current-points');

const startScreen = document.getElementById('screen-start');
const howtoScreen = document.getElementById('screen-howto');
const pauseModal = document.getElementById('pauseModal');
const userModal = document.getElementById('userModal');
const hudPauseBox = document.getElementById('hudPauseBox');
const scorePanelEl = document.getElementById('scorePanelEl');

function updateState(newScreen, rodState = 'idle') {
    // 全てのレイヤーの非表示クラスを一括リセット
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.game-content-screen').forEach(l => l.classList.add('hidden'));
    startScreen.classList.add('hidden');
    howtoScreen.classList.add('hidden');
    
    screen = newScreen;

    if (newScreen === 'start') {
        startScreen.classList.remove('hidden');
        hudPauseBox.style.display = 'none';
        scorePanelEl.style.display = 'none';
        loadUserStatus();
        return;
    }
    if (newScreen === 'howto') {
        howtoScreen.classList.remove('hidden');
        hudPauseBox.style.display = 'none';
        scorePanelEl.style.display = 'none';
        return;
    }

    const target = document.getElementById(`screen-${newScreen}`);
    if (target) target.classList.remove('hidden');
    
    rodImg.src = `images/rod_${rodState}.png`;

    if (newScreen === 'reeling') {
        reelingUI.classList.remove('hidden');
        hudPauseBox.style.display = 'none'; 
        scorePanelEl.style.display = 'block';
    } else if (newScreen === 'aim' || newScreen === 'waiting') {
        reelingUI.classList.add('hidden');
        hudPauseBox.style.display = 'block'; 
        scorePanelEl.style.display = 'block';
    } else {
        reelingUI.classList.add('hidden');
        hudPauseBox.style.display = 'none';
        scorePanelEl.style.display = 'block';
    }
}

function resetToAim() {
    fishBite = false;
    gauge = 50;
    if (biteReactionTimer) clearTimeout(biteReactionTimer);
    if (castTimeoutId) clearTimeout(castTimeoutId);
    document.getElementById('bite-icon').classList.add('hidden');
    updateState('aim', 'idle');
}

// ===== ユーザー管理ロジック =====
function loadUserStatus() {
    let localData = localStorage.getItem("wii_sports_theme_data");
    if (localData) {
        const data = JSON.parse(localData);
        if (data.currentUser) currentUser = data.currentUser;
    }
    document.getElementById('wiiUserStatus').textContent = "選択中: " + currentUser;
}

function openUserModal() {
    let localData = localStorage.getItem("wii_sports_theme_data");
    let data = localData ? JSON.parse(localData) : { currentUser: "ゲスト", users: { "ゲスト": { fishing_score: 0, fishing_rank: "D" } } };
    
    const listContainer = document.getElementById('modalUserList');
    listContainer.innerHTML = "";
    
    Object.keys(data.users).forEach(user => {
        const btn = document.createElement('button');
        btn.className = "user-item-btn" + (user === currentUser ? " active" : "");
        const fScore = data.users[user].fishing_score || 0;
        const fRank = data.users[user].fishing_rank || 'D';
        btn.textContent = `👤 ${user} (Best: ${fScore}点 / Rank ${fRank})`;
        btn.onclick = function() { selectUser(user); };
        listContainer.appendChild(btn);
    });
    userModal.classList.add('show');
}

function closeUserModal() {
    userModal.classList.remove('show');
    document.getElementById('newUserNameInput').value = "";
}

function selectUser(name) {
    let localData = localStorage.getItem("wii_sports_theme_data");
    let data = JSON.parse(localData);
    data.currentUser = name;
    localStorage.setItem("wii_sports_theme_data", JSON.stringify(data));
    currentUser = name;
    loadUserStatus();
    closeUserModal();
}

function addAndSelectNewUser() {
    const input = document.getElementById('newUserNameInput');
    let name = input.value.trim();
    if (name === "") return;
    
    let localData = localStorage.getItem("wii_sports_theme_data");
    let data = localData ? JSON.parse(localData) : { currentUser: "ゲスト", users: {} };
    
    if (data.users[name]) {
        alert("その名前はすでに登録されています。");
        return;
    }
    
    data.users[name] = data.users[name] || {};
    data.users[name].fishing_score = 0;
    data.users[name].fishing_rank = "D";
    data.currentUser = name;
    localStorage.setItem("wii_sports_theme_data", JSON.stringify(data));
    
    currentUser = name;
    loadUserStatus();
    closeUserModal();
}

function saveGameResult(finalScore, finalRank) {
    let localData = localStorage.getItem("wii_sports_theme_data");
    let data = localData ? JSON.parse(localData) : { currentUser: "ゲスト", users: {} };

    if (!data.users[currentUser]) {
        data.users[currentUser] = {};
    }
    const currentBest = data.users[currentUser].fishing_score || 0;
    if (finalScore > currentBest) {
        data.users[currentUser].fishing_score = finalScore;
        data.users[currentUser].fishing_rank = finalRank;
        localStorage.setItem("wii_sports_theme_data", JSON.stringify(data));
    }
}

// ===== 一時停止（ポーズ）システムロジック =====
function pauseGame() {
    if (screen !== "aim" && screen !== "waiting") return;
    
    prePauseScreen = screen; // ポーズ時点のゲームプレイ画面を完全に記憶
    isPaused = true;
    pauseModal.classList.add('show');

    if (screen === "waiting") {
        if (fishBite) {
            if (biteReactionTimer) clearTimeout(biteReactionTimer);
            fishBite = false;
            document.getElementById('bite-icon').classList.add('hidden');
            finishGame("fail");
            pauseModal.classList.remove('show');
        } else {
            if (castTimeoutId) {
                clearTimeout(castTimeoutId);
                let elapsed = Date.now() - castStartTime;
                castRemainingTime = Math.max(100, castRemainingTime - elapsed);
            }
        }
    }
}

function resumeGame() {
    isPaused = false;
    pauseModal.classList.remove('show');

    // 記憶しておいたポーズ前の画面（aim / waiting）と釣竿の状態を完全に復元して再駆動
    const restoredRod = (prePauseScreen === "waiting") ? "cast" : "idle";
    updateState(prePauseScreen, restoredRod);

    if (screen === "waiting" && !fishBite) {
        castStartTime = Date.now();
        castTimeoutId = setTimeout(triggerBite, castRemainingTime);
    }
}

function restartGameFromPause() {
    isPaused = false;
    pauseModal.classList.remove('show');
    points = 0;
    pointsDisplay.innerText = points;
    resetToAim();
}

function showInstrFromPause() {
    pauseModal.classList.remove('show');
    hudPauseBox.style.display = 'none';
    scorePanelEl.style.display = 'none';
    
    const mainAction = document.getElementById('instrStartBtn');
    const backAction = document.getElementById('instrBackBtn');
    
    mainAction.textContent = "ゲームに戻る";
    mainAction.onclick = function() {
        howtoScreen.classList.add('hidden');
        resumeGame(); // 復旧処理を通して完全に再同期させて戻る
    };
    
    backAction.onclick = function() {
        howtoScreen.classList.add('hidden');
        pauseModal.classList.add('show');
    };
    
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.game-content-screen').forEach(l => l.classList.add('hidden'));
    howtoScreen.classList.remove('hidden');
}

function exitToHome() {
    isPaused = false;
    pauseModal.classList.remove('show');
    window.location.href = '../../Home/home.html';
}

function quitGame() {
    window.location.href = '../../Home/home.html';
}

// ===== 各種イベントリスナー =====
document.getElementById('start-btn').addEventListener('click', () => {
    points = 0;
    pointsDisplay.innerText = points;
    updateState('aim', 'idle');
});
document.getElementById('instr-btn').addEventListener('click', () => {
    const mainAction = document.getElementById('instrStartBtn');
    const backAction = document.getElementById('instrBackBtn');
    mainAction.textContent = "スタート";
    mainAction.onclick = () => { points = 0; pointsDisplay.innerText = points; updateState('aim', 'idle'); };
    backAction.onclick = () => updateState('start');
    updateState('howto');
});

document.getElementById('next-btn').addEventListener('click', resetToAim);
document.getElementById('retry-btn').addEventListener('click', resetToAim);

document.getElementById('quit-btn-start').addEventListener('click', quitGame);
document.getElementById('quit-btn-success').addEventListener('click', quitGame);
document.getElementById('quit-btn-fail').addEventListener('click', quitGame);

document.getElementById('modal-trigger-btn').addEventListener('click', openUserModal);
document.getElementById('closeUserModalBtn').addEventListener('click', closeUserModal);
document.getElementById('addUserBtn').addEventListener('click', addAndSelectNewUser);

document.getElementById('pauseTriggerBtn').addEventListener('click', pauseGame);
document.getElementById('resumeGameBtn').addEventListener('click', resumeGame);
document.getElementById('restartGameBtn').addEventListener('click', restartGameFromPause);
document.getElementById('showInstrBtn').addEventListener('click', showInstrFromPause);
document.getElementById('exitToHomeBtn').addEventListener('click', exitToHome);

window.addEventListener('keydown', (e) => {
    if (isPaused) return;
    if (screen === "aim" && e.code === "Space") {
        updateState('waiting', 'cast');
        currentFish = fishes[Math.floor(Math.random() * fishes.length)];
        
        castRemainingTime = 2000 + Math.random() * 2000;
        castStartTime = Date.now();
        castTimeoutId = setTimeout(triggerBite, castRemainingTime);
    }
});

function triggerBite() {
    if (screen !== "waiting" || isPaused) return;
    fishBite = true;
    document.getElementById('bite-icon').classList.remove('hidden');

    biteReactionTimer = setTimeout(() => {
        if (fishBite && screen === "waiting") {
            fishBite = false;
            document.getElementById('bite-icon').classList.add('hidden');
            finishGame("fail");
        }
    }, 1000);
}

const gameScreen = document.getElementById('game-screen');
gameScreen.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || isPaused) return;
    if (e.target.id === "pauseTriggerBtn") return;

    if (fishBite && screen === "waiting") {
        if (biteReactionTimer) clearTimeout(biteReactionTimer);
        fishBite = false;
        document.getElementById('bite-icon').classList.add('hidden');
        startReeling();
    }
    if (screen === "reeling") {
        isHolding = true;
        rodImg.src = "images/rod_reel.png";
    }
});

window.addEventListener('mouseup', () => {
    if (screen === "reeling") {
        isHolding = false;
        rodImg.src = "images/rod_stop.png";
    }
});

function startReeling() {
    updateState('reeling', 'reel');
    gauge = 50;
    gameInterval = setInterval(() => {
        if (screen !== "reeling" || isPaused) {
            clearInterval(gameInterval);
            return;
        }
        gauge += isHolding ? 2.5 : -currentFish.speed;
        document.getElementById('gauge-bar').style.width = `${Math.max(0, Math.min(100, gauge))}%`;

        if (gauge >= 100) finishGame("success");
        else if (gauge <= 0) finishGame("fail");
    }, 100);
}

function finishGame(result) {
    if (gameInterval) clearInterval(gameInterval);
    updateState(result, 'idle');
    if (result === "success") {
        points += currentFish.points; 
        pointsDisplay.innerText = points; 
        document.getElementById('result-text').innerText = `${currentFish.name}を釣った！`;
        document.getElementById('fish-img').src = currentFish.img;
    }
    
    const matched = rankTable.find(r => points >= r.min);
    const finalRank = matched ? matched.rank : "D";
    saveGameResult(points, finalRank);
}

updateState('start');