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

// ===== ゲーム状態・ユーザー管理 =====
let gameState = "title";
let currentUser = "ゲスト";
let isPaused = false; // 一時停止フラグ

// UI要素の取得
const startScreen = document.getElementById("startScreen");
const instrScreen = document.getElementById("instrScreen");
const resultScreen = document.getElementById("resultScreen");
const gameUI = document.getElementById("gameUI");
const userModal = document.getElementById("userModal");
const pauseModal = document.getElementById("pauseModal");
const hudPauseBox = document.getElementById("hudPauseBox");
const wiiUserStatus = document.getElementById("wiiUserStatus");
const modalUserList = document.getElementById("modalUserList");
const newUserNameInput = document.getElementById("newUserNameInput");

// ===== 画面切り替え関数 =====
function switchScreen(to) {
    startScreen.classList.add("hidden");
    instrScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    gameUI.style.display = "none";
    hudPauseBox.style.display = "none";
    gameState = to;

    if (to === "title") {
        startScreen.classList.remove("hidden");
        loadUserStatus();
    } else if (to === "howto") {
        instrScreen.classList.remove("hidden");
    } else if (to === "playing") {
        gameUI.style.display = "block";
        hudPauseBox.style.display = "block";
        startNewGame();
    } else if (to === "result") {
        resultScreen.classList.remove("hidden");
    }
}

// ===== ユーザー管理ロジック (AIT.Sports 全体で完全に共有) =====
function loadUserStatus() {
    let localData = localStorage.getItem("wii_sports_theme_data");
    if (localData) {
        const data = JSON.parse(localData);
        if (data.currentUser) currentUser = data.currentUser;
    }
    wiiUserStatus.textContent = "選択中: " + currentUser;
}

function openUserModal() {
    let localData = localStorage.getItem("wii_sports_theme_data");
    let data = localData ? JSON.parse(localData) : { currentUser: "ゲスト", users: { "ゲスト": { bowling_score: 0, bowling_rank: "D" } } };
    
    modalUserList.innerHTML = "";
    Object.keys(data.users).forEach(user => {
        const btn = document.createElement('button');
        btn.className = "user-item-btn" + (user === currentUser ? " active" : "");
        const bScore = data.users[user].bowling_score || 0;
        const bRank = data.users[user].bowling_rank || 'D';
        btn.textContent = `👤 ${user} (Best: ${bScore}点 / Rank ${bRank})`;
        btn.onclick = function() { selectUser(user); };
        modalUserList.appendChild(btn);
    });
    userModal.classList.add('show');
}

function closeUserModal() {
    userModal.classList.remove('show');
    newUserNameInput.value = "";
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
    let name = newUserNameInput.value.trim();
    if (name === "") return;
    
    let localData = localStorage.getItem("wii_sports_theme_data");
    let data = localData ? JSON.parse(localData) : { currentUser: "ゲスト", users: {} };
    
    if (data.users[name]) {
        alert("その名前はすでに登録されています。");
        return;
    }
    
    data.users[name] = data.users[name] || {};
    data.users[name].bowling_score = 0;
    data.users[name].bowling_rank = "D";
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
    const currentBest = data.users[currentUser].bowling_score || 0;
    if (finalScore > currentBest) {
        data.users[currentUser].bowling_score = finalScore;
        data.users[currentUser].bowling_rank = finalRank;
        localStorage.setItem("wii_sports_theme_data", JSON.stringify(data));
    }
}

// ===== 一時停止（ポーズ）システムロジック =====
function pauseGame() {
    if (gameState !== "playing" || scored || ballLaunched) return; // 投球中やリザルト演出中はポーズ不可
    isPaused = true;
    pauseModal.classList.add("show");
}

function resumeGame() {
    isPaused = false;
    pauseModal.classList.remove("show");
}

function restartGameFromPause() {
    isPaused = false;
    pauseModal.classList.remove("show");
    switchScreen("playing");
}

