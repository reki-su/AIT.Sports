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
camera.lookAt(0, 3, -4);

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
let isPaused = false;

// ===== DOM要素取得 =====
const startScreen      = document.getElementById("startScreen");
const instrScreen      = document.getElementById("instrScreen");
const resultScreen     = document.getElementById("resultScreen");
const gameUI           = document.getElementById("gameUI");
const userModal        = document.getElementById("userModal");
const pauseModal       = document.getElementById("pauseModal");
const hudPauseBox      = document.getElementById("hudPauseBox");
const wiiUserStatus    = document.getElementById("wiiUserStatus");
const modalUserList    = document.getElementById("modalUserList");
const newUserNameInput = document.getElementById("newUserNameInput");

// ===== 画面切り替え =====
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

// ===== ユーザー管理 =====
function loadUserStatus() {
    const localData = localStorage.getItem("wii_sports_theme_data");
    if (localData) {
        const data = JSON.parse(localData);
        if (data.currentUser) currentUser = data.currentUser;
    }
    if (wiiUserStatus) wiiUserStatus.textContent = "選択中: " + currentUser;
}

function openUserModal() {
    const localData = localStorage.getItem("wii_sports_theme_data");
    const data = localData ? JSON.parse(localData) : {
        currentUser: "ゲスト",
        users: { "ゲスト": { bowling_score: 0, bowling_rank: "D" } }
    };
    if (!data.users["ゲスト"]) data.users["ゲスト"] = { bowling_score: 0, bowling_rank: "D" };

    modalUserList.innerHTML = "";
    Object.keys(data.users).forEach(user => {
        const btn = document.createElement("button");
        btn.className = "user-item-btn" + (user === currentUser ? " active" : "");
        const bScore = data.users[user].bowling_score || 0;
        const bRank  = data.users[user].bowling_rank  || "D";
        btn.textContent = `👤 ${user}  (Best: ${bScore}点 / Rank ${bRank})`;
        btn.onclick = () => selectUser(user);
        modalUserList.appendChild(btn);
    });
    userModal.classList.add("show");
}

function closeUserModal() {
    userModal.classList.remove("show");
    if (newUserNameInput) newUserNameInput.value = "";
}

function selectUser(name) {
    const localData = localStorage.getItem("wii_sports_theme_data");
    const data = JSON.parse(localData);
    data.currentUser = name;
    localStorage.setItem("wii_sports_theme_data", JSON.stringify(data));
    currentUser = name;
    loadUserStatus();
    closeUserModal();
}

function addAndSelectNewUser() {
    const name = newUserNameInput ? newUserNameInput.value.trim() : "";
    if (name === "") return;

    const localData = localStorage.getItem("wii_sports_theme_data");
    const data = localData ? JSON.parse(localData) : {
        currentUser: "ゲスト",
        users: { "ゲスト": { bowling_score: 0, bowling_rank: "D" } }
    };

    if (data.users[name]) { alert("その名前はすでに登録されています。"); return; }
    data.users[name] = { bowling_score: 0, bowling_rank: "D" };
    data.currentUser = name;
    localStorage.setItem("wii_sports_theme_data", JSON.stringify(data));
    currentUser = name;
    loadUserStatus();
    closeUserModal();
}

function saveGameResult(finalScore, finalRank) {
    const localData = localStorage.getItem("wii_sports_theme_data");
    const data = localData ? JSON.parse(localData) : {
        currentUser: "ゲスト",
        users: { "ゲスト": { bowling_score: 0, bowling_rank: "D" } }
    };
    if (!data.users[currentUser]) data.users[currentUser] = {};
    const currentBest = data.users[currentUser].bowling_score || 0;
    if (finalScore > currentBest) {
        data.users[currentUser].bowling_score = finalScore;
        data.users[currentUser].bowling_rank  = finalRank;
        localStorage.setItem("wii_sports_theme_data", JSON.stringify(data));
    }
}

(function initStorage() {
    const localData = localStorage.getItem("wii_sports_theme_data");
    if (!localData) {
        localStorage.setItem("wii_sports_theme_data", JSON.stringify({
            currentUser: "ゲスト",
            users: { "ゲスト": { bowling_score: 0, bowling_rank: "D" } }
        }));
    }
})();

