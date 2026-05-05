/* ─────────────────────────────────────────────────────────────────
   main.js
   Entry point.  Instantiates all subsystems, wires them together,
   and drives the requestAnimationFrame render loop.
   ───────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const canvas = document.getElementById('kandinsky-canvas');

  /* Deep-copy circle data so physics can mutate x/y positions freely */
  const circles = KANDINSKY_CIRCLES.map(c => ({ ...c }));

  const MAIN = { x: 400, y: 400, r: 375 };

  const renderer = new KandinskyRenderer(canvas);
  const audio    = new KandinskyAudio();
  const physics  = new PhysicsEngine(MAIN);

  circles.forEach(c => physics.register(c));

  const interactions = new InteractionManager(canvas, circles, renderer, audio, physics);

  /* Mode-button wiring */
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      interactions.setMode(btn.dataset.mode);
    });
  });

  /* ── Render loop ─────────────────────────────────────────────── */

  function frame() {
    physics.tick(circles);

    renderer.clear();
    renderer.drawMainCircle();
    renderer.drawLines();
    renderer.drawDecorativeCircles();

    for (const c of circles) {
      renderer.drawCircle(
        c,
        c === interactions.hovered,
        c === interactions.selected,
      );
      renderer.drawLabel(c);
    }

    renderer.drawOverlay();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
