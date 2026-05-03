/* ─────────────────────────────────────────────────────────────────
   canvas.js
   Stateless rendering functions for the Kandinsky canvas.
   All draw calls receive the current frame state as arguments so
   the renderer itself holds no mutable state beyond the 2D context.
   ───────────────────────────────────────────────────────────────── */

class KandinskyRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W      = 800;
    this.H      = 800;
    this.main   = { x: 400, y: 400, r: 375 };

    /* Overlay state — mutated by the interaction layer */
    this.overlayCircle = null;
    this.overlayAlpha  = 0;

    this._applySize();
    window.addEventListener('resize', () => this._applySize());
  }

  _applySize() {
    const parent = this.canvas.parentElement;
    const size   = Math.min(parent.clientWidth, parent.clientHeight, this.W);
    this.canvas.style.width  = size + 'px';
    this.canvas.style.height = size + 'px';
    this.canvas.width  = this.W;
    this.canvas.height = this.H;
  }

  /* ── Scene layers (called in order each frame) ─────────────── */

  clear() {
    /* Beige/cream ground — Kandinsky used a warm neutral under-paint */
    this.ctx.fillStyle = '#E6DEC4';
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  drawMainCircle() {
    const { ctx } = this;
    const { x, y, r } = this.main;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#D8D0B4';
    ctx.fill();
    ctx.lineWidth   = 9;
    ctx.strokeStyle = '#111111';
    ctx.stroke();
    ctx.restore();
  }

  /* Characteristic diagonal lines from the original painting */
  drawLines() {
    const { ctx } = this;
    ctx.save();

    /* Clip all lines inside the main circle */
    ctx.beginPath();
    ctx.arc(this.main.x, this.main.y, this.main.r - 4, 0, Math.PI * 2);
    ctx.clip();

    ctx.lineCap = 'round';

    /* Primary bold diagonal */
    ctx.beginPath();
    ctx.moveTo(118, 105);
    ctx.lineTo(685, 695);
    ctx.lineWidth   = 4;
    ctx.strokeStyle = '#0E0E0E';
    ctx.stroke();

    /* Secondary thinner diagonal */
    ctx.beginPath();
    ctx.moveTo(95, 545);
    ctx.lineTo(608, 95);
    ctx.lineWidth   = 1.8;
    ctx.strokeStyle = '#2A2A2A';
    ctx.stroke();

    /* Short accent strokes */
    ctx.lineWidth   = 1.2;
    ctx.strokeStyle = '#383838';
    ctx.beginPath();
    ctx.moveTo(620, 580);
    ctx.lineTo(720, 480);
    ctx.stroke();

    ctx.restore();
  }

  drawDecorativeCircles() {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.main.x, this.main.y, this.main.r - 5, 0, Math.PI * 2);
    ctx.clip();

    for (const dc of DECORATIVE_CIRCLES) {
      ctx.globalAlpha = dc.alpha;
      ctx.beginPath();
      ctx.arc(dc.x, dc.y, dc.r, 0, Math.PI * 2);
      ctx.fillStyle = dc.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* Draw one interactive circle */
  drawCircle(circle, isHovered, isSelected) {
    const { ctx } = this;
    ctx.save();

    /* Clip to main circle boundary */
    ctx.beginPath();
    ctx.arc(this.main.x, this.main.y, this.main.r - 5, 0, Math.PI * 2);
    ctx.clip();

    /* Drop shadow */
    ctx.shadowColor = isHovered || isSelected
      ? 'rgba(0,0,0,0.45)'
      : 'rgba(0,0,0,0.18)';
    ctx.shadowBlur  = isHovered || isSelected ? 22 : 10;

    /* Fill — radial gradient for depth */
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);

    if (isSelected) {
      const g = ctx.createRadialGradient(
        circle.x - circle.r * 0.3, circle.y - circle.r * 0.35, circle.r * 0.1,
        circle.x, circle.y, circle.r,
      );
      g.addColorStop(0, this._shift(circle.color, +50));
      g.addColorStop(0.65, circle.color);
      g.addColorStop(1,    this._shift(circle.color, -30));
      ctx.fillStyle = g;
    } else if (isHovered) {
      const g = ctx.createRadialGradient(
        circle.x - circle.r * 0.25, circle.y - circle.r * 0.28, circle.r * 0.05,
        circle.x, circle.y, circle.r,
      );
      g.addColorStop(0, this._shift(circle.color, +25));
      g.addColorStop(1, circle.color);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = circle.color;
    }
    ctx.fill();

    /* Optional stroke */
    if (circle.strokeColor) {
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = circle.strokeColor;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    /* Hover glow ring */
    if (isHovered && !circle.dragging) {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth   = 3;
      ctx.stroke();
    }

    /* Drag outline — dashed */
    if (circle.dragging) {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.r + 9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  /* Musical note label centered on the circle */
  drawLabel(circle) {
    const { ctx } = this;
    const size    = Math.max(9, Math.round(circle.r * 0.34));
    ctx.save();
    ctx.font         = `bold ${size}px 'Courier New', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = this._contrast(circle.color);
    ctx.globalAlpha  = 0.72;
    ctx.fillText(circle.note, circle.x, circle.y);
    ctx.restore();
  }

  /* Colour-blend overlay wash across the whole composition */
  drawOverlay() {
    if (!this.overlayCircle || this.overlayAlpha <= 0) return;
    const { ctx } = this;

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.main.x, this.main.y, this.main.r - 5, 0, Math.PI * 2);
    ctx.clip();

    ctx.globalCompositeOperation = this.overlayCircle.overlay;
    ctx.globalAlpha              = this.overlayAlpha * 0.38;
    ctx.fillStyle                = this.overlayCircle.color;
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha              = 1;
    ctx.restore();
  }

  /* ── Colour helpers ─────────────────────────────────────────── */

  _shift(hex, delta) {
    const parse = (s, o) => Math.min(255, Math.max(0, parseInt(s.slice(o, o + 2), 16) + delta));
    return `rgb(${parse(hex,1)},${parse(hex,3)},${parse(hex,5)})`;
  }

  _contrast(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return L > 0.52 ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.85)';
  }
}