// ===== ポーズシステム =====
function pauseGame() {
    if (gameState !== "playing" || scored || ballLaunched) return;
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
    pauseModal.classList.remove("show");
    hudPauseBox.style.display = "none";
    gameUI.style.display = "none";

    const mainAction = document.getElementById("instrStartBtn");
    const backAction = document.getElementById("instrBackBtn");

    mainAction.textContent = "ゲームに戻る";
    mainAction.onclick = () => {
        instrScreen.classList.add("hidden");
        gameUI.style.display = "block";
        hudPauseBox.style.display = "block";
        resumeGame();
    };
    backAction.onclick = () => {
        instrScreen.classList.add("hidden");
        pauseModal.classList.add("show");
    };
    instrScreen.classList.remove("hidden");
}

function exitToHome() {
    isPaused = false;
    pauseModal.classList.remove("show");
    location.href = "../Home/home.html";
}

// ===== イベントリスナー =====
document.getElementById("startPlayBtn").addEventListener("click", () => switchScreen("playing"));
document.getElementById("startInstrBtn").addEventListener("click", () => {
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
document.getElementById("pauseTriggerBtn").addEventListener("click", pauseGame);
document.getElementById("resumeGameBtn").addEventListener("click", resumeGame);
document.getElementById("restartGameBtn").addEventListener("click", restartGameFromPause);
document.getElementById("showInstrBtn").addEventListener("click", showInstrFromPause);
document.getElementById("exitToHomeBtn").addEventListener("click", exitToHome);
document.getElementById("resultRetryBtn").addEventListener("click", () => switchScreen("playing"));
document.getElementById("resultTitleBtn").addEventListener("click", () => switchScreen("title"));

window.addEventListener("DOMContentLoaded", loadUserStatus);

// ===== ライト =====
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xfffaf0, 1.4);
dirLight.position.set(4, 16, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0xb0d0ff, 0.4);
fillLight.position.set(-6, 6, 4);
scene.add(fillLight);

scene.fog = null;

// ===== 背景テクスチャ =====
const texLoader = new THREE.TextureLoader();
texLoader.load("img/parking.jpeg", tex => {
    scene.background = tex;
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshPhongMaterial({ map: sharedGroundTex, shininess: 8, color: 0xb8b8b8 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, -10); ground.receiveShadow = true; scene.add(ground);

// ===== レーン白線 =====
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
[-4.5, 3.9].forEach(x => {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 42), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.003, -7);
    scene.add(line);
});

// ===== ガター =====
const gutterMat = new THREE.MeshPhongMaterial({ color: 0x333322, shininess: 4 });
[-5.1, 4.5].forEach(x => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 38), gutterMat);
    g.rotation.x = -Math.PI / 2;
    g.position.set(x, 0.0, -9);
    scene.add(g);
});

// ===== 壁 =====
const wallMat = new THREE.MeshPhongMaterial({ color: 0x111122, transparent: true, opacity: 0.20, shininess: 60 });
[-5.5, 4.9].forEach(x => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 38), wallMat);
    w.position.set(x, 0.5, -9);
    w.castShadow = true;
    scene.add(w);
});
const foulLine = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.07), new THREE.MeshBasicMaterial({ color: 0xff2200 }));
foulLine.rotation.x = -Math.PI / 2; foulLine.position.set(0, 0.01, 7); scene.add(foulLine);

// ===== ファウルライン =====
const foulLine = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 0.07),
    new THREE.MeshBasicMaterial({ color: 0xff2200 })
);
foulLine.rotation.x = -Math.PI / 2;
foulLine.position.set(0, 0.01, 5);
scene.add(foulLine);

// ===== ボール =====
let ballBody, ballGroup;
let curveAmount = 0;
let curveActive = false;
let ballInGutter = false;
let ballGutterX  = 0;

