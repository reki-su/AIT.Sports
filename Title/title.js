// ===== title.js =====
(function () {
  'use strict';

  const pressed = { a: false, b: false };

  const line2   = document.getElementById('line2');
  const line3   = document.getElementById('line3');
  const circle  = document.getElementById('ctrlCircle');
  const bubbleA = document.getElementById('bubbleA');
  const bubbleB = document.getElementById('bubbleB');
  const screen  = document.querySelector('.title-screen');

  function updateUI() {
    // 2本目の線 → A押下でオレンジ
    line2?.classList.toggle('key-a', pressed.a);
    // 3本目の線 → B押下で水色
    line3?.classList.toggle('key-b', pressed.b);

    // 円枠の色変化
    circle?.classList.toggle('key-a', pressed.a);
    circle?.classList.toggle('key-b', pressed.b);

    // 吹き出し：黒反転
    bubbleA?.classList.toggle('key-a', pressed.a);
    bubbleB?.classList.toggle('key-b', pressed.b);
  }

  function handleTransition() {
    if (pressed.a && pressed.b) {
      document.removeEventListener('keydown', onKeyDown);
      screen?.classList.add('flash-out');
      setTimeout(() => {
        window.location.href = '../Home/home.html';
      }, 400);
    }
  }

  function onKeyDown(e) {
    const key = e.key.toLowerCase();
    let changed = false;
    if (key === 'a' && !pressed.a) { pressed.a = true;  changed = true; }
    if (key === 'b' && !pressed.b) { pressed.b = true;  changed = true; }
    if (changed) { updateUI(); handleTransition(); }
  }

  function onKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key === 'a') pressed.a = false;
    if (key === 'b') pressed.b = false;
    updateUI();
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup',   onKeyUp);

  updateUI();
})();
