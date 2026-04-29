/* ─────────────────────────────────────────────────────────────────
   physics.js  —  initial: gravity impulse, bounce, spring return
   ───────────────────────────────────────────────────────────────── */

class PhysicsEngine {
  constructor(mainCircle) {
    this.main    = mainCircle; /* { x, y, r } */
    this.gravity = 0.34;
    this.damping = 0.74;
    this.bounce  = 0.52;
    this.spring  = 0.018;
    this._vel    = new Map();
    this._origin = new Map();
    this._live   = new Set();
  }

  register(circle) {
    this._origin.set(circle.id, { x: circle.x, y: circle.y });
    this._vel.set(circle.id,    { vx: 0, vy: 0 });
  }

  impulse(circle) {
    const vel = this._vel.get(circle.id);
    vel.vy = -(9 + Math.random() * 4);
    vel.vx = (Math.random() - 0.5) * 6;
    this._live.add(circle.id);
  }

  tick(circles) {
    for (const c of circles) {
      if (!this._live.has(c.id)) continue;

      const vel  = this._vel.get(c.id);
      const orig = this._origin.get(c.id);

      vel.vy += this.gravity;
      c.x += vel.vx;
      c.y += vel.vy;

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

      vel.vx = vel.vx * this.damping + (orig.x - c.x) * this.spring;
      vel.vy = vel.vy * this.damping + (orig.y - c.y) * this.spring;

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

  startDrag(circle, mx, my) {
    this._live.delete(circle.id);
    circle.dragging = true;
    circle._dragDx  = circle.x - mx;
    circle._dragDy  = circle.y - my;
  }

  /* NOTE: drag does not yet clamp to the main circle boundary */
  moveDrag(circle, mx, my) {
    if (!circle.dragging) return;
    circle.x = mx + circle._dragDx;
    circle.y = my + circle._dragDy;
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