function createBall() {
    if (ballBody) World.remove(world, ballBody);
    if (ballGroup) scene.remove(ballGroup);
    ballInGutter = false;
    ballGutterX  = 0;

    ballBody = Bodies.circle(playerX, 6, 0.32, {
        restitution: 0.2, frictionAir: 0.008,
        friction: 0.04, density: 0.08, label: "ball"
    });
    World.add(world, ballBody);
    ballGroup = new THREE.Group();
    const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.50, 48, 48),
        new THREE.MeshPhongMaterial({ color: 0x080810, shininess: 240, specular: new THREE.Color(0x3355ff) })
    );
    ballGroup.add(core);
    for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(0.503, 0.015, 8, 64), lMat1);
        m.rotation.set(Math.PI / 2, (i * Math.PI * 2) / 3, 0.65);
        ballGroup.add(m);
    }

    const lMat2 = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.7 });
    const lm2 = new THREE.Mesh(new THREE.TorusGeometry(0.506, 0.008, 8, 64), lMat2);
    lm2.rotation.set(Math.PI / 3, 0, Math.PI / 4);
    ballGroup.add(lm2);

    const holeMat = new THREE.MeshPhongMaterial({ color: 0x020205 });
    [[0.17, 0.25, 0.16], [-0.04, 0.30, 0.16], [-0.18, 0.21, 0.19]].forEach(([x, y, z]) => {
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), holeMat); h.position.set(x, y, z); ballGroup.add(h);
    });
    ballGroup.castShadow = true; scene.add(ballGroup);
}

// ===== ピン =====
let pins = [];
const PIN_POSITIONS = [
    [0,      -12.0],
    [-0.55, -13.0], [0.55,  -13.0],
    [-1.1,  -14.0], [0,     -14.0], [1.1,   -14.0],
    [-1.65, -15.0], [-0.55, -15.0], [0.55,  -15.0], [1.65,  -15.0]
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

    g.scale.setScalar(2.2);
    return g;
}
function createPins() {
    pins.forEach(p => { World.remove(world, p.body); scene.remove(p.mesh); });
    pins = [];
    lastKnockedState = "";
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
            const pin  = isPin(bodyA) ? bodyA : bodyB;
            const ball = isBall(bodyA) ? bodyA : bodyB;

            const dx = pin.position.x - ball.position.x;
            const dy = pin.position.y - ball.position.y;
            const d  = Math.hypot(dx, dy) || 1;
            const nx = dx / d;
            const ny = dy / d;

            const bvx = ball.velocity.x;
            const bvy = ball.velocity.y;
            const spd = Math.hypot(bvx, bvy);

            const cross = bvx * ny - bvy * nx;
            const tx = -ny;
            const ty =  nx;

            const forceMag = spd * 0.009 + 0.012;
            const lateralRatio = Math.abs(cross) / (spd + 0.001);
            const lateralScale = lateralRatio * 1.8;
            const fLateral = (cross > 0 ? 1 : -1) * lateralScale * forceMag;

            Body.applyForce(pin, pin.position, { x: nx * forceMag + tx * fLateral, y: ny * forceMag + ty * fLateral });
            Body.applyForce(ball, ball.position, { x: -nx * forceMag * 0.15, y: -ny * forceMag * 0.15 });
        }
        if (isPin(bodyA) && isPin(bodyB)) {
            const dx  = bodyB.position.x - bodyA.position.x;
            const dy  = bodyB.position.y - bodyA.position.y;
            const d   = Math.hypot(dx, dy) || 1;
            const spdA = Math.hypot(bodyA.velocity.x, bodyA.velocity.y);
            const spdB = Math.hypot(bodyB.velocity.x, bodyB.velocity.y);
            const fA = spdA * 0.009;
            const fB = spdB * 0.009;
            Body.applyForce(bodyB, bodyB.position, { x:  dx/d*fA, y:  dy/d*fA });
            Body.applyForce(bodyA, bodyA.position, { x: -dx/d*fB, y: -dy/d*fB });
        }
    });
});

// ===== 操作 =====
let playerX = 0, angle = 0;
let startMouseX, startMouseY;
let scored = false, ballLaunched = false;
let ballPassedPins = false;
let scoreCheckScheduled = false;

