// ===== home.js =====
// Home screen logic for AIT.Sports

(function () {
  'use strict';

  // ── Keyboard shortcut: press S → score popup ──
  document.addEventListener('keydown', function (e) {
    if (e.key.toLowerCase() === 's') {
      openScoreModal();
    }
  });

  // ── Animate callouts in sequence ──
  const mapImg = document.querySelector('.map-bg');

  if (mapImg) {
    mapImg.addEventListener('load', revealCallouts);
    if (mapImg.complete) revealCallouts();
  } else {
    revealCallouts();
  }

  function revealCallouts() {
    const callouts = document.querySelectorAll('.callout');
    callouts.forEach(function (el, i) {
      el.style.setProperty('--delay', (i * 0.1) + 's');
    });
  }

  // ── Highlight callout on keyboard navigation ──
  const callouts = Array.from(document.querySelectorAll('.callout'));
  let focusIndex = -1;

  document.addEventListener('keydown', function (e) {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key)) return;

    e.preventDefault();

    if (e.key === 'Enter' && focusIndex >= 0) {
      callouts[focusIndex].click();
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      focusIndex = (focusIndex + 1) % callouts.length;
    } else {
      focusIndex = (focusIndex - 1 + callouts.length) % callouts.length;
    }

    callouts.forEach(function (el, i) {
      el.classList.toggle('keyboard-focus', i === focusIndex);
    });
    if (focusIndex >= 0) callouts[focusIndex].focus();
  });

  // ============================================================
  // WII SPORTS STYLE SCORE MODAL LOGIC (4 GAMES対応)
  // ============================================================
  window.openScoreModal = function() {
    const modal = document.getElementById('scoreModal');
    const body = document.getElementById('scoreModalBody');
    body.innerHTML = ""; // 初期化

    let localData = localStorage.getItem("wii_sports_theme_data");
    let data = localData ? JSON.parse(localData) : null;

    // データが存在しない場合
    if (!data || !data.users || Object.keys(data.users).length === 0) {
      body.innerHTML = `<div class="no-user-msg">まだプレイデータがありません。<br>ゲームをプレイしてユーザーを登録してみよう！</div>`;
      modal.classList.add('show');
      return;
    }

    // 各ユーザーのスコアデータを読み込んでリストを動的生成
    Object.keys(data.users).forEach(username => {
      const uData = data.users[username];
      
      // 各ゲームごとに記録判定。なければ「未プレイ」にする
      const fishingRank  = uData.fishing_rank  ? uData.fishing_rank  : "未プレイ";
      const shootingRank = uData.shooting_rank ? uData.shooting_rank : "未プレイ";
      const bowlingRank  = uData.bowling_rank  ? uData.bowling_rank  : "未プレイ";
      const archeryRank  = uData.archery_rank  ? uData.archery_rank  : "未プレイ";

      // ランクに応じたテキスト色を返すヘルパー
      const getRankClass = (rank) => {
        if (rank === "未プレイ") return "unplayed-text";
        return `rank-${rank.toLowerCase()}-text`;
      };

      const card = document.createElement('div');
      card.className = "wii-user-score-card";
      
      card.innerHTML = `
        <div class="wii-card-username">👤 ${username}</div>
        <div class="wii-games-grid">
          <div class="wii-game-status-box">
            <div class="wii-game-name">釣り</div>
            <div class="wii-game-rank ${getRankClass(fishingRank)}">${fishingRank}</div>
          </div>
          <div class="wii-game-status-box">
            <div class="wii-game-name">射撃</div>
            <div class="wii-game-rank ${getRankClass(shootingRank)}">${shootingRank}</div>
          </div>
          <div class="wii-game-status-box">
            <div class="wii-game-name">ボウリング</div>
            <div class="wii-game-rank ${getRankClass(bowlingRank)}">${bowlingRank}</div>
          </div>
          <div class="wii-game-status-box">
            <div class="wii-game-name">アーチェリー</div>
            <div class="wii-game-rank ${getRankClass(archeryRank)}">${archeryRank}</div>
          </div>
        </div>
      `;
      body.appendChild(card);
    });

    modal.classList.add('show');
  };

  window.closeScoreModal = function() {
    document.getElementById('scoreModal').classList.remove('show');
  };

})();