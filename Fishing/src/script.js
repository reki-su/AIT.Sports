// 状態管理用変数
let screen = "start";
let gauge = 50;
let isHolding = false;
let currentFish = null;
let fishBite = false;
let biteTimer = null;
let gameInterval = null;

const fishes = [
    { name: "小魚", img: "images/fish_small.png", speed: 1 },
    { name: "中魚", img: "images/fish_medium.png", speed: 2 },
    { name: "大物", img: "images/fish_big.png", speed: 4 }
];

// 画面切り替え関数
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(`screen-${screenId}`).classList.remove('hidden');
    screen = screenId;
}

// スタートボタン
document.getElementById('start-btn').addEventListener('click', () => {
    showScreen('aim');
});

// スペースキーでキャスト
window.addEventListener('keydown', (e) => {
    if (screen === "aim" && e.code === "Space") {
        showScreen('waiting');
        
        // 魚をランダムに決定
        currentFish = fishes[Math.floor(Math.random() * fishes.length)];
        
        // 数秒後に当たりが来る
        biteTimer = setTimeout(() => {
            fishBite = true;
            document.getElementById('bite-icon').classList.remove('hidden');
        }, 2000 + Math.random() * 2000);
    }
});

// クリック（ヒット判定と巻き上げ）
const gameScreen = document.getElementById('game-screen');

gameScreen.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;

    if (fishBite && screen === "waiting") {
        fishBite = false;
        document.getElementById('bite-icon').classList.add('hidden');
        startReeling();
    }

    if (screen === "reeling") {
        isHolding = true;
    }
});

window.addEventListener('mouseup', () => {
    isHolding = false;
});

// 巻き上げ開始
function startReeling() {
    showScreen('reeling');
    gauge = 50;

    gameInterval = setInterval(() => {
        if (screen !== "reeling") {
            clearInterval(gameInterval);
            return;
        }

        // ゲージの計算
        let speed = currentFish.speed;
        if (isHolding) {
            gauge += 2;
        } else {
            gauge -= speed;
        }

        // 反映
        const bar = document.getElementById('gauge-bar');
        bar.style.width = `${gauge}%`;

        // 判定
        if (gauge >= 100) {
            finishGame("success");
        } else if (gauge <= 0) {
            finishGame("fail");
        }
    }, 100);
}

function finishGame(result) {
    clearInterval(gameInterval);
    showScreen(result);
    if (result === "success") {
        document.getElementById('result-text').innerText = `${currentFish.name}を釣った！`;
        document.getElementById('fish-img').src = currentFish.img;
    }
}