document.addEventListener("mousedown", e => {
    if (gameState !== "playing" || isPaused) return;
    if (e.target.id === "pauseTriggerBtn") return;
    startMouseX = e.clientX; startMouseY = e.clientY;
    scored = false;
});
document.addEventListener("mouseup", e => {
    if (gameState !== "playing" || scored || ballLaunched || isPaused) return;
    if (e.target.id === "pauseTriggerBtn") return;
    const rawDx = Math.max(-280, Math.min(280, e.clientX - startMouseX));
    const rawDy = Math.max(-380, Math.min(380, startMouseY - e.clientY));
    let vx = rawDx * 0.00014 + Math.sin(angle) * 0.12;
    let vy = -(rawDy * 0.0024) - Math.cos(angle) * 0.12;
    vx = Math.max(-1.4, Math.min(1.4, vx));
    vy = Math.max(-1.4, Math.min(1.4, vy));
    if (Math.abs(vy) < 0.04) return;
    Body.setPosition(ballBody, { x: playerX, y: 6 });
    Body.setVelocity(ballBody, { x: vx + curveAmount * 0.06, y: vy });
    curveActive = true;
    ballLaunched = true;
    ballPassedPins = false;
    scoreCheckScheduled = false;
    hudPauseBox.style.display = "none";
});
document.addEventListener("keydown", e => {
    if (gameState !== "playing" || isPaused) return;
    if (e.key === "ArrowLeft")          playerX = Math.max(-2.2, playerX - 0.38);
    if (e.key === "ArrowRight")         playerX = Math.min(2.2,  playerX + 0.38);
    if (e.key === "a" || e.key === "A") angle = Math.max(-0.48, angle - 0.07);
    if (e.key === "d" || e.key === "D") angle = Math.min(0.48,  angle + 0.07);
    if (e.key === "q" || e.key === "Q") curveAmount = Math.max(-1, curveAmount - 0.2);
    if (e.key === "e" || e.key === "E") curveAmount = Math.min(1,  curveAmount + 0.2);
    if (e.key === "r" || e.key === "R") curveAmount = 0;
    updateCurveUI();
});

function updateCurveUI() {
    const fill  = document.getElementById("curveFill");
    const label = document.getElementById("curveLabel");
    if (!fill) return;
    if (curveAmount === 0) {
        fill.style.left = "50%"; fill.style.width = "0%";
        label.textContent = "";
        label.style.color = "#1c4e4d";
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
        label.style.color = "#0088ff";
    }
}