function showInstrFromPause() {
    // ポーズポップアップが被らないように一旦非表示にする
    pauseModal.classList.remove("show");
    hudPauseBox.style.display = "none";
    gameUI.style.display = "none";

    const mainAction = document.getElementById("instrStartBtn");
    const backAction = document.getElementById("instrBackBtn");

    mainAction.textContent = "ゲームに戻る";
    mainAction.onclick = function() {
        instrScreen.classList.add("hidden");
        gameUI.style.display = "block";
        hudPauseBox.style.display = "block";
        resumeGame();
    };

    backAction.onclick = function() {
        instrScreen.classList.add("hidden");
        pauseModal.classList.add("show");
    };

    instrScreen.classList.remove("hidden");
}

function exitToHome() {
    isPaused = false;
    pauseModal.classList.remove("show");
    location.href = '../Home/home.html';
}

// イベントリスナーの紐付け
document.getElementById("startPlayBtn").addEventListener("click", () => switchScreen("playing"));
document.getElementById("startInstrBtn").addEventListener("click", () => {
    // 通常タイトルから遷移する際の設定に戻す
    const mainAction = document.getElementById("instrStartBtn");
    const backAction = document.getElementById("instrBackBtn");
    mainAction.textContent = "スタート";
    mainAction.onclick = () => switchScreen("playing");
    backAction.onclick = () => switchScreen("title");
    switchScreen("howto");
});
document.getElementById("modalTriggerBtn").addEventListener("click", openUserModal);
document.getElementById("closeUserModalBtn").addEventListener("click", closeUserModal);
document.getElementById("addUserBtn").addEventListener("click", addAndSelectNewUser);

// ポーズモーダルボタンの紐付け
document.getElementById("pauseTriggerBtn").addEventListener("click", pauseGame);
document.getElementById("resumeGameBtn").addEventListener("click", resumeGame);
document.getElementById("restartGameBtn").addEventListener("click", restartGameFromPause);
document.getElementById("showInstrBtn").addEventListener("click", showInstrFromPause);
document.getElementById("exitToHomeBtn").addEventListener("click", exitToHome);

window.addEventListener('DOMContentLoaded', loadUserStatus);

// ===== ライト・環境 =====
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xfffaf0, 1.4);
dirLight.position.set(4, 16, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0xb0d0ff, 0.4);
fillLight.position.set(-6, 6, 4);
scene.add(fillLight);

scene.fog = new THREE.Fog(0x8899aa, 35, 60);
scene.background = new THREE.Color(0x3a3a3a);

// ===== テクスチャ・レーン生成 =====
const texLoader = new THREE.TextureLoader();
const sharedGroundTex = texLoader.load("img/parking.jpeg", tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 4.0);
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshPhongMaterial({ map: sharedGroundTex, shininess: 8, color: 0xb8b8b8 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, -10); ground.receiveShadow = true; scene.add(ground);

const laneTex = texLoader.load("img/parking.jpeg", tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(0.225, 1.8); tex.offset.set(0.38, 0);
});
const lane = new THREE.Mesh(new THREE.PlaneGeometry(6, 36), new THREE.MeshPhongMaterial({ map: laneTex, shininess: 18, color: 0xcccccc }));
lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0.001, -3); lane.receiveShadow = true; scene.add(lane);

const backWallTex = texLoader.load("img/parking.jpeg", tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1.2, 0.36); tex.offset.set(0, 0.58);
});
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(80, 18), new THREE.MeshPhongMaterial({ map: backWallTex, shininess: 4, color: 0xaaaaaa }));
backWall.position.set(0, 8, -42); scene.add(backWall);

