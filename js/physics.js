/* ─────────────────────────────────────────────────────────────────
   physics.js
   Gravity + spring simulation.  Circles are launched by an impulse,
   bounce off the inner wall of the main circle, then spring back to
   their original positions using a damped oscillator.
   ───────────────────────────────────────────────────────────────── */

class PhysicsEngine {
  constructor(mainCircle) {
    this.main     = mainCircle; /* { x, y, r } */
    this.gravity  = 0.34;
    this.damping  = 0.74;
    this.bounce   = 0.52;
    this.spring   = 0.018;
    this._vel     = new Map(); /* id → { vx, vy } */
    this._origin  = new Map(); /* id → { x, y }  */
    this._live    = new Set(); /* ids currently animating */
  }

  register(circle) {
    this._origin.set(circle.id, { x: circle.x, y: circle.y });
    this._vel.set(circle.id,    { vx: 0, vy: 0 });
  }

  /* Launch a circle upward with a random horizontal jitter */
  impulse(circle) {
    const vel = this._vel.get(circle.id);
    vel.vy = -(9 + Math.random() * 4);
    vel.vx = (Math.random() - 0.5) * 6;
    this._live.add(circle.id);
  }

  /* Call once per animation frame */
  tick(circles) {
    for (const c of circles) {
      if (!this._live.has(c.id)) continue;

      const vel  = this._vel.get(c.id);
      const orig = this._origin.get(c.id);

      /* Gravity */
      vel.vy += this.gravity;

      /* Integrate */
      c.x += vel.vx;
      c.y += vel.vy;

      /* Boundary — keep inside the main circle */
      const dx   = c.x - this.main.x;
      const dy   = c.y - this.main.y;
      const dist = Math.hypot(dx, dy);
      const max  = this.main.r - c.r - 5;

      if (dist > max) {
        const nx = dx / dist;
        const ny = dy / dist;
        c.x = this.main.x + nx * max;
        c.y = this.main.y + ny * max;
        const dot = vel.vx * nx + vel.vy * ny;
        vel.vx = (vel.vx - 2 * dot * nx) * this.bounce;
        vel.vy = (vel.vy - 2 * dot * ny) * this.bounce;
      }

      /* Spring back toward origin */
      vel.vx = vel.vx * this.damping + (orig.x - c.x) * this.spring;
      vel.vy = vel.vy * this.damping + (orig.y - c.y) * this.spring;

      /* Settle check */
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
    circle.dragging    = true;
    circle._dragDx     = circle.x - mx;
    circle._dragDy     = circle.y - my;
  }

  moveDrag(circle, mx, my) {
    if (!circle.dragging) return;
    let nx = mx + circle._dragDx;
    let ny = my + circle._dragDy;

    /* Clamp inside main boundary */
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
    /* Give a small release velocity toward origin */
    vel.vx = (circle.x - orig.x) * 0.06;
    vel.vy = (circle.y - orig.y) * 0.06;
    this._live.add(circle.id);
  }
}