// ===== スコアロジック =====
const STRIKE_SYM = "X";
const SPARE_SYM  = "/";
let frame = 1, throwCount = 1, firstThrowKnocked = 0;
let frameData = [];

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
        box.style.cssText = `
            width:${is10 ? "62px" : "48px"};
            background:${isCur ? "rgba(214,247,244,1)" : "rgba(214,247,244,0.78)"};
            border:2px solid #ffffff;
            border-radius:14px; overflow:hidden; text-align:center;
            font-family:'Barlow Condensed',sans-serif; color:#1c4e4d;
            box-shadow:0 2px 6px rgba(0,0,0,0.12);
        `;
        const tr = document.createElement("div");
        tr.style.cssText = "display:flex; border-bottom:1px solid rgba(28,78,77,0.25); font-size:13px; min-height:22px; color:#1c4e4d; font-weight:700;";
        const cell = html => {
            const c = document.createElement("div");
            c.style.cssText = "flex:1; display:flex; align-items:center; justify-content:center; padding:2px 0;";
            c.innerHTML = html;
            return c;
        };
        if (is10) {
            [0, 1, 2].forEach(k => tr.appendChild(cell(sym10(f, k))));
        } else {
            const s = symNormal(f);
            tr.appendChild(cell(s[0]));
            tr.appendChild(cell(s[1]));
        }
        const sc = document.createElement("div");
        sc.style.cssText = "font-size:15px; font-weight:900; min-height:24px; color:#1c4e4d; display:flex; align-items:center; justify-content:center;";
        sc.textContent = cum[i] !== null ? cum[i] : "";
        box.appendChild(tr);
        box.appendChild(sc);
        framesRow.appendChild(box);
    }

    const last = calcCumulative().filter(v => v !== null).pop();
    const totalEl = document.getElementById("totalScore");
    if (totalEl) totalEl.textContent = "合計: " + (last ?? 0);
}
function symNormal(f) {
    if (f[0] === 10) return ["", `<span style="color:#ff9933;font-weight:900;font-size:15px;">${STRIKE_SYM}</span>`];
    const s1 = f[0] !== undefined ? (f[0] === 0 ? "-" : f[0]) : "";
    let s2 = "";
    if (f.length > 1)
        s2 = (f[0] + f[1] === 10)
            ? `<span style="color:#0099ff;font-weight:900;font-size:15px;">${SPARE_SYM}</span>`
            : (f[1] === 0 ? "-" : f[1]);
    return [s1, s2];
}
function sym10(f, idx) {
    const v = f[idx];
    if (v === undefined) return "";
    const S = `<span style="color:#ff9933;font-weight:900;font-size:15px;">${STRIKE_SYM}</span>`;
    const P = `<span style="color:#0099ff;font-weight:900;font-size:15px;">${SPARE_SYM}</span>`;
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

function setMsg(txt) { const el = document.getElementById("msgBox"); if (el) el.textContent = txt; }
function setFrameLabel(txt) { const el = document.getElementById("frameLabel"); if (el) el.textContent = txt; }
function setThrowLabel(txt) { const el = document.getElementById("throwLabel"); if (el) el.textContent = txt; }

// ===== ピン管理 =====
const KNOCK_THRESHOLD = 0.52;
let scoreCheckTimer = null;

function countKnocked() {
    return pins.filter(p =>
        Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD
    ).length;
}

// ===== スコアチェック判定と進行 =====
const KNOCK_THRESHOLD = 0.52; let scoreCheckTimer = null;
function countKnocked() { return pins.filter(p => Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD).length; }
function removeKnockedPins() {
    pins.forEach(p => { if (Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD && !p.knocked) { p.knocked = true; World.remove(world, p.body); scene.remove(p.mesh); } });
}

function scheduleCheckScore() {
    if (scored) return;
    clearInterval(scoreCheckTimer);
    let elapsed = 0;
    scoreCheckTimer = setInterval(() => {
        if (isPaused) return;
        elapsed += 60;
        const settled = pins.every(p => {
            if (p.knocked) return true;
            return Math.hypot(p.body.velocity.x, p.body.velocity.y) < 0.025;
        });
        if (settled || elapsed >= 2000) {
            clearInterval(scoreCheckTimer);
            checkScore();
        }
    }, 60);
}

function checkScore() {
    if (scored) return; scored = true; ballLaunched = false; curveActive = false;
    const fi = frame - 1; if (!frameData[fi]) frameData[fi] = [];
    const totalKnocked = countKnocked(); const thisThrow = throwCount === 1 ? totalKnocked : totalKnocked - firstThrowKnocked;
    frameData[fi].push(thisThrow);

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
            setMsg("ストライク！");
            setFrameLabel("第" + frame + "フレーム");
            showEvent("strike"); drawFrameBoard();
            setTimeout(() => { removeKnockedPins(); nextFrame(); }, 1800);
        } else {
            if (thisThrow === 0) showEvent("gutter");
            setMsg(thisThrow + "本倒した！");
            setFrameLabel("第" + frame + "フレーム");
            throwCount = 2;
            setThrowLabel("2投目");
            drawFrameBoard();
            setTimeout(() => {
                removeKnockedPins(); updatePinMap(); createBall();
                scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false;
                if (!isPaused) hudPauseBox.style.display = "block";
            }, 1800);
        }
    } else {
        const total2 = f[0] + f[1];
        if (total2 === 10) { setMsg("スペア！"); showEvent("spare"); }
        else { setMsg("合計 " + total2 + "本"); }
        setFrameLabel("第" + frame + "フレーム");
        drawFrameBoard();
        setTimeout(() => { removeKnockedPins(); nextFrame(); }, 1800);
    }
}