[-3.6, 3.6].forEach(x => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 36), new THREE.MeshPhongMaterial({ color: 0x555544, shininess: 8 }));
    g.rotation.x = -Math.PI / 2; g.position.set(x, 0.0, -3); scene.add(g);
});
[-4.05, 4.05].forEach(x => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 36), new THREE.MeshPhongMaterial({ color: 0x223344, transparent: true, opacity: 0.45, shininess: 90 }));
    w.position.set(x, 0.55, -3); w.castShadow = true; scene.add(w);
});
const foulLine = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.07), new THREE.MeshBasicMaterial({ color: 0xff2200 }));
foulLine.rotation.x = -Math.PI / 2; foulLine.position.set(0, 0.01, 7); scene.add(foulLine);

// ===== ボール・物理定義 =====
let ballBody, ballGroup, curveAmount = 0, curveActive = false;
function createBall() {
    if (ballBody) World.remove(world, ballBody);
    if (ballGroup) scene.remove(ballGroup);
    ballBody = Bodies.circle(playerX, 8, 0.32, { restitution: 0.2, frictionAir: 0.008, friction: 0.04, density: 0.08, label: "ball" });
    World.add(world, ballBody);
    ballGroup = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 48, 48), new THREE.MeshPhongMaterial({ color: 0x080810, shininess: 240, specular: new THREE.Color(0x3355ff) }));
    ballGroup.add(core);
    for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(0.323, 0.015, 8, 64), new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.85 }));
        m.rotation.set(Math.PI / 2, (i * Math.PI * 2) / 3, 0.65); ballGroup.add(m);
    }
    const holeMat = new THREE.MeshPhongMaterial({ color: 0x020205 });
    [[0.17, 0.25, 0.16], [-0.04, 0.30, 0.16], [-0.18, 0.21, 0.19]].forEach(([x, y, z]) => {
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), holeMat); h.position.set(x, y, z); ballGroup.add(h);
    });
    ballGroup.castShadow = true; scene.add(ballGroup);
}

// ===== ピン定義 =====
let pins = [];
const PIN_POSITIONS = [
    [0, -4.5], [-0.55, -5.5], [0.55, -5.5], [-1.1, -6.5], [0, -6.5], [1.1, -6.5], [-1.65, -7.5], [-0.55, -7.5], [0.55, -7.5], [1.65, -7.5]
];
function createPinMesh() {
    const g = new THREE.Group(); const white = new THREE.MeshPhongMaterial({ color: 0xf0f0f0, shininess: 110 }); const red = new THREE.MeshPhongMaterial({ color: 0xcc1111, shininess: 70 });
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.27, 0.52, 22), white); b1.position.y = 0.26; b1.castShadow = true; g.add(b1);
    const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.08, 22), red); r1.position.y = 0.56; g.add(r1);
    const n1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.168, 0.11, 22), white); n1.position.y = 0.665; g.add(n1);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 22, 22), white); head.position.y = 0.99; head.castShadow = true; g.add(head);
    return g;
}
function createPins() {
    pins.forEach(p => { World.remove(world, p.body); scene.remove(p.mesh); }); pins = [];
    PIN_POSITIONS.forEach(([px, pz]) => {
        const body = Bodies.circle(px, pz, 0.21, { restitution: 0.6, friction: 0.04, frictionAir: 0.016, density: 0.03, label: "pin" });
        World.add(world, body); const mesh = createPinMesh(); scene.add(mesh);
        pins.push({ body, mesh, startX: px, startZ: pz, knocked: false });
    });
    updatePinMap();
}

