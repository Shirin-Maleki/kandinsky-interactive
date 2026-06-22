/* ─────────────────────────────────────────────────────────────────
   physics.js
   Damped-spring simulation with varying mass and gravity wells.

   Each circle has an anchor (original position).  When displaced it
   returns via a spring whose constant is inversely proportional to
   the circle's mass (radius × alpha): heavier circles drift back
   slowly; lighter ones snap back fast.

   Hovering over a circle turns it into a gravity well: nearby circles
   are drawn toward it.  The pull scales with the well's mass and
   falls off with distance.
   ───────────────────────────────────────────────────────────────── */

class PhysicsEngine {
  constructor(mainCircle) {
    this.main    = mainCircle; /* { x, y, r } */
    this.gravity = 0.34;
    this.bounce  = 0.52;

    this._vel     = new Map(); /* id → { vx, vy } */
    this._origin  = new Map(); /* id → { x, y }  */
    this._live    = new Set(); /* ids currently animating */
    this._springK = new Map(); /* id → spring constant (varies by mass) */
    this._dampK   = new Map(); /* id → damping factor  (varies by mass) */
    this._wellId  = null;      /* id of the active gravity-well circle   */
  }

  /* Register a circle and derive its mass-based spring/damping */
  register(circle) {
    this._origin.set(circle.id, { x: circle.x, y: circle.y });
    this._vel.set(circle.id,    { vx: 0, vy: 0 });

    /* mass = radius × alpha — heavier → weaker spring, more damping */
    const mass    = circle.r * (circle.alpha ?? 0.75);
    const springK = Math.max(0.008, Math.min(0.08, 1.0 / mass));
    const dampK   = 0.68 + 0.14 * (mass / 100);
    this._springK.set(circle.id, springK);
    this._dampK.set(circle.id,   dampK);
  }

  /* Launch a circle upward with a random horizontal jitter */
  impulse(circle) {
    const vel = this._vel.get(circle.id);
    vel.vy = -(9 + Math.random() * 4);
    vel.vx = (Math.random() - 0.5) * 6;
    this._live.add(circle.id);
  }

  setWell(id)  { this._wellId = id; }
  clearWell()  { this._wellId = null; }

  /* Call once per animation frame */
  tick(circles) {
    /* ── Gravity well: pull neighbours toward the well circle ── */
    if (this._wellId !== null) {
      const well = circles.find(c => c.id === this._wellId);
      if (well) {
        const wellMass  = well.r * (well.alpha ?? 0.75);
        const strength  = 0.38 * wellMass / 60;
        const influence = well.r * 3.2;

        for (const c of circles) {
          if (c.id === well.id || c.dragging) continue;
          const dx   = well.x - c.x;
          const dy   = well.y - c.y;
          const dist = Math.hypot(dx, dy);
          if (dist < influence && dist > 8) {
            const force = strength / dist;
            const vel   = this._vel.get(c.id);
            vel.vx += (dx / dist) * force;
            vel.vy += (dy / dist) * force;
            this._live.add(c.id);
          }
        }
      }
    }

    /* ── Spring / boundary / settle loop ─────────────────────── */
    for (const c of circles) {
      if (!this._live.has(c.id)) continue;

      const vel    = this._vel.get(c.id);
      const orig   = this._origin.get(c.id);
      const spring = this._springK.get(c.id) ?? 0.018;
      const damp   = this._dampK.get(c.id)   ?? 0.74;

      vel.vy += this.gravity;

      c.x += vel.vx;
      c.y += vel.vy;

      /* Keep inside main circle */
      const dx   = c.x - this.main.x;
      const dy   = c.y - this.main.y;
      const dist = Math.hypot(dx, dy);
      const max  = this.main.r - c.r - 5;

      if (dist > max) {
        const nx  = dx / dist;
        const ny  = dy / dist;
        c.x = this.main.x + nx * max;
        c.y = this.main.y + ny * max;
        const dot = vel.vx * nx + vel.vy * ny;
        vel.vx = (vel.vx - 2 * dot * nx) * this.bounce;
        vel.vy = (vel.vy - 2 * dot * ny) * this.bounce;
      }

      /* Spring back toward anchor using per-circle constants */
      vel.vx = vel.vx * damp + (orig.x - c.x) * spring;
      vel.vy = vel.vy * damp + (orig.y - c.y) * spring;

      /* Settle when almost stationary and close to origin */
      const speed = Math.hypot(vel.vx, vel.vy);
      const drift = Math.hypot(c.x - orig.x, c.y - orig.y);
      if (speed < 0.04 && drift < 0.6) {
        c.x = orig.x;
        c.y = orig.y;
        vel.vx = 0;
        vel.vy = 0;
        this._live.delete(c.id);
      }
    }
  }

  /* ── Drag support ────────────────────────────────────────────── */

  startDrag(circle, mx, my) {
    this._live.delete(circle.id);
    circle.dragging = true;
    circle._dragDx  = circle.x - mx;
    circle._dragDy  = circle.y - my;
  }

  moveDrag(circle, mx, my) {
    if (!circle.dragging) return;
    let nx = mx + circle._dragDx;
    let ny = my + circle._dragDy;

    const dx   = nx - this.main.x;
    const dy   = ny - this.main.y;
    const dist = Math.hypot(dx, dy);
    const max  = this.main.r - circle.r - 5;

    if (dist > max) {
      const scale = max / dist;
      nx = this.main.x + dx * scale;
      ny = this.main.y + dy * scale;
    }

    circle.x = nx;
    circle.y = ny;
  }

  endDrag(circle) {
    circle.dragging = false;
    const vel  = this._vel.get(circle.id);
    const orig = this._origin.get(circle.id);
    vel.vx = (circle.x - orig.x) * 0.06;
    vel.vy = (circle.y - orig.y) * 0.06;
    this._live.add(circle.id);
  }
}
