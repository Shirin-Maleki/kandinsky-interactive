/* ─────────────────────────────────────────────────────────────────
   interactions.js  —  update: add overlay mode, no touch yet
   ───────────────────────────────────────────────────────────────── */

class InteractionManager {
  constructor(canvas, circles, renderer, audio, physics) {
    this.canvas   = canvas;
    this.circles  = circles;
    this.renderer = renderer;
    this.audio    = audio;
    this.physics  = physics;

    this.mode     = 'sound';
    this.hovered  = null;
    this.selected = null;
    this.dragged  = null;

    this._overlayTimer = null;

    this._bind();
  }

  setMode(m) { this.mode = m; }

  _bind() {
    this.canvas.addEventListener('mousemove',  this._onMove.bind(this));
    this.canvas.addEventListener('mousedown',  this._onDown.bind(this));
    this.canvas.addEventListener('mouseup',    this._onUp.bind(this));
    this.canvas.addEventListener('mouseleave', this._onLeave.bind(this));
  }

  _onMove(e) {
    const { x, y } = this._toCanvas(e.clientX, e.clientY);

    if (this.dragged) {
      this.physics.moveDrag(this.dragged, x, y);
      return;
    }

    const hit = this._hit(x, y);
    if (hit !== this.hovered) {
      this.hovered = hit;
      this.canvas.style.cursor = hit ? 'grab' : 'default';
      if (hit && this.audio.initialized) this.audio.playHover(hit);
    }
  }

  _onDown(e) {
    e.preventDefault();
    const { x, y } = this._toCanvas(e.clientX, e.clientY);
    const hit = this._hit(x, y);
    if (!hit) return;

    this.audio.resume();
    this.audio.init().then(() => {
      if (this.mode !== 'gravity') this.audio.playCircle(hit);
      if (this.mode === 'gravity') this.physics.impulse(hit);
      if (this.mode === 'overlay') this._flashOverlay(hit);
    });

    this.selected = hit;
    this.physics.startDrag(hit, x, y);
    this.dragged = hit;
    this.canvas.style.cursor = 'grabbing';
    this._updateInfo(hit);
  }

  _onUp() {
    if (this.dragged) {
      this.physics.endDrag(this.dragged);
      this.dragged = null;
      this.canvas.style.cursor = this.hovered ? 'grab' : 'default';
    }
  }

  _onLeave() {
    this.hovered = null;
    if (this.dragged) {
      this.physics.endDrag(this.dragged);
      this.dragged = null;
    }
  }

  _flashOverlay(circle) {
    if (this._overlayTimer) clearInterval(this._overlayTimer);
    this.renderer.overlayCircle = circle;
    this.renderer.overlayAlpha  = 0;

    let alpha = 0, ascending = true;
    this._overlayTimer = setInterval(() => {
      if (ascending) {
        alpha += 0.055;
        if (alpha >= 1) { alpha = 1; ascending = false; }
      } else {
        alpha -= 0.022;
        if (alpha <= 0) {
          alpha = 0;
          clearInterval(this._overlayTimer);
          this._overlayTimer          = null;
          this.renderer.overlayCircle = null;
        }
      }
      this.renderer.overlayAlpha = alpha;
    }, 28);
  }

  _toCanvas(cx, cy) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (cx - rect.left) * (this.renderer.W / rect.width),
      y: (cy - rect.top)  * (this.renderer.H / rect.height),
    };
  }

  _hit(x, y) {
    for (let i = this.circles.length - 1; i >= 0; i--) {
      const c  = this.circles[i];
      const dx = x - c.x;
      const dy = y - c.y;
      if (dx * dx + dy * dy <= c.r * c.r) return c;
    }
    return null;
  }

  _updateInfo(circle) {
    const el = document.getElementById('info-panel');
    if (el) el.textContent = `${circle.name}  ·  ${circle.note}  ·  ${circle.description}`;
  }
}