// 衝突判定
Events.on(engine, "collisionStart", ev => {
    ev.pairs.forEach(({ bodyA, bodyB }) => {
        const isPin = b => b.label === "pin"; const isBall = b => b.label === "ball";
        if ((isBall(bodyA) && isPin(bodyB)) || (isBall(bodyB) && isPin(bodyA))) {
            const pin = isPin(bodyA) ? bodyA : bodyB; const ball = isPin(bodyA) ? bodyB : bodyA;
            const dx = pin.position.x - ball.position.x; const dy = pin.position.y - ball.position.y; const d = Math.hypot(dx, dy) || 1;
            const spd = Math.hypot(ball.velocity.x, ball.velocity.y);
            Body.applyForce(pin, pin.position, { x: (dx/d)*(0.015+spd*0.006) + ball.velocity.x*0.18, y: (dy/d)*(0.015+spd*0.006) });
        }
        if (isPin(bodyA) && isPin(bodyB)) {
            const dx = bodyB.position.x - bodyA.position.x; const dy = bodyB.position.y - bodyA.position.y; const d = Math.hypot(dx, dy) || 1;
            const spd = Math.hypot(bodyA.velocity.x, bodyA.velocity.y) + Math.hypot(bodyB.velocity.x, bodyB.velocity.y);
            const f = spd * 0.006; Body.applyForce(bodyB, bodyB.position, { x: dx/d*f, y: dy/d*f }); Body.applyForce(bodyA, bodyA.position, { x: -dx/d*f, y: -dy/d*f });
        }
    });
});

// ===== 操作系 =====
let playerX = 0, angle = 0, startMouseX, startMouseY, scored = false, ballLaunched = false, ballPassedPins = false, scoreCheckScheduled = false;
document.addEventListener("mousedown", e => { 
    if (gameState !== "playing" || isPaused) return; 
    if (e.target.id === "pauseTriggerBtn") return; // ポーズボタン自体のクリック時は弾く
    startMouseX = e.clientX; startMouseY = e.clientY; scored = false; ballLaunched = false; 
});
document.addEventListener("mouseup", e => {
    if (gameState !== "playing" || scored || isPaused) return;
    if (e.target.id === "pauseTriggerBtn") return;
    const rawDx = Math.max(-280, Math.min(280, e.clientX - startMouseX)); const rawDy = Math.max(-380, Math.min(380, startMouseY - e.clientY));
    let vx = rawDx * 0.00020 + Math.sin(angle) * 0.18; let vy = -(rawDy * 0.0036) - Math.cos(angle) * 0.18;
    if (Math.abs(vy) < 0.1) return;
    Body.setPosition(ballBody, { x: playerX, y: 8 }); Body.setVelocity(ballBody, { x: vx + curveAmount * 0.06, y: vy });
    curveActive = true; ballLaunched = true; ballPassedPins = false; scoreCheckScheduled = false;
    hudPauseBox.style.display = "none"; // 投球中は一時停止不可
});
document.addEventListener("keydown", e => {
    if (gameState !== "playing" || isPaused) return;
    if (e.key === "ArrowLeft") playerX = Math.max(-2.2, playerX - 0.38); if (e.key === "ArrowRight") playerX = Math.min(2.2, playerX + 0.38);
    if (e.key === "a" || e.key === "A") angle = Math.max(-0.48, angle - 0.07); if (e.key === "d" || e.key === "D") angle = Math.min(0.48, angle + 0.07);
    if (e.key === "q" || e.key === "Q") curveAmount = Math.max(-1, curveAmount - 0.2); if (e.key === "e" || e.key === "E") curveAmount = Math.min(1, curveAmount + 0.2);
    if (e.key === "r" || e.key === "R") curveAmount = 0;
    updateCurveUI();
});

function updateCurveUI() {
    const fill = document.getElementById("curveFill"); const label = document.getElementById("curveLabel"); if (!fill) return;
    if (curveAmount === 0) { fill.style.left = "50%"; fill.style.width = "0%"; label.textContent = "NONE"; label.style.color = "#fff"; }
    else if (curveAmount > 0) { fill.style.left = "50%"; fill.style.width = (curveAmount * 50) + "%"; label.textContent = "R +" + Math.round(curveAmount * 100) + "%"; label.style.color = "#ff8833"; }
    else { const w = -curveAmount * 50; fill.style.left = (50 - w) + "%"; fill.style.width = w + "%"; label.textContent = "L +" + Math.round(-curveAmount * 100) + "%"; label.style.color = "#33bbff"; }
}

