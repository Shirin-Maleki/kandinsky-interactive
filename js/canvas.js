/* ─────────────────────────────────────────────────────────────────
   canvas.js  —  update: add colour overlay blend-mode support
   ───────────────────────────────────────────────────────────────── */

class KandinskyRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W      = 800;
    this.H      = 800;
    this.main   = { x: 400, y: 400, r: 375 };

    /* Overlay state mutated by InteractionManager */
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

  clear() {
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

  drawLines() {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.main.x, this.main.y, this.main.r - 4, 0, Math.PI * 2);
    ctx.clip();
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(118, 105);
    ctx.lineTo(685, 695);
    ctx.lineWidth   = 4;
    ctx.strokeStyle = '#0E0E0E';
    ctx.stroke();
    ctx.lineWidth   = 1.8;
    ctx.strokeStyle = '#2A2A2A';
    ctx.beginPath();
    ctx.moveTo(95, 545);
    ctx.lineTo(608, 95);
    ctx.stroke();
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

  drawCircle(circle) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.main.x, this.main.y, this.main.r - 5, 0, Math.PI * 2);
    ctx.clip();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
    ctx.fillStyle = circle.color;
    ctx.fill();
    if (circle.strokeColor) {
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = circle.strokeColor;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLabel(circle) {
    const { ctx } = this;
    const size = Math.max(9, Math.round(circle.r * 0.34));
    ctx.save();
    ctx.font         = `bold ${size}px 'Courier New', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const r = parseInt(circle.color.slice(1,3), 16);
    const g = parseInt(circle.color.slice(3,5), 16);
    const b = parseInt(circle.color.slice(5,7), 16);
    const L = (0.299*r + 0.587*g + 0.114*b) / 255;
    ctx.fillStyle   = L > 0.52 ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.85)';
    ctx.globalAlpha = 0.72;
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
}
