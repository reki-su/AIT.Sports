import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

// ===== Matter =====
const Engine = Matter.Engine;
const World  = Matter.World;
const Bodies = Matter.Bodies;
const Body   = Matter.Body;
const Events = Matter.Events;

const engine = Engine.create();
engine.gravity.y = 0;
const world = engine.world;

// ===== Three =====
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 22);
camera.lookAt(0, 0, -4);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("game"), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== ゲーム状態 =====
let gameState = "title";

// ===== CSS =====
const styleEl = document.createElement("style");
styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+JP:wght@400;700;900&family=Barlow+Condensed:wght@700;900&display=swap');
    * { box-sizing: border-box; margin:0; padding:0; }

    @keyframes floatBall {
        0%,100% { transform: translateY(0px); }
        50%      { transform: translateY(-14px); }
    }
    @keyframes pulseGlow {
        0%,100% { box-shadow: 0 0 0 0 rgba(0,200,255,0.4), 0 4px 24px rgba(0,120,255,0.5); }
        50%      { box-shadow: 0 0 0 8px rgba(0,200,255,0), 0 8px 32px rgba(0,180,255,0.8); }
    }
    @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes strikeIn {
        0%   { transform: scale(0.3) rotate(-8deg); opacity:0; }
        55%  { transform: scale(1.18) rotate(2deg);  opacity:1; }
        100% { transform: scale(1)    rotate(0deg);  opacity:1; }
    }
    @keyframes spareIn {
        0%   { transform: scale(0.5) translateY(8px); opacity:0; }
        65%  { transform: scale(1.1) translateY(-3px); opacity:1; }
        100% { transform: scale(1) translateY(0); opacity:1; }
    }
    @keyframes resultIn {
        from { transform: scale(0.88) translateY(32px); opacity:0; }
        to   { transform: scale(1)    translateY(0);    opacity:1; }
    }
    @keyframes scanline {
        0%   { transform: translateY(-100%); }
        100% { transform: translateY(100vh); }
    }
    @keyframes shimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }

    .wii-btn {
        cursor: pointer; border: none; outline: none;
        font-family: 'Barlow Condensed', 'Noto Sans JP', sans-serif;
        font-weight: 900; letter-spacing: 2px; text-transform: uppercase;
        transition: transform 0.1s ease, filter 0.1s ease;
        user-select: none; -webkit-user-select: none;
    }
    .wii-btn:hover  { transform: scale(1.05); filter: brightness(1.1); }
    .wii-btn:active { transform: scale(0.97); filter: brightness(0.95); }

    /* Wiiスタイル：シャープな角、クリーンなグラデーション */
    .panel {
        background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%);
        border: 1px solid rgba(255,255,255,0.18);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
    }