// ===== スコア算出ロジック =====
let frame = 1, throwCount = 1, firstThrowKnocked = 0, frameData = [];
function calcCumulative() {
    const result = new Array(10).fill(null); let total = 0;
    for (let i = 0; i < frameData.length && i < 10; i++) {
        const f = frameData[i]; if (!f || f.length === 0) break;
        if (i === 9) {
            if (f.length < ((f[0] === 10 || (f.length > 1 && f[0] + f[1] === 10)) ? 3 : 2)) break;
            total += f.reduce((a, b) => a + b, 0);
        } else if (f[0] === 10) {
            const next = frameData[i + 1]; if (!next || next.length === 0) break;
            let b2 = (next[0] === 10 && i + 1 < 9) ? (frameData[i + 2]?.[0] ?? 0) : (next[1] ?? 0);
            if (next[0] !== 10 && next.length < 2) break;
            total += 10 + next[0] + b2;
        } else if (f.length > 1 && f[0] + f[1] === 10) {
            if (!frameData[i + 1] || frameData[i + 1].length === 0) break;
            total += 10 + frameData[i + 1][0];
        } else {
            if (f.length < 2) break; total += f[0] + f[1];
        }
        result[i] = total;
    }
    return result;
}

function drawFrameBoard() {
    const cum = calcCumulative(); const framesRow = document.getElementById("framesRow"); if (!framesRow) return;
    framesRow.innerHTML = "";
    for (let i = 0; i < 10; i++) {
        const f = frameData[i] || []; const is10 = i === 9; const isCur = i === frame - 1;
        const box = document.createElement("div");
        box.style.cssText = `width:${is10 ? "50px" : "38px"}; background:${isCur ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)"}; border:1px solid rgba(255,255,255,0.3); border-radius:4px; text-align:center; font-family:'Barlow Condensed',sans-serif;`;
        const tr = document.createElement("div"); tr.style.cssText = "display:flex; border-bottom:1px solid rgba(255,255,255,0.2); font-size:10px;";
        const cell = (h) => { const c = document.createElement("div"); c.style.cssText = "flex:1; padding:1px 0;"; c.innerHTML = h; return c; };
        if (is10) { [0, 1, 2].forEach(k => tr.appendChild(cell(sym10(f, k)))); } else { const s = symNormal(f); tr.appendChild(cell(s[0])); tr.appendChild(cell(s[1])); }
        const sc = document.createElement("div"); sc.style.cssText = "font-size:11px; font-weight:900; min-height:14px;"; sc.textContent = cum[i] !== null ? cum[i] : "";
        box.appendChild(tr); box.appendChild(sc); framesRow.appendChild(box);
    }
    const last = cum.filter(v => v !== null).pop(); document.getElementById("totalScore").textContent = "TOTAL: " + (last ?? 0);
}
function symNormal(f) {
    if (f[0] === 10) return ["", "X"];
    return [f[0] !== undefined ? (f[0] === 0 ? "-" : f[0]) : "", f[1] !== undefined ? (f[0] + f[1] === 10 ? "/" : (f[1] === 0 ? "-" : f[1])) : ""];
}
function sym10(f, idx) {
    const v = f[idx]; if (v === undefined) return "";
    if (idx === 0) return v === 10 ? "X" : (v === 0 ? "-" : v);
    if (idx === 1) return f[0] === 10 ? (v === 10 ? "X" : (v === 0 ? "-" : v)) : (f[0] + v === 10 ? "/" : (v === 0 ? "-" : v));
    if (idx === 2) return v === 10 ? "X" : (f[0] === 10 && f[1] !== 10 && f[1] + v === 10 ? "/" : (v === 0 ? "-" : v));
    return "";
}

