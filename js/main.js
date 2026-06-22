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

  const startTime = performance.now();

  /* ── Render loop ─────────────────────────────────────────────── */

  function frame() {
    const time = performance.now() - startTime;

    physics.tick(circles);
    renderer.tickLines();

    /* Circle-line intersection: moving circles pluck lines they cross */
    for (const c of circles) {
      for (let i = 0; i < renderer.lines.length; i++) {
        const ln = renderer.lines[i];
        if (distPointToSeg(c.x, c.y, ln.x1, ln.y1, ln.x2, ln.y2) < c.r) {
          if (renderer.pluckLine(i, 5) && audio.initialized) {
            audio.playString(ln.freq);
          }
        }
      }
    }

    renderer.clear();
    renderer.drawMainCircle();
    renderer.drawBackgroundRays(time);
    renderer.drawLines();
    renderer.drawDecorativeCircles();

    for (const c of circles) {
      renderer.drawCircle(
        c,
        c === interactions.hovered,
        c === interactions.selected,
        time,
      );
      renderer.drawLabel(c);
    }

    renderer.drawOverlay();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