function handle10thFrame(f, totalKnocked) {
    const need = (f[0] === 10 || (f.length > 1 && f[0] + f[1] === 10)) ? 3 : 2;
    if (f.length === 1) {
        firstThrowKnocked = f[0] === 10 ? 0 : totalKnocked;
        if (f[0] === 10) { setMsg("STRIKE!"); showEvent("strike"); }
        else { setMsg(f[0] + " PIN" + (f[0] !== 1 ? "S" : "")); }
        throwCount = 2; setThrowLabel("2ND THROW");
        drawFrameBoard();
        setTimeout(() => {
            if (f[0] === 10) { pins.forEach(p => { World.remove(world, p.body); scene.remove(p.mesh); }); pins = []; createPins(); }
            else { removeKnockedPins(); updatePinMap(); }
            createBall();
            scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false;
            if (!isPaused) hudPauseBox.style.display = "block";
        }, 1800);
        return;
    }

    if (f.length === 2) {
        if (need === 3) {
            if (f[0] === 10 && f[1] === 10) { setMsg("DOUBLE STRIKE!"); showEvent("strike"); firstThrowKnocked = 0; }
            else if (f[0] + f[1] === 10) { setMsg("SPARE!"); showEvent("spare"); firstThrowKnocked = 0; }
            else { setMsg("STRIKE + " + f[1] + " PINS"); firstThrowKnocked = totalKnocked; }
            throwCount = 3; setThrowLabel("3RD THROW");
            drawFrameBoard();
            setTimeout(() => {
                if (f[1] === 10 || f[0] + f[1] === 10) { pins.forEach(p => { World.remove(world, p.body); scene.remove(p.mesh); }); pins = []; createPins(); }
                else { removeKnockedPins(); updatePinMap(); }
                createBall();
                scored = false; ballLaunched = false; ballPassedPins = false; scoreCheckScheduled = false;
                if (!isPaused) hudPauseBox.style.display = "block";
            }, 1800);
        } else {
            setMsg((f[0] + f[1]) + " TOTAL");
            drawFrameBoard();
            setTimeout(() => { removeKnockedPins(); endGame(); }, 1800);
        }
        return;
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
    setFrameLabel("第" + frame + "フレーム");
    setThrowLabel("1投目");
    setTimeout(() => {
        createBall(); createPins();
        setMsg(""); scored = false; ballLaunched = false;
        ballPassedPins = false; scoreCheckScheduled = false;
        if (!isPaused) hudPauseBox.style.display = "block";
    }, 400);
}

function endGame() {
    const cum = calcCumulative();
    const finalScore = cum.filter(v => v !== null).pop() ?? 0;

    const rankTable = [
        [220, "S", "rank-s", "神話級の腕前！完全なるストライクマスターです！"],
        [160, "A", "rank-a", "素晴らしい！安定したコントロールで見事なスコアです！"],
        [110, "B", "rank-b", "グッジョブ！スペアを確実に拾う適応力があります。"],
        [60,  "C", "rank-c", "フックの軌道を計算して、ポケット（中心）を狙ってみよう。"],
        [0,   "D", "rank-d", "どんまい！まずはガターに落とさない直線エイムを意識しよう！"]
    ];
    const [, rank, rankClass, comment] = rankTable.find(([t]) => finalScore >= t);

    document.getElementById("resultScore").textContent = finalScore;
    const rRank = document.getElementById("resultRank");
    rRank.className = "result-rank " + rankClass;
    rRank.textContent = "RANK " + rank;
    document.getElementById("resultComment").textContent = comment;

    const rf = document.getElementById("resultFrames"); rf.innerHTML = "";
    for (let i = 0; i < 10; i++) {
        const f    = frameData[i] || [];
        const is10 = i === 9;
        const box  = document.createElement("div");
        box.style.cssText = `
            background:rgba(28,78,77,0.06); border:1px solid #1c4e4d; border-radius:4px;
            width:${is10 ? "42px" : "32px"}; text-align:center;
            font-size:11px; font-family:sans-serif; color:#1c4e4d;
        `;
        const sc = document.createElement("div");
        sc.style.cssText = "font-weight:900;";
        sc.textContent = cum[i] !== null ? cum[i] : "";
        box.innerHTML = `<div style="font-size:8px; border-bottom:1px solid #1c4e4d; min-height:12px;">${is10 ? sym10(f, 0) + sym10(f, 1) : symNormal(f).join("")}</div>`;
        box.appendChild(sc);
        rf.appendChild(box);
    }

    saveGameResult(finalScore, rank);
    switchScreen("result");
}

function startNewGame() {
    frame = 1; throwCount = 1; firstThrowKnocked = 0;
    frameData = []; scored = false; ballLaunched = false;
    ballPassedPins = false; scoreCheckScheduled = false;
    curveAmount = 0; angle = 0; playerX = 0; isPaused = false;
    setFrameLabel("第1フレーム");
    setThrowLabel("1投目");
    setMsg(""); updateCurveUI(); drawFrameBoard();
    createBall(); createPins();
}

// ===== ストライク/スペア演出 =====
const eventOverlay = document.getElementById("eventOverlay");
const eventText    = document.getElementById("eventText");

function showEvent(type) {
    if (!eventOverlay || !eventText) return;
    eventOverlay.style.opacity = "1";
    eventText.style.animation = "";
    void eventText.offsetWidth;

    if (type === "strike") {
        eventText.style.animation = "strikeIn 0.45s cubic-bezier(0.2,0.8,0.3,1.1) forwards";
        eventText.innerHTML = `
            <div style="font-size:72px; line-height:1;">🎳</div>
            <div style="font-family:'Barlow Condensed',sans-serif; font-weight:900; font-size:88px; letter-spacing:4px; line-height:1; color:white; text-shadow: 0 0 40px rgba(255,140,0,0.9), 0 4px 0 rgba(200,60,0,0.8);">STRIKE!</div>
            <div style="font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:20px; letter-spacing:8px; color:rgba(255,200,100,0.9); margin-top:4px;">ALL 10 PINS</div>
        `;
    } else if (type === "spare") {
        eventText.style.animation = "strikeIn 0.45s cubic-bezier(0.2,0.8,0.3,1.1) forwards";
        eventText.innerHTML = `
            <div style="font-size:60px; line-height:1;">⭐</div>
            <div style="font-family:'Barlow Condensed',sans-serif; font-weight:900; font-size:80px; letter-spacing:4px; line-height:1; color:white; text-shadow: 0 0 32px rgba(0,200,255,0.9), 0 4px 0 rgba(0,60,180,0.8);">SPARE!</div>
        `;
    } else if (type === "gutter") {
        eventText.innerHTML = `
            <div style="font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:44px; letter-spacing:6px; color:rgba(180,160,160,0.85); text-shadow: 0 2px 12px rgba(0,0,0,0.6);">GUTTER...</div>
        `;
    }

    clearTimeout(eventOverlay._timer);
    eventOverlay._timer = setTimeout(() => { eventOverlay.style.opacity = "0"; }, 2000);
}

// ===== ピンマップ更新 =====
function updatePinMap() {
    const pinDots = document.getElementById("pinDots");
    if (!pinDots) return;
    pinDots.innerHTML = "";
    const mapPos = [
        {x:100, y:172}, {x:74,  y:130}, {x:126, y:130},
        {x:48,  y:88 }, {x:100, y:88 }, {x:152, y:88 },
        {x:22,  y:46 }, {x:74,  y:46 }, {x:126, y:46 }, {x:178, y:46 }
    ];
    pins.forEach((p, i) => {
        const isDown = p.knocked || Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD;
        const dot = document.createElement("div");
        dot.style.cssText = `
            position:absolute; left:${mapPos[i].x}px; top:${mapPos[i].y}px;
            width:30px; height:30px; border-radius:50%;
            transform:translate(-50%,-50%);
            transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
            background: ${isDown ? "#7c8f8e" : "#ffffff"};
            border: 2.5px solid ${isDown ? "#1c4e4d" : "#7c8f8e"};
            box-shadow: ${isDown
                ? "inset 0 1px 4px rgba(0,0,0,0.2)"
                : "0 2px 8px rgba(0,0,0,0.22), inset 0 1px 3px rgba(255,255,255,0.9)"};
            display: flex; align-items: center; justify-content: center;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 13px; font-weight: 700;
            color: ${isDown ? "transparent" : "#333333"};
            line-height: 1;
        `;
        dot.textContent = isDown ? "" : (i + 1);
        pinDots.appendChild(dot);
    });
}

// ===== ガイドライン =====
const guideGeo = new THREE.BufferGeometry();
const guideLine = new THREE.Line(guideGeo, new THREE.LineBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.6 }));
scene.add(guideLine);
let ballTravelDistance = 0;