// ===== 演出オーバーレイ設定 =====
const eventOverlay = document.getElementById("eventOverlay");
const eventText = document.getElementById("eventText");
function showEvent(type) {
    eventOverlay.style.opacity = "1"; eventText.style.animation = ""; void eventText.offsetWidth;
    if (type === "strike") {
        eventText.style.animation = "strikeIn 0.45s cubic-bezier(0.2,0.8,0.3,1.1) forwards";
        eventText.innerHTML = `<div style="font-size:64px;">🎳</div><div style="font-size:72px; font-weight:900; color:#fff; text-shadow:0 0 20px #ffaa00;">STRIKE!</div>`;
    } else if (type === "spare") {
        eventText.style.animation = "strikeIn 0.45s forwards";
        eventText.innerHTML = `<div style="font-size:54px;">⭐</div><div style="font-size:64px; font-weight:900; color:#fff; text-shadow:0 0 20px #00ccff;">SPARE!</div>`;
    } else if (type === "gutter") {
        eventText.innerHTML = `<div style="font-size:44px; font-weight:900; color:#aaa;">GUTTER...</div>`;
    }
    clearTimeout(eventOverlay._timer); eventOverlay._timer = setTimeout(() => { eventOverlay.style.opacity = "0"; }, 1600);
}

// ===== スコアチェック判定と進行 =====
const KNOCK_THRESHOLD = 0.52; let scoreCheckTimer = null;
function countKnocked() { return pins.filter(p => Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD).length; }
function removeKnockedPins() {
    pins.forEach(p => { if (Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD && !p.knocked) { p.knocked = true; World.remove(world, p.body); scene.remove(p.mesh); } });
}
function scheduleCheckScore() {
    if (scored) return; clearInterval(scoreCheckTimer); let elapsed = 0;
    scoreCheckTimer = setInterval(() => {
        if (isPaused) return; // ポーズ中はタイマーをストップ
        elapsed += 60;
        const settled = pins.every(p => p.knocked || Math.hypot(p.body.velocity.x, p.body.velocity.y) < 0.025);
        if (settled || elapsed >= 2000) { clearInterval(scoreCheckTimer); checkScore(); }
    }, 60);
}

function checkScore() {
    if (scored) return; scored = true; ballLaunched = false; curveActive = false;
    const fi = frame - 1; if (!frameData[fi]) frameData[fi] = [];
    const totalKnocked = countKnocked(); const thisThrow = throwCount === 1 ? totalKnocked : totalKnocked - firstThrowKnocked;
    frameData[fi].push(thisThrow);

    if (frame === 10) {
        handle10thFrame(frameData[fi], totalKnocked);
    } else {
        if (throwCount === 1) {
            firstThrowKnocked = totalKnocked;
            if (thisThrow === 10) {
                showEvent("strike"); drawFrameBoard(); setTimeout(() => { removeKnockedPins(); nextFrame(); }, 1600);
            } else {
                if (thisThrow === 0) showEvent("gutter");
                document.getElementById("msgBox").textContent = thisThrow + " PINS";
                throwCount = 2; document.getElementById("throwLabel").textContent = "2ND THROW";
                drawFrameBoard(); setTimeout(() => { removeKnockedPins(); updatePinMap(); createBall(); scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false; if(!isPaused) hudPauseBox.style.display = "block"; }, 1600);
            }
        } else {
            if (frameData[fi][0] + frameData[fi][1] === 10) showEvent("spare");
            drawFrameBoard(); setTimeout(() => { removeKnockedPins(); nextFrame(); }, 1600);
        }
    }
}

