let screen = "start";
let gaugeA = 10;
let gaugeB = 50;
let maxRecordSize = 0.0;
let isHolding = false;
let currentFish = null;
let fishBite = false;
let gameInterval = null;
let biteReactionTimer = null;
let isPaused = false;
let currentUser = "ゲスト";
let prePauseScreen = "aim";
let castTimeoutId = null;
let castStartTime = 0;
let castRemainingTime = 0;

// テクニック評価用
let biteTimestamp = 0;
let isAngry = false;
let currentDropSpeed = 0;
let angerInterval = null;
let perfectBonus = false;
let boostTicksCount = 0;
let totalTicksCount = 0;

// 🐙 特殊ギミック用ステート変数
let isJumping = false;       // カジキの反転状態
let isBlinded = false;       // タコの墨状態
let abilityTimer = 0;        // 特殊行動のクールダウン/持続時間用カウンタ

// 🐟 魚データ（通常3種 ＋ 特殊2種 ＋ 伝説1種）
const fishes = [
    { name: "アジ", img: "images/fish_aji.png", riseSpeed: 2.0, dropSpeed: 1.5, minSize: 10.0, maxSize: 22.0, angryMin: 1, angryMax: 4, ability: "none" },
    { name: "タイ", img: "images/fish_tai.png", riseSpeed: 3.0, dropSpeed: 2.5, minSize: 35.0, maxSize: 55.0, angryMin: 4, angryMax: 7, ability: "none" },
    { name: "ブリ", img: "images/fish_buri.png", riseSpeed: 4.5, dropSpeed: 4.0, minSize: 80.0, maxSize: 125.0, angryMin: 5, angryMax: 10, ability: "none" },
    { name: "カジキ", img: "images/fish_kajiki.png", riseSpeed: 4.5, dropSpeed: 3.5, minSize: 100.0, maxSize: 150.0, angryMin: 4, angryMax: 8, ability: "jump" },
    { name: "タコ", img: "images/fish_tako.png", riseSpeed: 3.5, dropSpeed: 2.0, minSize: 40.0, maxSize: 75.0, angryMin: 3, angryMax: 6, ability: "blind" },
    { name: "リュウグウノツカイ", img: "images/fish_ryuu.png", riseSpeed: 6.0, dropSpeed: 5.5,minSize: 140.0, maxSize: 190.0, angryMin: 8, angryMax: 14, ability: "none" },
];

const rankTable = [
    { min: 140.0, rank: "S" },
    { min: 110.0, rank: "A" },
    { min: 70.0,  rank: "B" },
    { min: 30.0,  rank: "C" },
    { min: 0.0,   rank: "D" }
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
    gaugeA = 10;
    gaugeB = 50;
    isAngry = false;
    boostTicksCount = 0;
    totalTicksCount = 0;

    isJumping = false;
    isBlinded = false;
    abilityTimer = 0;
    const bBar = document.getElementById('gauge-b-bar');
    if(bBar) { bBar.style.background = "#f97316"; bBar.style.filter = "none"; }

    if (biteReactionTimer) clearTimeout(biteReactionTimer);
    if (castTimeoutId) clearTimeout(castTimeoutId);
    if (angerInterval) clearInterval(angerInterval);
    
    document.getElementById('bite-icon').classList.add('hidden');
    const warnMsg = document.getElementById('msg-warning');
    warnMsg.classList.remove('animate-warning');
    warnMsg.classList.add('hidden');
    warnMsg.innerText = "⚠️ 魚が暴れ出した！ ⚠️";
    document.getElementById('game-messages').classList.add('hidden');
    document.getElementById('best-update-msg').classList.add('hidden');
    
    updateState('aim', 'idle');
}

function showFloatingMessage(id) {
    document.getElementById('game-messages').classList.remove('hidden');
    const el = document.getElementById(id);
    el.classList.remove('hidden');
    el.classList.add('animate-msg');
    setTimeout(() => {
        el.classList.remove('animate-msg');
        el.classList.add('hidden');
        if(!isAngry && !isJumping) document.getElementById('game-messages').classList.add('hidden');
    }, 1500);
}

