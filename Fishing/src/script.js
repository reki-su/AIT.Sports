let screen = "start";
let gauge = 50;
let points = 0; 
let isHolding = false;
let currentFish = null;
let fishBite = false;
let gameInterval = null;
let biteReactionTimer = null; 

const fishes = [
    { name: "小魚", img: "images/fish_small.png", speed: 1.2, points: 100 },
    { name: "中魚", img: "images/fish_medium.png", speed: 2.2, points: 500 },
    { name: "大物", img: "images/fish_big.png", speed: 4.0, points: 2000 }
];

const rodImg = document.getElementById('rod-display');
const reelingUI = document.getElementById('reeling-ui');
const pointsDisplay = document.getElementById('current-points');

function updateState(newScreen, rodState = 'idle') {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(`screen-${newScreen}`);
    if (target) target.classList.remove('hidden');
    
    screen = newScreen;
    rodImg.src = `images/rod_${rodState}.png`;

    if (newScreen === 'reeling') {
        reelingUI.classList.remove('hidden');
    } else {
        reelingUI.classList.add('hidden');
    }
}

function resetToAim() {
    fishBite = false;
    gauge = 50;
    if (biteReactionTimer) clearTimeout(biteReactionTimer);
    document.getElementById('bite-icon').classList.add('hidden');
    updateState('aim', 'idle');
}

function quitGame() {
    window.location.href = '../../Home/home.html';
}

// イベントリスナー
document.getElementById('start-btn').addEventListener('click', () => {
    updateState('aim', 'idle');
});

document.getElementById('next-btn').addEventListener('click', resetToAim);
document.getElementById('retry-btn').addEventListener('click', resetToAim);

// 新しく追加したスタート画面の終了ボタンを含め、すべての終了ボタンにイベントを設定
document.getElementById('quit-btn-start').addEventListener('click', quitGame);
document.getElementById('quit-btn-success').addEventListener('click', quitGame);
document.getElementById('quit-btn-fail').addEventListener('click', quitGame);

window.addEventListener('keydown', (e) => {
    if (screen === "aim" && e.code === "Space") {
        updateState('waiting', 'cast');
        currentFish = fishes[Math.floor(Math.random() * fishes.length)];
        
        setTimeout(() => {
            if (screen === "waiting") {
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
        }, 2000 + Math.random() * 2000);
    }
});

const gameScreen = document.getElementById('game-screen');
gameScreen.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
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
        if (screen !== "reeling") {
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
}