function handle10thFrame(f, totalKnocked) {
    const need = (f[0] === 10 || (f.length > 1 && f[0] + f[1] === 10)) ? 3 : 2;
    if (f.length === 1) {
        firstThrowKnocked = f[0] === 10 ? 0 : totalKnocked;
        showEvent(f[0] === 10 ? "strike" : "");
        throwCount = 2; document.getElementById("throwLabel").textContent = "2ND THROW";
        drawFrameBoard(); setTimeout(() => { if (f[0] === 10) { createPins(); } else { removeKnockedPins(); updatePinMap(); } createBall(); scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false; if(!isPaused) hudPauseBox.style.display = "block"; }, 1600);
    } else if (f.length === 2) {
        if (need === 3) {
            showEvent(f[1] === 10 || f[0]+f[1] === 10 ? (f[1]===10?"strike":"spare") : "");
            throwCount = 3; document.getElementById("throwLabel").textContent = "3RD THROW";
            drawFrameBoard(); setTimeout(() => { if (f[1] === 10 || f[0]+f[1]===10) createPins(); else removeKnockedPins(); createBall(); scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false; if(!isPaused) hudPauseBox.style.display = "block"; }, 1600);
        } else {
            drawFrameBoard(); setTimeout(() => { removeKnockedPins(); endGame(); }, 1600);
        }
    } else if (f.length === 3) {
        drawFrameBoard(); setTimeout(() => { removeKnockedPins(); endGame(); }, 1600);
    }
}

function nextFrame() {
    frame++; throwCount = 1; firstThrowKnocked = 0;
    if (frame > 10) { endGame(); return; }
    document.getElementById("frameLabel").textContent = "FRAME " + frame; document.getElementById("throwLabel").textContent = "1ST THROW";
    document.getElementById("msgBox").textContent = "";
    setTimeout(() => { createBall(); createPins(); scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false; if(!isPaused) hudPauseBox.style.display = "block"; }, 400);
}

function endGame() {
    const cum = calcCumulative(); const finalScore = cum.filter(v => v !== null).pop() ?? 0;
    
    const rankTable = [
        [220, "S", "rank-s", "神話級の腕前！完全なるストライクマスターです！"],
        [160, "A", "rank-a", "素晴らしい！安定したコントロールで見事なスコアです！"],
        [110, "B", "rank-b", "グッジョブ！スペアを確実に拾う適応力があります。"],
        [60,  "C", "rank-c", "フックの軌道を計算して、ポケット（中心）を狙ってみよう。"],
        [0,   "D", "rank-d", "どんまい！まずはガターに落とさない直線エイムを意識しよう！"]
    ];
    const [ , rank, rankClass, comment] = rankTable.find(([t]) => finalScore >= t);

    document.getElementById("resultScore").textContent = finalScore;
    const rRank = document.getElementById("resultRank");
    rRank.className = "result-rank " + rankClass;
    rRank.textContent = "RANK " + rank;
    document.getElementById("resultComment").textContent = comment;

    const rf = document.getElementById("resultFrames"); rf.innerHTML = "";
    for (let i = 0; i < 10; i++) {
        const f = frameData[i] || []; const is10 = i === 9;
        const box = document.createElement("div"); box.style.cssText = `background:rgba(28,78,77,0.06); border:1px solid #1c4e4d; border-radius:4px; width:${is10?"42px":"32px"}; text-align:center; font-size:11px; font-family:sans-serif; color:#1c4e4d;`;
        const sc = document.createElement("div"); sc.style.cssText = "font-weight:900;"; sc.textContent = cum[i] !== null ? cum[i] : "";
        box.innerHTML = `<div style="font-size:8px; border-bottom:1px solid #1c4e4d; min-height:12px;">${is10?sym10(f,0)+sym10(f,1):symNormal(f).join("")}</div>`;
        box.appendChild(sc); rf.appendChild(box);
    }

    saveGameResult(finalScore, rank);
    switchScreen("result");
}

function startNewGame() {
    frame = 1; throwCount = 1; firstThrowKnocked = 0; frameData = []; scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false; curveAmount = 0; angle = 0; playerX = 0; isPaused = false;
    document.getElementById("frameLabel").textContent = "FRAME 1"; document.getElementById("throwLabel").textContent = "1ST THROW"; document.getElementById("msgBox").textContent = "";
    updateCurveUI(); drawFrameBoard(); createBall(); createPins();
}