function loadUserStatus() {
    let localData = localStorage.getItem("wii_fishing_size_theme_data");
    if (localData) {
        const data = JSON.parse(localData);
        if (data.currentUser) currentUser = data.currentUser;
    }
    
    let data = localData ? JSON.parse(localData) : null;
    if (data && data.users && data.users[currentUser]) {
        maxRecordSize = data.users[currentUser].fishing_size || 0.0;
    } else {
        maxRecordSize = 0.0;
    }
    pointsDisplay.innerText = maxRecordSize.toFixed(1);
    document.getElementById('wiiUserStatus').textContent = "選択中: " + currentUser;
}

function openUserModal() {
    let localData = localStorage.getItem("wii_fishing_size_theme_data");
    let data = localData ? JSON.parse(localData) : { currentUser: "ゲスト", users: { "ゲスト": { fishing_size: 0.0, fishing_rank: "D" } } };
    
    const listContainer = document.getElementById('modalUserList');
    listContainer.innerHTML = "";
    
    Object.keys(data.users).forEach(user => {
        const btn = document.createElement('button');
        btn.className = "user-item-btn" + (user === currentUser ? " active" : "");
        const fSize = data.users[user].fishing_size || 0.0;
        const fRank = data.users[user].fishing_rank || 'D';
        btn.textContent = `👤 ${user} (Best: ${fSize.toFixed(1)}cm / Rank ${fRank})`;
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
    let localData = localStorage.getItem("wii_fishing_size_theme_data");
    let data = JSON.parse(localData);
    data.currentUser = name;
    localStorage.setItem("wii_fishing_size_theme_data", JSON.stringify(data));
    currentUser = name;
    loadUserStatus();
    closeUserModal();
}

function addAndSelectNewUser() {
    const input = document.getElementById('newUserNameInput');
    let name = input.value.trim();
    if (name === "") return;
    
    let localData = localStorage.getItem("wii_fishing_size_theme_data");
    let data = localData ? JSON.parse(localData) : { currentUser: "ゲスト", users: {} };
    
    if (data.users[name]) { alert("その名前はすでに登録されています。"); return; }
    
    data.users[name] = { fishing_size: 0.0, fishing_rank: "D" };
    data.currentUser = name;
    localStorage.setItem("wii_fishing_size_theme_data", JSON.stringify(data));
    
    currentUser = name;
    loadUserStatus();
    closeUserModal();
}

function saveGameResult(finalSize, finalRank) {
    let localData = localStorage.getItem("wii_fishing_size_theme_data");
    let data = localData ? JSON.parse(localData) : { currentUser: "ゲスト", users: {} };

    if (!data.users[currentUser]) data.users[currentUser] = {};
    const currentBest = data.users[currentUser].fishing_size || 0.0;
    
    if (finalSize > currentBest) {
        data.users[currentUser].fishing_size = finalSize;
        data.users[currentUser].fishing_rank = finalRank;
        localStorage.setItem("wii_fishing_size_theme_data", JSON.stringify(data));
        maxRecordSize = finalSize;
        pointsDisplay.innerText = maxRecordSize.toFixed(1);
        return true;
    }
    return false;
}

function pauseGame() {
    if (screen !== "aim" && screen !== "waiting") return;
    prePauseScreen = screen; 
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
        resumeGame(); 
    };
    backAction.onclick = function() {
        howtoScreen.classList.add('hidden');
        pauseModal.classList.add('show');
    };
    
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.game-content-screen').forEach(l => l.classList.add('hidden'));
    howtoScreen.classList.remove('hidden');
}

function exitToHome() { window.location.href = '../../Home/home.html'; }
function quitGame() { window.location.href = '../../Home/home.html'; }

window.addEventListener('keydown', (e) => {
    if (isPaused) return;
    if (screen === "aim" && e.code === "Space") {
        updateState('waiting', 'cast');
        
        if (Math.random() < 0.05) {
            currentFish = fishes.find(f => f.name === "リュウグウノツカイ");
        } else {
            const normalFishes = fishes.filter(f => f.name !== "リュウグウノツカイ");
            currentFish = normalFishes[Math.floor(Math.random() * normalFishes.length)];
        }

        castRemainingTime = 2000 + Math.random() * 2000;
        castStartTime = Date.now();
        castTimeoutId = setTimeout(triggerBite, castRemainingTime);
    }
});

function triggerBite() {
    if (screen !== "waiting" || isPaused) return;
    fishBite = true;
    biteTimestamp = Date.now(); 
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
        let reactionTime = Date.now() - biteTimestamp;
        perfectBonus = reactionTime <= 300; 
        document.getElementById('bite-icon').classList.add('hidden');
        startReeling(perfectBonus);
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

function startReeling(isPerfect) {
    updateState('reeling', 'reel');
    gaugeA = isPerfect ? 30 : 10; 
    gaugeB = 50;
    currentDropSpeed = currentFish.dropSpeed;
    isAngry = false;
    boostTicksCount = 0;
    totalTicksCount = 0;
    abilityTimer = 0; 
    
    if (isPerfect) showFloatingMessage('msg-perfect');

    const warnMsg = document.getElementById('msg-warning');

    gameInterval = setInterval(() => {
        if (screen !== "reeling" || isPaused) return;

        totalTicksCount++;
        abilityTimer++;

        if (currentFish.ability !== "none") {
            if (currentFish.ability === "jump") {
                if (abilityTimer % 100 === 50) { 
                    isJumping = true;
                    document.getElementById('game-messages').classList.remove('hidden');
                    warnMsg.innerText = "⚠️ カジキが跳ねた！操作反転！ ⚠️";
                    warnMsg.classList.remove('hidden');
                    warnMsg.classList.add('animate-warning');
                }
                if (isJumping && abilityTimer % 100 === 80) { 
                    isJumping = false;
                    warnMsg.classList.remove('animate-warning');
                    warnMsg.classList.add('hidden');
                    warnMsg.innerText = "⚠️ 魚が暴れ出した！ ⚠️";
                    if(!isAngry) document.getElementById('game-messages').classList.add('hidden');
                }
            }

            if (currentFish.ability === "blind") {
                const bBar = document.getElementById('gauge-b-bar');
                if (abilityTimer % 100 === 85) { // 周期を長くし、発動を遅らせる
                    isBlinded = true;
                    bBar.style.filter = "brightness(0%)"; 
                }
                if (isBlinded && abilityTimer % 100 === 0) { 
                    isBlinded = false;
                    bBar.style.filter = "none";
                }
            }
        }

        if (gaugeA > 75 && !isAngry) {
            isAngry = true;
            if(!isJumping) {
                document.getElementById('game-messages').classList.remove('hidden');
                if (currentFish.name === "リュウグウノツカイ") {
                    warnMsg.innerText = "⚠️ 伝説の暴走！耐えきれ！！ ⚠️";
                } else {
                    warnMsg.innerText = "⚠️ 魚が暴れ出した！ ⚠️";
                }
                warnMsg.classList.remove('hidden');
                warnMsg.classList.add('animate-warning');
            }

            angerInterval = setInterval(() => {
                if (screen !== "reeling" || isPaused) return;
                let randomFactor = 0.5 + Math.random(); 
                currentDropSpeed = currentFish.dropSpeed * randomFactor;
                
                let min = currentFish.angryMin;
                let max = currentFish.angryMax;
                let randomValue = Math.floor(Math.random() * (max - min + 1)) + min; 
                
                if (Math.random() < 0.5) gaugeB += randomValue;
                else gaugeB -= randomValue;
            }, 1000);
        }

        if (isJumping) {
            if (isHolding) gaugeB -= currentFish.dropSpeed * 1.5; 
            else gaugeB += currentFish.riseSpeed * 0.8;
        } else {
            if (isHolding) gaugeB += currentFish.riseSpeed; 
            else gaugeB -= currentDropSpeed; 
        }

        let isBoost = (gaugeB >= 80 && gaugeB <= 95);
        let bBar = document.getElementById('gauge-b-bar');
        
        if (!isBlinded) { 
            if (isBoost) {
                bBar.style.background = "#ef4444"; 
                bBar.style.boxShadow = "0 0 15px #ef4444";
                if (isHolding && !isJumping) boostTicksCount++; 
            } else {
                bBar.style.background = "#f97316";
                bBar.style.boxShadow = "none";
            }
        }

        if (gaugeB > 0 && gaugeB < 100) {
            if (isJumping) {
                if (!isHolding && isBoost) gaugeA += 4.4;
                else if (!isHolding) gaugeA += 2.2;
                else gaugeA -= 2.2;
            } else {
                if (isHolding) gaugeA += isBoost ? 4.4 : 2.2;  
                else gaugeA -= 2.2;
            }
        }

        document.getElementById('gauge-a-bar').style.height = `${Math.max(0, Math.min(100, gaugeA))}%`;
        if (!isBlinded) {
            document.getElementById('gauge-b-bar').style.height = `${Math.max(0, Math.min(100, gaugeB))}%`;
        }

        if (gaugeA >= 100) finishGame("success");
        else if (gaugeB >= 100 || gaugeB <= 0 || gaugeA <= 0) finishGame("fail");
    }, 100); 
}

function finishGame(result) {
    if (gameInterval) clearInterval(gameInterval);
    if (angerInterval) clearInterval(angerInterval);
    
    const warnMsg = document.getElementById('msg-warning');
    warnMsg.classList.remove('animate-warning');
    warnMsg.classList.add('hidden');
    warnMsg.innerText = "⚠️ 魚が暴れ出した！ ⚠️";
    document.getElementById('game-messages').classList.add('hidden');
    document.getElementById('gauge-b-bar').style.filter = "none";

    updateState(result, 'idle');
    
    if (result === "success") {
        let baseMin = currentFish.minSize;
        let baseMax = currentFish.maxSize;
        let boostRatio = totalTicksCount > 0 ? (boostTicksCount / totalTicksCount) : 0;
        let finalSize = baseMin + (Math.random() * (baseMax - baseMin));
        
        if (perfectBonus) finalSize += (baseMax - baseMin) * 0.15;
        finalSize += (baseMax - baseMin) * (boostRatio * 0.25);
        
        let absoluteMax = baseMax * 1.25; 
        if (finalSize > absoluteMax) finalSize = absoluteMax;

        document.getElementById('result-text').innerText = `${currentFish.name}を釣った！`;
        document.getElementById('fish-size-display').innerText = `${finalSize.toFixed(1)} cm`;
        document.getElementById('fish-img').src = currentFish.img;

        let currentBestRecord = maxRecordSize;
        let isNewRecord = finalSize > currentBestRecord;

        let queryBest = isNewRecord ? finalSize : currentBestRecord;
        const matched = rankTable.find(r => queryBest >= r.min);
        const finalRank = matched ? matched.rank : "D";

        let updated = saveGameResult(queryBest, finalRank);
        if (updated && isNewRecord && currentBestRecord > 0) {
            document.getElementById('best-update-msg').classList.remove('hidden');
        }
    }
}

// ===== ボタンのクリックイベント（追加分） =====
document.addEventListener('DOMContentLoaded', () => {
    // ホーム・スタート画面
    document.getElementById('start-btn').addEventListener('click', resetToAim);
    document.getElementById('instr-btn').addEventListener('click', () => updateState('howto'));
    
    // 操作方法画面
    document.getElementById('instrStartBtn').addEventListener('click', resetToAim);
    document.getElementById('instrBackBtn').addEventListener('click', () => updateState('start'));
    
    // リザルト画面
    document.getElementById('next-btn').addEventListener('click', resetToAim);
    document.getElementById('retry-btn').addEventListener('click', resetToAim);

    // 終了ボタン
    document.getElementById('quit-btn-start').addEventListener('click', exitToHome);
    document.getElementById('quit-btn-success').addEventListener('click', quitGame);
    document.getElementById('quit-btn-fail').addEventListener('click', quitGame);

    // ポーズ関連
    document.getElementById('pauseTriggerBtn').addEventListener('click', pauseGame);
    document.getElementById('resumeGameBtn').addEventListener('click', resumeGame);
    document.getElementById('restartGameBtn').addEventListener('click', restartGameFromPause);
    document.getElementById('showInstrBtn').addEventListener('click', showInstrFromPause);
    document.getElementById('exitToHomeBtn').addEventListener('click', exitToHome);

    // ユーザーモーダル関連
    document.getElementById('modal-trigger-btn').addEventListener('click', openUserModal);
    document.getElementById('closeUserModalBtn').addEventListener('click', closeUserModal);
    document.getElementById('addUserBtn').addEventListener('click', addAndSelectNewUser);

    // 初期化起動
    updateState('start');
});