// ===== home.js =====
// Home screen logic for AIT.Sports

(function () {
  'use strict';

  // ── Keyboard shortcut: press S → score page ──
  document.addEventListener('keydown', function (e) {
    if (e.key.toLowerCase() === 's') {
      window.location.href = 'score.html';
    }
  });

  // ── Animate callouts in sequence (already done via CSS animation-delay,
  //    but we can add a slight bounce on map load readiness) ──
  const mapImg = document.querySelector('.map-bg');

  if (mapImg) {
    mapImg.addEventListener('load', revealCallouts);
    // If already cached / loaded
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

  // ── Highlight callout on keyboard navigation (arrow keys cycle focus) ──
  const callouts = Array.from(document.querySelectorAll('.callout'));
  let focusIndex = -1;

  document.addEventListener('keydown', function (e) {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key)) return;

    e.preventDefault();

    if (e.key === 'Enter' && focusIndex >= 0) {
      callouts[focusIndex].click();
      return;
    }

    // Cycle through callouts
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      focusIndex = (focusIndex + 1) % callouts.length;
    } else {
      focusIndex = (focusIndex - 1 + callouts.length) % callouts.length;
    }

    callouts.forEach(function (el, i) {
      el.classList.toggle('keyboard-focus', i === focusIndex);
    });
    callouts[focusIndex].focus();
  });

})();