// リザルト・リトライボタン設定
document.getElementById("resultRetryBtn").onclick = () => switchScreen("playing");
document.getElementById("resultTitleBtn").onclick = () => switchScreen("title");

// ===== ピンマップHUD更新 =====
function updatePinMap() {
    const pinDots = document.getElementById("pinDots"); if (!pinDots) return; pinDots.innerHTML = "";
    const mapPos = [{x:70,y:110},{x:52,y:82},{x:88,y:82},{x:34,y:54},{x:70,y:54},{x:106,y:54},{x:16,y:26},{x:52,y:26},{x:88,y:26},{x:124,y:26}];
    pins.forEach((p, i) => {
        const isDown = p.knocked || Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD;
        const dot = document.createElement("div");
        dot.style.cssText = `position:absolute; left:${mapPos[i].x}px; top:${mapPos[i].y}px; width:14px; height:14px; border-radius:50%; transform:translate(-50%,-50%); opacity:${isDown?"0.2":"1"}; background:${isDown?"#777":"#fff"}; border:2px solid #ffe066;`;
        pinDots.appendChild(dot);
    });
}

// ===== ガイドライン・物理アップデート =====
const guideGeo = new THREE.BufferGeometry();
const guideLine = new THREE.Line(guideGeo, new THREE.LineBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.6 }));
scene.add(guideLine);
let ballTravelDistance = 0;

function update() {
    if (gameState !== "playing" || isPaused) return; // ポーズ中は物理エンジンの更新処理などを完全にストップ
    Engine.update(engine, 1000 / 60);
    if (!ballLaunched && ballBody) { Body.setPosition(ballBody, { x: playerX, y: 8 }); Body.setVelocity(ballBody, { x: 0, y: 0 }); }
    if (ballLaunched && ballBody) {
        if (!ballPassedPins && (ballBody.position.y < -8.0 || Math.abs(ballBody.position.x) > 3.4)) ballPassedPins = true;
        if (ballPassedPins && !scoreCheckScheduled) { scoreCheckScheduled = true; scheduleCheckScore(); }
    }
    if (ballLaunched && curveActive && !scored && ballBody) {
        const spd = Math.hypot(ballBody.velocity.x, ballBody.velocity.y);
        if (Math.abs(ballBody.position.x) > 3.0) { curveActive = false; }
        else if (spd > 0.04) {
            ballTravelDistance += Math.abs(ballBody.velocity.y) * (1 / 60);
            const ramp = Math.min(ballTravelDistance / 8.0, 1.0);
            Body.applyForce(ballBody, ballBody.position, { x: curveAmount * (0.000008 + (ramp * ramp) * 0.000028), y: 0 });
        }
    }
    if (ballGroup && ballBody) { ballGroup.position.set(ballBody.position.x, 0.32, ballBody.position.y); ballGroup.rotation.x += ballBody.velocity.y * 0.38; ballGroup.rotation.z -= ballBody.velocity.x * 0.38; }
    pins.forEach(p => {
        if (p.knocked) return;
        const moved = Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD;
        p.mesh.position.set(p.body.position.x, moved ? 0.14 : 0, p.body.position.y); p.mesh.rotation.set(moved ? Math.PI / 2 : 0, p.body.angle, 0);
    });
    updatePinMap();
    if (!ballLaunched) {
        ballTravelDistance = 0; const pts = [new THREE.Vector3(playerX, 0.32, 8), new THREE.Vector3(playerX + Math.sin(angle) * 6, 0.32, 8 - Math.cos(angle) * 6)];
        guideGeo.setFromPoints(pts); guideGeo.computeBoundingSphere(); guideLine.visible = true;
    } else { guideLine.visible = false; }
}

function animate() { requestAnimationFrame(animate); update(); renderer.render(scene, camera); }
switchScreen("title"); animate();