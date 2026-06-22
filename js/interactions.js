/* ─────────────────────────────────────────────────────────────────
   interactions.js
   Mouse and touch event handling.  No explicit modes — every circle
   triggers its own unique magic based on circle.magic.
   ───────────────────────────────────────────────────────────────── */

class InteractionManager {
  constructor(canvas, circles, renderer, audio, physics) {
    this.canvas   = canvas;
    this.circles  = circles;
    this.renderer = renderer;
    this.audio    = audio;
    this.physics  = physics;

    this.hovered  = null;
    this.selected = null;
    this.dragged  = null;
    this._didDrag = false;

    this._overlayTimer = null;

    this._bindMouse();
    this._bindTouch();
  }

  /* ── Mouse ──────────────────────────────────────────────────── */

  _bindMouse() {
    this.canvas.addEventListener('mousemove',  this._onMove.bind(this));
    this.canvas.addEventListener('mousedown',  this._onDown.bind(this));
    this.canvas.addEventListener('mouseup',    this._onUp.bind(this));
    this.canvas.addEventListener('mouseleave', this._onLeave.bind(this));
  }

  _onMove(e) {
    const { x, y } = this._toCanvas(e.clientX, e.clientY);

    if (this.dragged) {
      this.physics.moveDrag(this.dragged, x, y);
      this._didDrag = true;
      return;
    }

    const hit = this._hit(x, y);
    if (hit !== this.hovered) {
      if (hit) this.physics.setWell(hit.id);
      else     this.physics.clearWell();

      this.hovered = hit;
      this.canvas.style.cursor = hit ? 'grab' : 'default';
      if (hit && this.audio.initialized) this.audio.playHover(hit);
    }

    /* Line pluck: mouse within 12px of a structural line */
    for (let i = 0; i < this.renderer.lines.length; i++) {
      const ln = this.renderer.lines[i];
      if (distPointToSeg(x, y, ln.x1, ln.y1, ln.x2, ln.y2) < 12) {
        if (this.renderer.pluckLine(i) && this.audio.initialized) {
          this.audio.playString(ln.freq);
        }
      }
    }
  }

  _onDown(e) {
    e.preventDefault();
    const { x, y } = this._toCanvas(e.clientX, e.clientY);
    const hit = this._hit(x, y);
    if (!hit) return;

    this.audio.resume();
    this.audio.init().then(() => {
      this.audio.playCircle(hit);
      this._dispatchMagic(hit);
    });

    this.selected = hit;
    this._didDrag = false;
    this.physics.startDrag(hit, x, y);
    this.dragged = hit;
    this.canvas.style.cursor = 'grabbing';
    this._updateInfo(hit);
  }

  _onUp() {
    if (!this.dragged) return;
    if (!this._didDrag) {
      /* Pure click — give a physical upward impulse */
      this.dragged.dragging = false;
      this.physics.impulse(this.dragged);
    } else {
      this.physics.endDrag(this.dragged);
    }
    this.dragged = null;
    this.canvas.style.cursor = this.hovered ? 'grab' : 'default';
  }

  _onLeave() {
    this.hovered = null;
    this.physics.clearWell();
    if (this.dragged) {
      this.physics.endDrag(this.dragged);
      this.dragged = null;
    }
  }

  /* ── Touch ──────────────────────────────────────────────────── */

  _bindTouch() {
    const opts = { passive: false };
    this.canvas.addEventListener('touchstart', this._onTouchStart.bind(this), opts);
    this.canvas.addEventListener('touchmove',  this._onTouchMove.bind(this),  opts);
    this.canvas.addEventListener('touchend',   this._onTouchEnd.bind(this));
  }

  _onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    const { x, y } = this._toCanvas(t.clientX, t.clientY);
    const hit = this._hit(x, y);
    if (!hit) return;

    this.audio.resume();
    this.audio.init().then(() => {
      this.audio.playCircle(hit);
      this._dispatchMagic(hit);
    });

    this.physics.setWell(hit.id);
    this.selected = hit;
    this.physics.startDrag(hit, x, y);
    this.dragged = hit;
    this._updateInfo(hit);
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (!this.dragged) return;
    const t = e.touches[0];
    const { x, y } = this._toCanvas(t.clientX, t.clientY);
    this.physics.moveDrag(this.dragged, x, y);
  }

  _onTouchEnd() {
    if (this.dragged) {
      this.physics.endDrag(this.dragged);
      this.physics.clearWell();
      this.dragged = null;
    }
  }

  /* ── Magic dispatch ─────────────────────────────────────────── */

  _dispatchMagic(circle) {
    switch (circle.magic) {
      case 'well':
        this.physics.setTimedWell(circle.id, 2500);
        break;
      case 'overlay':
        this._flashOverlay(circle);
        break;
      case 'ripple':
        if (this.renderer.addRipple) this.renderer.addRipple(circle);
        break;
      case 'burst':
        if (this.renderer.addParticleBurst) this.renderer.addParticleBurst(circle);
        break;
    }
  }

  /* ── Overlay flash ──────────────────────────────────────────── */

  _flashOverlay(circle) {
    if (this._overlayTimer) clearInterval(this._overlayTimer);
    this.renderer.overlayCircle = circle;
    this.renderer.overlayAlpha  = 0;

    let alpha     = 0;
    let ascending = true;
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

  /* ── Helpers ────────────────────────────────────────────────── */

  _toCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.renderer.W / rect.width),
      y: (clientY - rect.top)  * (this.renderer.H / rect.height),
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