let ballTravelDistance = 0;
let lastKnockedState = "";

// ===== メインループ =====
function update() {
    if (gameState !== "playing" || isPaused) return;
    Engine.update(engine, 1000 / 60);

    if (!ballLaunched && ballBody && ballBody.speed < 0.05) {
        Body.setPosition(ballBody, { x: playerX, y: 6 });
        Body.setVelocity(ballBody, { x: 0, y: 0 });
    }

    if (ballLaunched && ballBody) {
        const by = ballBody.position.y;
        const bx = ballBody.position.x;
        const speed = Math.hypot(ballBody.velocity.x, ballBody.velocity.y);

        // ピン位置を超えたら通常スコア判定
        if (!ballPassedPins && (by < -16.0 || bx < -4.5 || bx > 3.9)) {
            ballPassedPins = true;
        }

        // ピンに届く前に止まった場合はガター扱い
        if (!ballPassedPins && by > -11.0 && speed < 0.015 && !scoreCheckScheduled) {
            scoreCheckScheduled = true;
            setMsg("ガター...");
            showEvent("gutter");
            setTimeout(() => {
                checkScore();
            }, 1000);
        }

        if (ballPassedPins && !scoreCheckScheduled) {
            scoreCheckScheduled = true;
            scheduleCheckScore();
        }
    }

    if (ballLaunched && ballBody && !scored) {
        const spd = Math.hypot(ballBody.velocity.x, ballBody.velocity.y);
        const bx  = ballBody.position.x;
        const inLeftGutter  = bx < -4.5;
        const inRightGutter = bx >  3.9;
        const inGutter = inLeftGutter || inRightGutter;

        if (inGutter || ballInGutter) {
            if (!ballInGutter) {
                ballInGutter = true;
                ballGutterX  = inLeftGutter ? -5.1 : 4.5;
                curveActive  = false;
            }
            Body.setPosition(ballBody, { x: ballGutterX, y: ballBody.position.y });
            Body.setVelocity(ballBody, { x: 0, y: ballBody.velocity.y });
        } else if (curveActive && spd > 0.04) {
            ballTravelDistance += Math.abs(ballBody.velocity.y) * (1 / 60);
            const travelRamp = Math.min(ballTravelDistance / 8.0, 1.0);
            const smoothRamp = travelRamp * travelRamp;
            const force = curveAmount * (0.00000008 + smoothRamp * 0.00000028);
            Body.applyForce(ballBody, ballBody.position, { x: force, y: 0 });
        } else if (spd <= 0.04) {
            curveActive = false;
        }
    }

    if (ballGroup && ballBody) {
        ballGroup.position.set(ballBody.position.x, 0.32, ballBody.position.y);
        ballGroup.rotation.x += ballBody.velocity.y * 0.38;
        ballGroup.rotation.z -= ballBody.velocity.x * 0.38;
    }

    pins.forEach(p => {
        if (p.knocked) return;
        const moved = Math.hypot(p.body.position.x - p.startX, p.body.position.y - p.startZ) > KNOCK_THRESHOLD;
        p.mesh.position.set(p.body.position.x, moved ? 0.14 : 0, p.body.position.y); p.mesh.rotation.set(moved ? Math.PI / 2 : 0, p.body.angle, 0);
    });

    const knockedState = pins.map(p => p.knocked).join(",");
    if (knockedState !== lastKnockedState) { lastKnockedState = knockedState; updatePinMap(); }

    if (!ballLaunched) {
        ballTravelDistance = 0;
        const pts = [
            new THREE.Vector3(playerX, 0.32, 6),
            new THREE.Vector3(playerX + Math.sin(angle) * 6, 0.32, 6 - Math.cos(angle) * 6)
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

function animate() { requestAnimationFrame(animate); update(); renderer.render(scene, camera); }
switchScreen("title"); animate();