`;
document.head.appendChild(styleEl);

// ===== ============================================================= =====
// ===== タイトル画面
// ===== ============================================================= =====
const titleScreen = document.createElement("div");
titleScreen.style.cssText = `
    position:absolute; inset:0; z-index:200;
    background: linear-gradient(160deg, #001428 0%, #000c1e 60%, #000810 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    overflow:hidden;
`;

// グリッドライン背景
const gridBg = document.createElement("div");
gridBg.style.cssText = `
    position:absolute; inset:0; pointer-events:none;
    background-image:
        linear-gradient(rgba(0,150,255,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,150,255,0.06) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%);
`;
titleScreen.appendChild(gridBg);

// 中央グロー
const tGlow = document.createElement("div");
tGlow.style.cssText = `
    position:absolute; top:42%; left:50%; transform:translate(-50%,-50%);
    width:640px; height:320px;
    background:radial-gradient(ellipse, rgba(0,120,255,0.18) 0%, transparent 65%);
    pointer-events:none;
`;
titleScreen.appendChild(tGlow);

// Wiiロゴ風バッジ
const wiiBadge = document.createElement("div");
wiiBadge.style.cssText = `
    font-family:'Barlow Condensed',sans-serif; font-weight:700;
    font-size:11px; letter-spacing:5px; text-transform:uppercase;
    color:rgba(120,200,255,0.7);
    margin-bottom:20px;
    animation: fadeUp 0.6s ease 0.1s both;
`;
wiiBadge.textContent = "WII SPORTS · BOWLING ARENA";
titleScreen.appendChild(wiiBadge);

// メインタイトル（Wii風：太くシャープ）
const titleLogo = document.createElement("div");
titleLogo.style.cssText = `
    text-align:center;
    animation: fadeUp 0.6s ease 0.2s both;
`;
titleLogo.innerHTML = `
    <div style="
        font-family:'Barlow Condensed','Black Han Sans',sans-serif;
        font-size:108px; font-weight:900; letter-spacing:-2px; line-height:0.9;
        color: white;
        text-shadow:
            0 0 40px rgba(0,160,255,0.6),
            0 2px 0 rgba(0,80,200,0.8),
            0 4px 0 rgba(0,40,160,0.6);
    ">BOWLING</div>
    <div style="
        font-family:'Barlow Condensed',sans-serif; font-weight:700;
        font-size:20px; letter-spacing:18px; text-transform:uppercase;
        color:rgba(100,200,255,0.65);
        margin-top:8px; padding-left:18px;
    ">ARENA</div>
`;
titleScreen.appendChild(titleLogo);

// ボールアニメ
const titleBallWrap = document.createElement("div");
titleBallWrap.style.cssText = `
    margin: 28px auto 0;
    animation: floatBall 2.2s ease-in-out infinite, fadeUp 0.6s ease 0.35s both;
`;
titleBallWrap.innerHTML = `
    <div style="
        width:80px; height:80px; border-radius:50%; position:relative;
        background: radial-gradient(circle at 30% 28%, #4466dd, #001099 55%, #00040e);
        box-shadow: 0 8px 28px rgba(0,30,180,0.9), inset 0 -4px 10px rgba(0,0,0,0.7),
                    inset 2px 3px 6px rgba(255,255,255,0.12);
    ">
        <div style="position:absolute;top:20px;left:26px;width:9px;height:9px;border-radius:50%;background:rgba(0,0,0,0.75);"></div>
        <div style="position:absolute;top:26px;left:38px;width:8px;height:8px;border-radius:50%;background:rgba(0,0,0,0.75);"></div>
        <div style="position:absolute;top:19px;left:40px;width:8px;height:8px;border-radius:50%;background:rgba(0,0,0,0.75);"></div>
    </div>
`;
titleScreen.appendChild(titleBallWrap);

// ボタン群
const titleBtns = document.createElement("div");
titleBtns.style.cssText = `
    display:flex; flex-direction:column; align-items:center; gap:12px;
    margin-top:28px;
    animation: fadeUp 0.6s ease 0.45s both;
`;

const startBtn = document.createElement("button");
startBtn.className = "wii-btn";
startBtn.style.cssText = `
    padding:14px 80px; border-radius:6px; font-size:26px; color:white;
    background: linear-gradient(180deg, #2299ff 0%, #0055cc 50%, #003eaa 100%);
    box-shadow: 0 4px 0 #002288, 0 6px 20px rgba(0,100,255,0.5);
    animation: pulseGlow 2.5s ease-in-out infinite;
`;
startBtn.textContent = "PLAY";
startBtn.addEventListener("click", () => switchScreen("howto"));
titleBtns.appendChild(startBtn);

const howtoBtn = document.createElement("button");
howtoBtn.className = "wii-btn";
howtoBtn.style.cssText = `
    padding:8px 32px; border-radius:6px; font-size:14px;
    color:rgba(160,210,255,0.8);
    background:rgba(255,255,255,0.05);
    border:1px solid rgba(100,180,255,0.2);
    letter-spacing:3px;
`;
howtoBtn.textContent = "操作説明";
howtoBtn.addEventListener("click", () => switchScreen("howto"));
titleBtns.appendChild(howtoBtn);

titleScreen.appendChild(titleBtns);
document.body.appendChild(titleScreen);

// ===== ============================================================= =====
// ===== 操作説明画面
// ===== ============================================================= =====
const howtoScreen = document.createElement("div");
howtoScreen.style.cssText = `
    position:absolute; inset:0; z-index:190;
    background: linear-gradient(160deg, #001220 0%, #000c18 100%);
    display:none; flex-direction:column; align-items:center; justify-content:center;
    font-family:'Noto Sans JP','Barlow Condensed',sans-serif;
    color:white;
`;

const howtoPanel = document.createElement("div");
howtoPanel.className = "panel";
howtoPanel.style.cssText = `
    border-radius:8px; padding:36px 48px; max-width:540px; width:90%;
    animation: fadeUp 0.35s ease;
`;
howtoPanel.innerHTML = `
    <div style="
        font-family:'Barlow Condensed',sans-serif; font-weight:900;
        font-size:32px; letter-spacing:6px; text-align:center;
        color:white; margin-bottom:28px;
        text-shadow: 0 2px 12px rgba(0,150,255,0.5);
    ">HOW TO PLAY</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px 20px; font-size:15px; line-height:1.6;">
        <div>
            <div style="color:#44bbff; font-weight:700; font-size:13px; letter-spacing:2px; text-transform:uppercase; margin-bottom:3px;">← → キー</div>
            <div style="color:rgba(200,225,255,0.8); font-size:14px;">左右に移動</div>
        </div>
        <div>
            <div style="color:#44bbff; font-weight:700; font-size:13px; letter-spacing:2px; text-transform:uppercase; margin-bottom:3px;">A / D キー</div>
            <div style="color:rgba(200,225,255,0.8); font-size:14px;">投球の向きを変える</div>
        </div>
        <div>
            <div style="color:#44bbff; font-weight:700; font-size:13px; letter-spacing:2px; text-transform:uppercase; margin-bottom:3px;">Q / E キー</div>
            <div style="color:rgba(200,225,255,0.8); font-size:14px;">カーブ 左 / 右</div>
        </div>
        <div>
            <div style="color:#44bbff; font-weight:700; font-size:13px; letter-spacing:2px; text-transform:uppercase; margin-bottom:3px;">R キー</div>
            <div style="color:rgba(200,225,255,0.8); font-size:14px;">カーブをリセット</div>
        </div>
        <div style="grid-column:1/-1;">
            <div style="color:#ffcc22; font-weight:700; font-size:13px; letter-spacing:2px; text-transform:uppercase; margin-bottom:3px;">マウスドラッグ</div>
            <div style="color:rgba(200,225,255,0.8); font-size:14px;">上に向かってドラッグ → 投球！</div>
        </div>
    </div>
    <div style="
        margin-top:22px; padding:12px 16px; border-radius:4px;
        background:rgba(0,180,80,0.1); border-left:3px solid rgba(0,220,100,0.5);
        font-size:13px; color:rgba(160,245,190,0.85); line-height:1.7;
    ">
        🎳 <b>カーブのコツ</b>：Q/Eで設定後に投球するとボールが徐々に曲がります。<br>
        ストライクはレーン端から中央に向けてカーブさせましょう！
    </div>
`;
howtoScreen.appendChild(howtoPanel);

const howtoBtns = document.createElement("div");
howtoBtns.style.cssText = "display:flex; gap:12px; margin-top:20px;";

const howtoBackBtn = document.createElement("button");
howtoBackBtn.className = "wii-btn";
howtoBackBtn.style.cssText = `
    padding:11px 32px; border-radius:6px; font-size:15px; color:rgba(160,210,255,0.8);
    background:rgba(255,255,255,0.05); border:1px solid rgba(100,180,255,0.2);
`;
howtoBackBtn.textContent = "← TITLE";
howtoBackBtn.addEventListener("click", () => switchScreen("title"));
howtoBtns.appendChild(howtoBackBtn);

const howtoPlayBtn = document.createElement("button");
howtoPlayBtn.className = "wii-btn";
howtoPlayBtn.style.cssText = `
    padding:11px 40px; border-radius:6px; font-size:15px; color:white;
    background: linear-gradient(180deg, #22cc66 0%, #009933 50%, #007722 100%);
    box-shadow: 0 3px 0 #005515, 0 5px 16px rgba(0,180,80,0.4);
`;
howtoPlayBtn.textContent = "START →";
howtoPlayBtn.addEventListener("click", () => switchScreen("playing"));
howtoBtns.appendChild(howtoPlayBtn);

howtoScreen.appendChild(howtoBtns);
document.body.appendChild(howtoScreen);

// ===== ============================================================= =====
// ===== リザルト画面
// ===== ============================================================= =====
const resultScreen = document.createElement("div");
resultScreen.style.cssText = `
    position:absolute; inset:0; z-index:195;
    background:rgba(0,0,0,0.88);
    display:none; flex-direction:column; align-items:center; justify-content:center;
    font-family:'Barlow Condensed','Noto Sans JP',sans-serif;
`;

const resultInner = document.createElement("div");
resultInner.className = "panel";
resultInner.style.cssText = `
    background:linear-gradient(160deg,rgba(0,20,60,0.95),rgba(0,10,30,0.97));
    border-radius:8px;
    padding:40px 52px; max-width:500px; width:90%; text-align:center;
    box-shadow:0 16px 56px rgba(0,0,0,0.8);
    animation:resultIn 0.45s ease;
`;
resultInner.innerHTML = `
    <div style="font-size:13px; color:rgba(140,200,255,0.7); letter-spacing:6px; text-transform:uppercase; margin-bottom:6px;">FINAL SCORE</div>
    <div id="resultScore" style="
        font-size:104px; font-weight:900; line-height:1; letter-spacing:-2px;
        color:white;
        text-shadow: 0 0 30px rgba(0,180,255,0.5), 0 3px 0 rgba(0,60,180,0.8);
        margin:4px 0;
    ">0</div>
    <div id="resultRank" style="font-size:24px; font-weight:700; color:#ffcc22; letter-spacing:3px; margin-bottom:20px;"></div>
    <div id="resultFrames" style="display:flex; gap:3px; justify-content:center; flex-wrap:wrap; margin-bottom:24px;"></div>
    <div style="display:flex; gap:12px; justify-content:center;">
        <button id="resultRetryBtn" class="wii-btn" style="
            padding:12px 36px; border-radius:6px; font-size:18px; color:white;
            background:linear-gradient(180deg,#2299ff,#0055cc 50%,#003eaa);
            box-shadow:0 3px 0 #002288, 0 5px 18px rgba(0,100,255,0.4);
        ">RETRY</button>
        <button id="resultTitleBtn" class="wii-btn" style="
            padding:12px 36px; border-radius:6px; font-size:18px; color:rgba(160,210,255,0.8);
            background:rgba(255,255,255,0.05); border:1px solid rgba(100,180,255,0.2);
        ">TITLE</button>
    </div>
`;
resultScreen.appendChild(resultInner);
document.body.appendChild(resultScreen);

// ===== ============================================================= =====
// ===== ストライク / スペア 演出
// ===== ============================================================= =====
const eventOverlay = document.createElement("div");
eventOverlay.style.cssText = `
    position:absolute; inset:0; z-index:150; pointer-events:none;
    display:flex; align-items:center; justify-content:center;
    opacity:0; transition:opacity 0.25s;
`;
document.body.appendChild(eventOverlay);

const eventText = document.createElement("div");
eventText.style.cssText = "text-align:center;";
eventOverlay.appendChild(eventText);

function showEvent(type) {
    eventOverlay.style.opacity = "1";
    eventText.style.animation = "";
    void eventText.offsetWidth;

    if (type === "strike") {
        eventText.style.animation = "strikeIn 0.45s cubic-bezier(0.2,0.8,0.3,1.1) forwards";
        eventText.innerHTML = `
            <div style="font-size:72px; line-height:1;">🎳</div>
            <div style="
                font-family:'Barlow Condensed',sans-serif; font-weight:900;
                font-size:88px; letter-spacing:4px; line-height:1;
                color:white;
                text-shadow: 0 0 40px rgba(255,140,0,0.9), 0 4px 0 rgba(200,60,0,0.8);
            ">STRIKE!</div>
            <div style="
                font-family:'Barlow Condensed',sans-serif; font-weight:700;
                font-size:20px; letter-spacing:8px; color:rgba(255,200,100,0.9); margin-top:4px;
            ">ALL 10 PINS</div>
        `;
    } else if (type === "spare") {
        eventText.style.animation = "spareIn 0.45s cubic-bezier(0.2,0.8,0.3,1.1) forwards";
        eventText.innerHTML = `
            <div style="font-size:60px; line-height:1;">⭐</div>
            <div style="
                font-family:'Barlow Condensed',sans-serif; font-weight:900;
                font-size:80px; letter-spacing:4px; line-height:1;
                color:white;
                text-shadow: 0 0 32px rgba(0,200,255,0.9), 0 4px 0 rgba(0,60,180,0.8);
            ">SPARE!</div>
        `;
    } else if (type === "gutter") {
        eventText.innerHTML = `
            <div style="
                font-family:'Barlow Condensed',sans-serif; font-weight:700;
                font-size:44px; letter-spacing:6px; color:rgba(180,160,160,0.85);
                text-shadow: 0 2px 12px rgba(0,0,0,0.6);
            ">GUTTER...</div>
        `;
    }

    clearTimeout(eventOverlay._timer);
    eventOverlay._timer = setTimeout(() => {
        eventOverlay.style.opacity = "0";
    }, 2000);
}

// ===== ============================================================= =====
// ===== ゲームUI
// ===== ============================================================= =====
const gameUI = document.createElement("div");
gameUI.style.cssText = "position:absolute; inset:0; pointer-events:none; display:none;";
document.body.appendChild(gameUI);

// ピンマップ（左上）
const pinMapEl = document.createElement("div");
pinMapEl.className = "panel";
pinMapEl.style.cssText = `
    position:absolute; top:16px; left:16px; pointer-events:auto;
    padding:10px 12px; border-radius:6px;
    box-shadow:0 4px 18px rgba(0,0,0,0.5);
    font-family:'Barlow Condensed',sans-serif;
`;
pinMapEl.innerHTML = `
    <div style="font-size:10px; font-weight:700; color:rgba(120,180,255,0.7); letter-spacing:3px; text-transform:uppercase; margin-bottom:7px;">PINS</div>
    <div id="pinDots" style="position:relative; width:156px; height:148px;"></div>
`;
gameUI.appendChild(pinMapEl);

// スコアボード（右上）
const scoreBoardEl = document.createElement("div");
scoreBoardEl.className = "panel";
scoreBoardEl.style.cssText = `
    position:absolute; top:16px; right:16px; pointer-events:auto;
    padding:12px 14px; border-radius:6px; min-width:240px;
    box-shadow:0 4px 18px rgba(0,0,0,0.5);
    font-family:'Noto Sans JP',sans-serif; color:white;
`;
scoreBoardEl.innerHTML = `
    <div style="font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; color:rgba(120,180,255,0.7); letter-spacing:4px; text-transform:uppercase; margin-bottom:8px;">SCORE BOARD</div>
    <div id="frameLabel" style="font-size:15px; font-weight:700; color:white; margin-bottom:1px;"></div>
    <div id="throwLabel" style="font-size:12px; color:rgba(140,180,230,0.7); margin-bottom:6px;"></div>
    <div id="totalScore" style="font-family:'Barlow Condensed',sans-serif; font-size:26px; font-weight:900; color:white; letter-spacing:1px; margin-bottom:8px;">TOTAL: 0</div>
    <div id="framesRow" style="display:flex; gap:2px; flex-wrap:wrap;"></div>
    <div id="msgBox" style="min-height:22px; margin-top:8px; font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:700; color:#ffcc22; letter-spacing:2px; text-transform:uppercase;"></div>
`;
gameUI.appendChild(scoreBoardEl);

// カーブUI（右下）
const curveEl = document.createElement("div");
curveEl.className = "panel";
curveEl.style.cssText = `
    position:absolute; bottom:24px; right:16px; pointer-events:auto;
    padding:10px 14px; border-radius:6px; min-width:148px;
    box-shadow:0 4px 18px rgba(0,0,0,0.5);
    font-family:'Barlow Condensed',sans-serif;
`;
curveEl.innerHTML = `
    <div style="font-size:10px; font-weight:700; color:rgba(120,180,255,0.7); letter-spacing:3px; text-transform:uppercase; margin-bottom:7px;">CURVE</div>
    <div style="display:flex; align-items:center; gap:6px;">
        <span style="font-size:10px; color:rgba(140,180,230,0.6); letter-spacing:1px;">L</span>
        <div style="flex:1; height:7px; background:rgba(255,255,255,0.07); border-radius:2px; position:relative; overflow:hidden;">
            <div id="curveFill" style="
                position:absolute; height:100%; width:0%; left:50%;
                background:linear-gradient(90deg,#00bbff,#ff5500);
                border-radius:2px; transition:left 0.1s,width 0.1s;
            "></div>
        </div>
        <span style="font-size:10px; color:rgba(140,180,230,0.6); letter-spacing:1px;">R</span>
    </div>
    <div id="curveLabel" style="text-align:center; font-size:11px; color:rgba(160,180,220,0.6); margin-top:4px; letter-spacing:1px;">NONE</div>
`;
gameUI.appendChild(curveEl);

// ===== ============================================================= =====
// ===== 画面切り替え
// ===== ============================================================= =====
function switchScreen(to) {
    titleScreen.style.display = "none";
    howtoScreen.style.display = "none";
    resultScreen.style.display = "none";
    gameUI.style.display = "none";

    gameState = to;

    if (to === "title") {
        titleScreen.style.display = "flex";
    } else if (to === "howto") {
        howtoScreen.style.display = "flex";
    } else if (to === "playing") {
        gameUI.style.display = "block";
        startNewGame();
    } else if (to === "result") {
        resultScreen.style.display = "flex";
    }
}

// ===== ============================================================= =====
// ===== ライト
// ===== ============================================================= =====
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xfffaf0, 1.4);
dirLight.position.set(4, 16, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0xb0d0ff, 0.4);
fillLight.position.set(-6, 6, 4);
scene.add(fillLight);

// fogを薄く（背景が見えやすいように）
scene.fog = new THREE.Fog(0x8899aa, 35, 60);

// ===== ============================================================= =====
// ===== レーン・背景（駐車場テクスチャ）
// ===== ============================================================= =====
const texLoader = new THREE.TextureLoader();

// シーン背景色（アスファルトに合わせたダークグレー）
scene.background = new THREE.Color(0x3a3a3a);

// ---------------------------------------------------------------
// parking.jpeg：縦長写真（幅:高さ ≒ 3:4 = 0.75）
// 地面・レーンは同じテクスチャインスタンスを使い継ぎ目をなくす。
// → ground と lane は「同じ1枚のテクスチャ」を共有し、
//    UVスケールを揃えることで継ぎ目が目立たないようにする。
// ---------------------------------------------------------------

// ── 共通テクスチャ（地面・レーン兼用）─────────────────────────
// 80×80 の地面に対して画像1枚をそのまま貼ると縦に伸びるので
// 横3枚タイル：repeat.x=3, repeat.y = 3*(80/80)/0.75 = 4.0
const sharedGroundTex = texLoader.load("img/parking.jpeg", tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 4.0);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
});

// 地面全体（80×80）
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshPhongMaterial({ map: sharedGroundTex, shininess: 8, color: 0xb8b8b8 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.02, -10);
ground.receiveShadow = true;
scene.add(ground);

// レーン（6×36）：地面と同じテクスチャを共有 → タイルが連続して見える
// 地面の UV スケールに合わせて repeat を揃える
// 地面の1UV単位 = 80/3 ≒ 26.7m(x), 80/4 = 20m(y)
// レーン幅6m → repeat.x = 6/26.7 ≒ 0.225
// レーン長36m → repeat.y = 36/20 = 1.8
const laneTex = texLoader.load("img/parking.jpeg", tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(0.225, 1.8);
    // 画像中央の走行路（矢印がある部分）に合わせてXオフセット
    tex.offset.set(0.38, 0);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
});
const lane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 36),
    new THREE.MeshPhongMaterial({ map: laneTex, shininess: 18, color: 0xcccccc })
);
lane.rotation.x = -Math.PI / 2;
lane.position.set(0, 0.001, -3);
lane.receiveShadow = true;
scene.add(lane);

// 奥の背景壁（80×18）：画像の上半分（木・空・遠景車）を表示
// repeat.x=1.2 → repeat.y = 1.2*(18/80)/0.75 = 0.36, offset.y=0.58 で上部を使う
const backWallTex = texLoader.load("img/parking.jpeg", tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.2, 0.36);
    tex.offset.set(0, 0.58);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
});
const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 18),
    new THREE.MeshPhongMaterial({ map: backWallTex, shininess: 4, color: 0xaaaaaa })
);
backWall.position.set(0, 8, -42);
scene.add(backWall);

// ガター（車との境界線）
const gutterMat = new THREE.MeshPhongMaterial({ color: 0x555544, shininess: 8 });
[-3.6, 3.6].forEach(x => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 36), gutterMat);
    g.rotation.x = -Math.PI / 2;
    g.position.set(x, 0.0, -3);
    scene.add(g);
});

// 壁（ガラス風）
const wallMat = new THREE.MeshPhongMaterial({ color: 0x223344, transparent: true, opacity: 0.45, shininess: 90 });
[-4.05, 4.05].forEach(x => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 36), wallMat);
    w.position.set(x, 0.55, -3);
    w.castShadow = true;
    scene.add(w);
});

// ファウルライン
const foulLine = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 0.07),
    new THREE.MeshBasicMaterial({ color: 0xff2200 })
);
foulLine.rotation.x = -Math.PI / 2;
foulLine.position.set(0, 0.01, 7);
scene.add(foulLine);

// ===== ============================================================= =====
// ===== ボール
// ===== ============================================================= =====
let ballBody, ballGroup;
let curveAmount = 0;
let curveActive = false;

function createBall() {
    if (ballBody) World.remove(world, ballBody);
    if (ballGroup) scene.remove(ballGroup);

    ballBody = Bodies.circle(playerX, 8, 0.32, {
        restitution: 0.2, frictionAir: 0.008,
        friction: 0.04, density: 0.08, label: "ball"
    });
    World.add(world, ballBody);

    ballGroup = new THREE.Group();

    const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 48, 48),
        new THREE.MeshPhongMaterial({
            color: 0x080810, shininess: 240,
            specular: new THREE.Color(0x3355ff)
        })
    );
    ballGroup.add(core);

    const lMat1 = new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(0.323, 0.015, 8, 64), lMat1);
        m.rotation.set(Math.PI / 2, (i * Math.PI * 2) / 3, 0.65);
        ballGroup.add(m);
    }

    const lMat2 = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.7 });
    const lm2 = new THREE.Mesh(new THREE.TorusGeometry(0.326, 0.008, 8, 64), lMat2);
    lm2.rotation.set(Math.PI / 3, 0, Math.PI / 4);
    ballGroup.add(lm2);

    const holeMat = new THREE.MeshPhongMaterial({ color: 0x020205 });
    [[0.17, 0.25, 0.16], [-0.04, 0.30, 0.16], [-0.18, 0.21, 0.19]].forEach(([x, y, z]) => {
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), holeMat);
        h.position.set(x, y, z);
        ballGroup.add(h);
    });

    ballGroup.castShadow = true;
    scene.add(ballGroup);
}

// ===== ============================================================= =====
// ===== ピン
// ===== ============================================================= =====
let pins = [];
const PIN_POSITIONS = [
    [0,     -4.5],
    [-0.55, -5.5], [0.55,  -5.5],
    [-1.1,  -6.5], [0,     -6.5], [1.1,  -6.5],
    [-1.65, -7.5], [-0.55, -7.5], [0.55, -7.5], [1.65, -7.5]
];

function createPinMesh() {
    const g = new THREE.Group();
    const white = new THREE.MeshPhongMaterial({ color: 0xf0f0f0, shininess: 110 });
    const red   = new THREE.MeshPhongMaterial({ color: 0xcc1111, shininess: 70 });

    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.27, 0.52, 22), white);
    b1.position.y = 0.26; b1.castShadow = true; g.add(b1);
    const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.08, 22), red);
    r1.position.y = 0.56; g.add(r1);
    const n1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.168, 0.11, 22), white);
    n1.position.y = 0.665; g.add(n1);
    const r2 = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.07, 22), red);
    r2.position.y = 0.765; g.add(r2);
    const n2 = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.125, 0.09, 22), white);
    n2.position.y = 0.855; g.add(n2);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 22, 22), white);
    head.position.y = 0.99; head.castShadow = true; g.add(head);

    return g;
}

function createPins() {
    pins.forEach(p => { World.remove(world, p.body); scene.remove(p.mesh); });
    pins = [];
    PIN_POSITIONS.forEach(([px, pz]) => {
        const body = Bodies.circle(px, pz, 0.21, {
            restitution: 0.6, friction: 0.04,
            frictionAir: 0.016, density: 0.03, label: "pin"
        });
        World.add(world, body);
        const mesh = createPinMesh();
        scene.add(mesh);
        pins.push({ body, mesh, startX: px, startZ: pz, knocked: false });
    });
    updatePinMap();
}

Events.on(engine, "collisionStart", ev => {
    ev.pairs.forEach(({ bodyA, bodyB }) => {
        const isPin  = b => b.label === "pin";
        const isBall = b => b.label === "ball";

        if ((isBall(bodyA) && isPin(bodyB)) || (isBall(bodyB) && isPin(bodyA))) {
            const pin  = isPin(bodyA) ? bodyA : bodyB;
            const ball = isBall(bodyA) ? bodyA : bodyB;

            const dx  = pin.position.x - ball.position.x;
            const dy  = pin.position.y - ball.position.y;
            const d   = Math.hypot(dx, dy) || 1;
            const spd = Math.hypot(ball.velocity.x, ball.velocity.y);

            const nx = dx / d;
            const ny = dy / d;
            const tangent = ball.velocity.x * 0.18;
            const fx = nx * (0.015 + spd * 0.006) + tangent;
            const fy = ny * (0.015 + spd * 0.006);
            Body.applyForce(pin, pin.position, { x: fx, y: fy });
        }

        if (isPin(bodyA) && isPin(bodyB)) {
            const dx  = bodyB.position.x - bodyA.position.x;
            const dy  = bodyB.position.y - bodyA.position.y;
            const d   = Math.hypot(dx, dy) || 1;
            const spd = Math.hypot(bodyA.velocity.x, bodyA.velocity.y)
                      + Math.hypot(bodyB.velocity.x, bodyB.velocity.y);
            const f   = spd * 0.006;
            Body.applyForce(bodyB, bodyB.position, { x:  dx/d*f, y:  dy/d*f });
            Body.applyForce(bodyA, bodyA.position, { x: -dx/d*f, y: -dy/d*f });
        }
    });
});

// ===== ============================================================= =====
// ===== 操作
// ===== ============================================================= =====
let playerX = 0, angle = 0;
let startMouseX, startMouseY;
let scored = false, ballLaunched = false;
let ballPassedPins = false;       // ボールがピンエリアを通過したか
let scoreCheckScheduled = false;  // scheduleCheckScore を1回だけ呼ぶフラグ

document.addEventListener("mousedown", e => {
    if (gameState !== "playing") return;
    startMouseX = e.clientX; startMouseY = e.clientY;
    scored = false; ballLaunched = false;
});

document.addEventListener("mouseup", e => {
    if (gameState !== "playing" || scored) return;
    const rawDx = Math.max(-280, Math.min(280, e.clientX - startMouseX));
    const rawDy = Math.max(-380, Math.min(380, startMouseY - e.clientY));
    let vx = rawDx * 0.00020 + Math.sin(angle) * 0.18;
    let vy = -(rawDy * 0.0036) - Math.cos(angle) * 0.18;
    vx = Math.max(-2.0, Math.min(2.0, vx));
    vy = Math.max(-2.0, Math.min(2.0, vy));
    if (Math.abs(vy) < 0.1) return;
    Body.setPosition(ballBody, { x: playerX, y: 8 });
    Body.setVelocity(ballBody, { x: vx + curveAmount * 0.06, y: vy });
    curveActive = true;
    ballLaunched = true;
    ballPassedPins = false;
    scoreCheckScheduled = false;
});

document.addEventListener("keydown", e => {
    if (gameState !== "playing") return;
    if (e.key === "ArrowLeft")              playerX = Math.max(-2.2, playerX - 0.38);
    if (e.key === "ArrowRight")             playerX = Math.min(2.2,  playerX + 0.38);
    if (e.key === "a" || e.key === "A")     angle = Math.max(-0.48, angle - 0.07);
    if (e.key === "d" || e.key === "D")     angle = Math.min(0.48,  angle + 0.07);
    if (e.key === "q" || e.key === "Q")     curveAmount = Math.max(-1, curveAmount - 0.2);
    if (e.key === "e" || e.key === "E")     curveAmount = Math.min(1,  curveAmount + 0.2);
    if (e.key === "r" || e.key === "R")     curveAmount = 0;
    updateCurveUI();
});

function updateCurveUI() {
    const fill  = document.getElementById("curveFill");
    const label = document.getElementById("curveLabel");
    if (!fill) return;
    if (curveAmount === 0) {
        fill.style.left = "50%"; fill.style.width = "0%";
        label.textContent = "NONE"; label.style.color = "rgba(160,180,220,0.5)";
    } else if (curveAmount > 0) {
        fill.style.left = "50%";
        fill.style.width = (curveAmount * 50) + "%";
        label.textContent = "R +" + Math.round(curveAmount * 100) + "%";
        label.style.color = "#ff8833";
    } else {
        const w = -curveAmount * 50;
        fill.style.left = (50 - w) + "%";
        fill.style.width = w + "%";
        label.textContent = "L +" + Math.round(-curveAmount * 100) + "%";
        label.style.color = "#33bbff";
    }
}

// ===== ============================================================= =====
// ===== スコアロジック
// ===== ============================================================= =====
const STRIKE_SYM = "X";
const SPARE_SYM  = "/";

let frame = 1, throwCount = 1, firstThrowKnocked = 0;
let frameData = [];

function calcCumulative() {
    const result = new Array(10).fill(null);
    let total = 0;
    for (let i = 0; i < frameData.length && i < 10; i++) {
        const f = frameData[i];
        if (!f || f.length === 0) break;
        if (i === 9) {
            const need = (f[0] === 10 || (f.length > 1 && f[0] + f[1] === 10)) ? 3 : 2;
            if (f.length < need) break;
            total += f.reduce((a, b) => a + b, 0);
        } else if (f[0] === 10) {
            const next = frameData[i + 1];
            if (!next || next.length === 0) break;
            const b1 = next[0] ?? 0;
            let b2;
            if (next[0] === 10 && i + 1 < 9) {
                const next2 = frameData[i + 2];
                if (!next2 || next2.length === 0) break;
                b2 = next2[0] ?? 0;
            } else {
                if (next.length < 2) break;
                b2 = next[1] ?? 0;
            }
            total += 10 + b1 + b2;
        } else if (f.length > 1 && f[0] + f[1] === 10) {
            const next = frameData[i + 1];
            if (!next || next.length === 0) break;
            total += 10 + next[0];
        } else {
            if (f.length < 2) break;
            total += f[0] + f[1];
        }
        result[i] = total;
    }
    return result;
}

function drawFrameBoard() {
    const cum = calcCumulative();
    const framesRow = document.getElementById("framesRow");
    if (!framesRow) return;
    framesRow.innerHTML = "";

    for (let i = 0; i < 10; i++) {
        const f    = frameData[i] || [];
        const is10 = i === 9;
        const isCur = i === frame - 1;

        const box = document.createElement("div");
        box.style.cssText = `
            width:${is10 ? "56px" : "43px"};
            background:${isCur ? "rgba(0,80,180,0.8)" : "rgba(0,0,0,0.4)"};
            border:1px solid ${isCur ? "rgba(100,180,255,0.7)" : "rgba(80,120,200,0.3)"};
            border-radius:3px; overflow:hidden;
            font-family:'Barlow Condensed',sans-serif; color:white;
        `;

        const tr = document.createElement("div");
        tr.style.cssText = "display:flex; border-bottom:1px solid rgba(80,120,200,0.3); min-height:18px;";

        const cell = (html, noBorder) => {
            const c = document.createElement("div");
            c.style.cssText = `flex:1; display:flex; align-items:center; justify-content:center;
                font-size:9px; font-weight:700; padding:2px 0;
                ${noBorder ? "" : "border-right:1px solid rgba(80,120,200,0.3);"}`;
            c.innerHTML = html;
            return c;
        };

        if (is10) {
            [0, 1, 2].forEach(k => tr.appendChild(cell(sym10(f, k), k === 2)));
        } else {
            const s = symNormal(f);
            tr.appendChild(cell(s[0]));
            tr.appendChild(cell(s[1], true));
        }

        const num = document.createElement("div");
        num.style.cssText = "text-align:center; font-size:7px; color:rgba(100,140,220,0.5); padding:1px 0;";
        num.textContent = i + 1;

        const sc = document.createElement("div");
        sc.style.cssText = "text-align:center; font-size:12px; font-weight:700; padding:2px 0; min-height:18px; color:rgba(200,225,255,0.9);";
        sc.textContent = cum[i] !== null ? cum[i] : "";

        box.appendChild(tr); box.appendChild(num); box.appendChild(sc);
        framesRow.appendChild(box);
    }

    const last = calcCumulative().filter(v => v !== null).pop();
    const totalEl = document.getElementById("totalScore");
    if (totalEl) totalEl.textContent = "TOTAL: " + (last ?? 0);
}

function symNormal(f) {
    if (f[0] === 10) return ["", `<span style="color:#ffaa66;font-weight:900;">${STRIKE_SYM}</span>`];
    const s1 = f[0] !== undefined ? (f[0] === 0 ? "-" : f[0]) : "";
    let s2 = "";
    if (f.length > 1)
        s2 = (f[0] + f[1] === 10)
            ? `<span style="color:#55ccff;font-weight:900;">${SPARE_SYM}</span>`
            : (f[1] === 0 ? "-" : f[1]);
    return [s1, s2];
}

function sym10(f, idx) {
    const v = f[idx];
    if (v === undefined) return "";
    const S = `<span style="color:#ffaa66;font-weight:900;">${STRIKE_SYM}</span>`;
    const P = `<span style="color:#55ccff;font-weight:900;">${SPARE_SYM}</span>`;
    if (idx === 0) return v === 10 ? S : (v === 0 ? "-" : v);
    if (idx === 1) {
        if (f[0] === 10) return v === 10 ? S : (v === 0 ? "-" : v);
        return f[0] + v === 10 ? P : (v === 0 ? "-" : v);
    }
    if (idx === 2) {
        if (v === 10) return S;
        if (f[0] === 10 && f[1] !== 10 && f[1] + v === 10) return P;
        return v === 0 ? "-" : v;
    }
    return "";
}

function setMsg(txt) {
    const el = document.getElementById("msgBox");
    if (el) el.textContent = txt;
}
function setFrameLabel(txt) {
    const el = document.getElementById("frameLabel");
    if (el) el.textContent = txt;
}
function setThrowLabel(txt) {
    const el = document.getElementById("throwLabel");
    if (el) el.textContent = txt;
}

// ===== ============================================================= =====
// ===== ピン管理
// ===== ============================================================= =====
// ボールがピンエリアを通過してから、物理が静止するまで待つ
// 閾値を大きめにしてしっかり倒れてから判定
const KNOCK_THRESHOLD = 0.52;

// ピンが十分静止しているか（全ピンの速度が小さい）
function arePinsSettled() {
    return pins.every(p => {
        if (p.knocked) return true;
        const spd = Math.hypot(p.body.velocity.x, p.body.velocity.y);
        return spd < 0.015;
    });
}

function countKnocked() {
    return pins.filter(p =>
        Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD
    ).length;
}

function removeKnockedPins() {
    pins.forEach(p => {
        const moved = Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD;
        if (moved && !p.knocked) {
            p.knocked = true;
            World.remove(world, p.body);
            scene.remove(p.mesh);
        }
    });
}

// ===== ============================================================= =====
// ===== checkScore（ボール通過後＋ピン静止待ち）
// ===== ============================================================= =====
let scoreCheckTimer = null;

function scheduleCheckScore() {
    if (scored) return;
    clearInterval(scoreCheckTimer);
    let elapsed = 0;
    const interval = 60;   // 60ms ごとにチェック
    const maxWait  = 2000; // 最大2秒待つ

    scoreCheckTimer = setInterval(() => {
        elapsed += interval;
        // ピン速度が全部 0.025 未満 or タイムアウト
        const settled = pins.every(p => {
            if (p.knocked) return true;
            return Math.hypot(p.body.velocity.x, p.body.velocity.y) < 0.025;
        });
        if (settled || elapsed >= maxWait) {
            clearInterval(scoreCheckTimer);
            checkScore();
        }
    }, interval);
}

function checkScore() {
    if (scored) return;
    scored = true;
    ballLaunched = false;
    curveActive = false;

    const fi = frame - 1;
    if (!frameData[fi]) frameData[fi] = [];

    const totalKnocked = countKnocked();
    const thisThrow = throwCount === 1 ? totalKnocked : totalKnocked - firstThrowKnocked;
    frameData[fi].push(thisThrow);
    const f = frameData[fi];

    if (frame === 10) {
        handle10thFrame(f, totalKnocked);
    } else {
        handleNormalFrame(f, totalKnocked, thisThrow);
    }
    drawFrameBoard();
}

function handleNormalFrame(f, totalKnocked, thisThrow) {
    if (throwCount === 1) {
        firstThrowKnocked = totalKnocked;
        if (thisThrow === 10) {
            setMsg("STRIKE!");
            setFrameLabel("FRAME " + frame);
            showEvent("strike");
            drawFrameBoard();
            setTimeout(() => { removeKnockedPins(); nextFrame(); }, 1800);
        } else {
            if (thisThrow === 0) showEvent("gutter");
            setMsg(thisThrow + " PIN" + (thisThrow !== 1 ? "S" : ""));
            setFrameLabel("FRAME " + frame);
            throwCount = 2; setThrowLabel("2ND THROW");
            drawFrameBoard();
            setTimeout(() => {
                removeKnockedPins();
                updatePinMap();
                createBall();
                scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false;
            }, 1800);
        }
    } else {
        const total2 = f[0] + f[1];
        if (total2 === 10) {
            setMsg("SPARE!");
            showEvent("spare");
        } else {
            setMsg(total2 + " TOTAL");
        }
        setFrameLabel("FRAME " + frame);
        drawFrameBoard();
        setTimeout(() => { removeKnockedPins(); nextFrame(); }, 1800);
    }
}

function handle10thFrame(f, totalKnocked) {
    const need = (f[0] === 10 || (f.length > 1 && f[0] + f[1] === 10)) ? 3 : 2;

    if (f.length === 1) {
        firstThrowKnocked = f[0] === 10 ? 0 : totalKnocked;
        if (f[0] === 10) {
            setMsg("STRIKE!");
            showEvent("strike");
        } else {
            setMsg(f[0] + " PIN" + (f[0] !== 1 ? "S" : ""));
        }
        throwCount = 2; setThrowLabel("2ND THROW");
        drawFrameBoard();
        setTimeout(() => {
            if (f[0] === 10) {
                pins.forEach(p => { World.remove(world, p.body); scene.remove(p.mesh); });
                pins = [];
                createPins();
            } else {
                removeKnockedPins();
                updatePinMap();
            }
            createBall();
            scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false;
        }, 1800);
        return;
    }

    if (f.length === 2) {
        if (need === 3) {
            if (f[0] === 10 && f[1] === 10) {
                setMsg("DOUBLE STRIKE!");
                showEvent("strike");
                firstThrowKnocked = 0;
                throwCount = 3; setThrowLabel("3RD THROW");
                drawFrameBoard();
                setTimeout(() => {
                    pins.forEach(p => { World.remove(world, p.body); scene.remove(p.mesh); });
                    pins = [];
                    createPins();
                    createBall();
                    scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false;
                }, 1800);
            } else if (f[0] + f[1] === 10) {
                setMsg("SPARE!");
                showEvent("spare");
                firstThrowKnocked = 0;
                throwCount = 3; setThrowLabel("3RD THROW");
                drawFrameBoard();
                setTimeout(() => {
                    pins.forEach(p => { World.remove(world, p.body); scene.remove(p.mesh); });
                    pins = [];
                    createPins();
                    createBall();
                    scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false;
                }, 1800);
            } else {
                setMsg("STRIKE + " + f[1] + " PINS");
                firstThrowKnocked = totalKnocked;
                throwCount = 3; setThrowLabel("3RD THROW");
                drawFrameBoard();
                setTimeout(() => {
                    removeKnockedPins();
                    updatePinMap();
                    createBall();
                    scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false;
                }, 1800);
            }
            return;
        } else {
            setMsg((f[0] + f[1]) + " TOTAL");
            drawFrameBoard();
            setTimeout(() => { removeKnockedPins(); endGame(); }, 1800);
            return;
        }
    }

    if (f.length === 3) {
        if (f[2] === 10) { setMsg("STRIKE!"); showEvent("strike"); }
        else if (f[0] === 10 && f[1] !== 10 && f[1] + f[2] === 10) { setMsg("SPARE!"); showEvent("spare"); }
        else setMsg(f[2] + " PINS");
        drawFrameBoard();
        setTimeout(() => { removeKnockedPins(); endGame(); }, 1800);
    }
}

function nextFrame() {
    frame++; throwCount = 1; firstThrowKnocked = 0;
    if (frame > 10) { endGame(); return; }
    setFrameLabel("FRAME " + frame);
    setThrowLabel("1ST THROW");
    setTimeout(() => {
        createBall(); createPins();
        setMsg(""); scored = false; ballLaunched = false;
        ballPassedPins = false; scoreCheckScheduled = false;
    }, 400);
}

function endGame() {
    const cum = calcCumulative();
    const finalScore = cum.filter(v => v !== null).pop() ?? 0;
    showResult(finalScore, cum);
}

function startNewGame() {
    frame = 1; throwCount = 1; firstThrowKnocked = 0;
    frameData = []; scored = false; ballLaunched = false;
    ballPassedPins = false; scoreCheckScheduled = false;
    curveAmount = 0; angle = 0; playerX = 0;
    setFrameLabel("FRAME 1"); setThrowLabel("1ST THROW");
    setMsg(""); updateCurveUI(); drawFrameBoard();
    createBall(); createPins();
}

// ===== ============================================================= =====
// ===== リザルト表示
// ===== ============================================================= =====
function showResult(finalScore, cum) {
    const rankTable = [
        [300, "🏆 PERFECT GAME!!"],
        [250, "🥇 AMAZING!!"],
        [200, "⭐ EXCELLENT!"],
        [150, "👍 GREAT!"],
        [100, "😊 GOOD!"],
        [0,   "🎳 KEEP TRYING!"],
    ];
    const rank = rankTable.find(([t]) => finalScore >= t)[1];

    document.getElementById("resultScore").textContent = finalScore;
    document.getElementById("resultRank").textContent  = rank;

    const rf = document.getElementById("resultFrames");
    rf.innerHTML = "";
    for (let i = 0; i < 10; i++) {
        const f    = frameData[i] || [];
        const is10 = i === 9;
        const box  = document.createElement("div");
        box.style.cssText = `
            background:rgba(255,255,255,0.05); border:1px solid rgba(80,140,220,0.2);
            border-radius:3px; overflow:hidden;
            font-family:'Barlow Condensed',sans-serif; color:white;
            width:${is10 ? "48px" : "36px"};
        `;
        const tr = document.createElement("div");
        tr.style.cssText = "display:flex; border-bottom:1px solid rgba(80,140,220,0.15); min-height:15px;";
        const mc = (html, nb) => {
            const c = document.createElement("div");
            c.style.cssText = `flex:1; display:flex; align-items:center; justify-content:center;
                font-size:8px; font-weight:700; ${nb ? "" : "border-right:1px solid rgba(80,140,220,0.15);"}`;
            c.innerHTML = html;
            return c;
        };
        if (is10) { [0,1,2].forEach(k => tr.appendChild(mc(sym10(f, k), k===2))); }
        else { const s = symNormal(f); tr.appendChild(mc(s[0])); tr.appendChild(mc(s[1], true)); }
        const sc = document.createElement("div");
        sc.style.cssText = "text-align:center; font-size:10px; font-weight:700; padding:2px 0; color:rgba(180,210,255,0.85);";
        sc.textContent = cum[i] !== null ? cum[i] : "";
        box.appendChild(tr); box.appendChild(sc);
        rf.appendChild(box);
    }

    switchScreen("result");
    document.getElementById("resultRetryBtn").onclick = () => switchScreen("playing");
    document.getElementById("resultTitleBtn").onclick = () => switchScreen("title");
}

// ===== ============================================================= =====
// ===== ピンマップ更新（倒れたピンは薄くなるだけ）
// ===== ============================================================= =====
function updatePinMap() {
    const pinDots = document.getElementById("pinDots");
    if (!pinDots) return;
    pinDots.innerHTML = "";
    const mapPos = [
        {x:76,y:128,n:1},
        {x:56,y:96, n:2},{x:96, y:96, n:3},
        {x:36,y:64, n:4},{x:76, y:64, n:5},{x:116,y:64, n:6},
        {x:16,y:32, n:7},{x:56, y:32, n:8},{x:96, y:32, n:9},{x:136,y:32, n:10}
    ];
    pins.forEach((p, i) => {
        const moved = !p.knocked && Math.hypot(
            p.body.position.x - p.startX,
            p.body.position.y - p.startZ
        ) > KNOCK_THRESHOLD;
        const isDown = p.knocked || moved;

        const dot = document.createElement("div");
        dot.style.cssText = `
            position:absolute; left:${mapPos[i].x}px; top:${mapPos[i].y}px;
            width:20px; height:20px; border-radius:50%; transform:translate(-50%,-50%);
            transition: background 0.3s, border-color 0.3s, opacity 0.3s;
            opacity: ${isDown ? "0.22" : "1"};
            background: ${isDown
                ? "rgba(80,80,80,0.5)"
                : "linear-gradient(135deg, #ffffff 0%, #ccddff 100%)"};
            border: 2px solid ${isDown ? "rgba(100,100,100,0.3)" : "rgba(60,120,255,0.7)"};
            box-shadow: ${isDown ? "none" : "0 1px 5px rgba(0,80,200,0.3)"};
        `;
        pinDots.appendChild(dot);
    });
}

// ===== ============================================================= =====
// ===== ガイドライン
// ===== ============================================================= =====
const guideGeo = new THREE.BufferGeometry();
const guideMat = new THREE.LineBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.6 });
const guideLine = new THREE.Line(guideGeo, guideMat);
scene.add(guideLine);

// ===== ============================================================= =====
// ===== カーブ物理（改善版：徐々に曲がる、直角防止）
// ===== ============================================================= =====
// カーブ力を「ボールの移動距離に応じて段々と増加」させる
// 序盤は弱く、中盤～後半にかけて強くなる自然な曲線

let ballTravelDistance = 0; // 投球後の移動距離

// ===== ============================================================= =====
// ===== update / animate
// ===== ============================================================= =====
function update() {
    if (gameState !== "playing") return;
    Engine.update(engine, 1000 / 60);

    // 未発射：プレイヤー位置追従
    if (!ballLaunched && ballBody && ballBody.speed < 0.05) {
        Body.setPosition(ballBody, { x: playerX, y: 8 });
        Body.setVelocity(ballBody, { x: 0, y: 0 });
    }

    // 投球後の処理
    if (ballLaunched && ballBody) {
        const by = ballBody.position.y;

        // ボールがピンエリア後方を通過 or ガター落下したらフラグ
        if (!ballPassedPins && (by < -8.0 || Math.abs(ballBody.position.x) > 3.4)) {
            ballPassedPins = true;
        }

        // フラグが立ったら1回だけスケジュール（二重呼び出し防止）
        if (ballPassedPins && !scoreCheckScheduled) {
            scoreCheckScheduled = true;
            scheduleCheckScore();
        }
    }

    // カーブ力（徐々に強くなる設計）
    if (ballLaunched && curveActive && !scored && ballBody) {
        const spd = Math.hypot(ballBody.velocity.x, ballBody.velocity.y);
        const bx  = ballBody.position.x;

        const inGutter = Math.abs(bx) > 3.0;
        if (inGutter) {
            Body.setVelocity(ballBody, { x: 0, y: ballBody.velocity.y });
            curveActive = false;
        } else if (spd > 0.04) {
            // 投球からの移動距離を積算（y方向のみ）
            ballTravelDistance += Math.abs(ballBody.velocity.y) * (1 / 60);

            // カーブ力は移動距離に応じて線形増加（最初は弱く、だんだん強く）
            // 最初の0〜3m：弱い、3m〜8m：中程度、8m以降：標準
            const travelRamp = Math.min(ballTravelDistance / 8.0, 1.0); // 0→1
            const smoothRamp = travelRamp * travelRamp; // イーズイン

            // 基本力（小さめ）＋ランプアップ
            const baseForce = 0.000008;
            const rampForce = smoothRamp * 0.000028;
            const force = curveAmount * (baseForce + rampForce);

            Body.applyForce(ballBody, ballBody.position, { x: force, y: 0 });

            // 場外防止
            if (bx < -3.6) Body.setPosition(ballBody, { x: -3.6, y: ballBody.position.y });
            if (bx >  3.6) Body.setPosition(ballBody, { x:  3.6, y: ballBody.position.y });
        } else {
            curveActive = false;
        }
    }

    // ボール3D同期
    if (ballGroup && ballBody) {
        ballGroup.position.set(ballBody.position.x, 0.32, ballBody.position.y);
        ballGroup.rotation.x += ballBody.velocity.y * 0.38;
        ballGroup.rotation.z -= ballBody.velocity.x * 0.38;
    }

    // ピン3D同期
    pins.forEach(p => {
        if (p.knocked) return;
        const moved = Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD;
        if (moved) {
            p.mesh.position.set(p.body.position.x, 0.14, p.body.position.y);
            p.mesh.rotation.set(Math.PI / 2, p.body.angle, 0);
        } else {
            p.mesh.position.set(p.body.position.x, 0, p.body.position.y);
            p.mesh.rotation.set(0, p.body.angle, 0);
        }
    });
    updatePinMap();

    // ガイドライン
    if (!ballLaunched) {
        ballTravelDistance = 0; // リセット
        const pts = [
            new THREE.Vector3(playerX, 0.32, 8),
            new THREE.Vector3(playerX + Math.sin(angle) * 6, 0.32, 8 - Math.cos(angle) * 6)
        ];
        guideGeo.setFromPoints(pts);
        guideGeo.computeBoundingSphere();
        guideLine.visible = true;
    } else {
        guideLine.visible = false;
    }
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

// ===== 初期化 =====
switchScreen("title");
animate();