/* ─────────────────────────────────────────────────────────────────
   main.js  —  initial: subsystems wired, basic render loop
   ───────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const canvas  = document.getElementById('kandinsky-canvas');
  const circles = KANDINSKY_CIRCLES.map(c => ({ ...c }));
  const MAIN    = { x: 400, y: 400, r: 375 };

  const renderer = new KandinskyRenderer(canvas);
  const audio    = new KandinskyAudio();
  const physics  = new PhysicsEngine(MAIN);

  circles.forEach(c => physics.register(c));

  const interactions = new InteractionManager(canvas, circles, renderer, audio, physics);

  function frame() {
    physics.tick(circles);
    renderer.clear();
    renderer.drawMainCircle();
    renderer.drawLines();
    renderer.drawDecorativeCircles();
    for (const c of circles) {
      renderer.drawCircle(c, c === interactions.hovered, c === interactions.selected);
      renderer.drawLabel(c);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
