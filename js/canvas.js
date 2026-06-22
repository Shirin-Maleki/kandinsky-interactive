/* ─────────────────────────────────────────────────────────────────
   canvas.js
   Rendering functions for the Kandinsky canvas.
   ───────────────────────────────────────────────────────────────── */

/* Geometry utility used by interactions.js and main.js too */
function distPointToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

class KandinskyRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W      = 800;
    this.H      = 800;
    this.main   = { x: 400, y: 400, r: 375 };

    this.overlayCircle = null;
    this.overlayAlpha  = 0;

    /* Structural lines with per-line vibration state */
    this.lines = [
      { x1:118, y1:105, x2:685, y2:695, width:4,   color:'#0E0E0E', freq:110, vibAmp:0, vibPhase:0, vibFreq:13 },
      { x1:95,  y1:545, x2:608, y2:95,  width:1.8, color:'#2A2A2A', freq:165, vibAmp:0, vibPhase:0, vibFreq:17 },
      { x1:620, y1:580, x2:720, y2:480, width:1.2, color:'#383838', freq:220, vibAmp:0, vibPhase:0, vibFreq:22 },
    ];
    this._lineCooldown = [0, 0, 0]; /* timestamps for pluck cooldown */

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

  /* Two large soft beams that slowly sweep with sine-wave motion */
  drawBackgroundRays(time) {
    const { ctx } = this;
    const { x: cx, y: cy, r } = this.main;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
    ctx.clip();

    /* Ray 1 — warm amber, sweeps ±12° on a ~22s cycle */
    const angle1 = 0.72 + Math.sin(time * 0.00028) * 0.21;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle1);
    const g1 = ctx.createLinearGradient(0, -r, 0, r);
    g1.addColorStop(0,    'rgba(232,176,48,0)');
    g1.addColorStop(0.28, 'rgba(232,176,48,0.07)');
    g1.addColorStop(0.5,  'rgba(232,176,48,0.12)');
    g1.addColorStop(0.72, 'rgba(232,176,48,0.07)');
    g1.addColorStop(1,    'rgba(232,176,48,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    /* Ray 2 — violet-blue, offset phase, sweeps ±9° on a ~33s cycle */
    const angle2 = 2.1 + Math.sin(time * 0.00019 + 1.4) * 0.15;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle2);
    const g2 = ctx.createLinearGradient(0, -r, 0, r);
    g2.addColorStop(0,    'rgba(107,35,135,0)');
    g2.addColorStop(0.28, 'rgba(107,35,135,0.08)');
    g2.addColorStop(0.5,  'rgba(107,35,135,0.14)');
    g2.addColorStop(0.72, 'rgba(107,35,135,0.08)');
    g2.addColorStop(1,    'rgba(107,35,135,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    ctx.restore();
  }

  /* Advance vibration physics for all lines — call once per frame */
  tickLines() {
    for (const line of this.lines) {
      if (line.vibAmp <= 0) continue;
      line.vibPhase += line.vibFreq * 0.085;
      line.vibAmp   *= 0.973;
      if (line.vibAmp < 0.25) line.vibAmp = 0;
    }
  }

  /* Trigger a pluck on line idx; returns true if cooldown allows it */
  pluckLine(idx, intensity = 8) {
    const now = performance.now();
    if (now - this._lineCooldown[idx] < 380) return false;
    this._lineCooldown[idx] = now;
    const line = this.lines[idx];
    line.vibAmp   = Math.max(line.vibAmp, intensity);
    line.vibPhase = 0;
    return true;
  }

  /* Characteristic diagonal lines — static when calm, wavy when plucked */
  drawLines() {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.main.x, this.main.y, this.main.r - 4, 0, Math.PI * 2);
    ctx.clip();
    ctx.lineCap = 'round';

    for (const line of this.lines) {
      if (line.vibAmp > 0.25) {
        this._drawVibLine(ctx, line);
      } else {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.lineWidth   = line.width;
        ctx.strokeStyle = line.color;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _drawVibLine(ctx, line) {
    const { x1, y1, x2, y2, vibAmp, vibPhase, width, color } = line;
    const dx  = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    /* Perpendicular unit vector for wave displacement */
    const nx = -dy / len, ny = dx / len;

    const steps = 48;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t    = i / steps;
      const wave = vibAmp * Math.sin(t * Math.PI * 5 + vibPhase);
      const vx   = x1 + t * dx + nx * wave;
      const vy   = y1 + t * dy + ny * wave;
      if (i === 0) ctx.moveTo(vx, vy);
      else         ctx.lineTo(vx, vy);
    }
    ctx.lineWidth   = width;
    ctx.strokeStyle = color;
    ctx.stroke();
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

  /* Draw one interactive circle with paint-like semi-transparency.
     Hovered circles display a gravity-well pulsing ring. */
  drawCircle(circle, isHovered, isSelected, time) {
    const { ctx } = this;
    ctx.save();

    ctx.beginPath();
    ctx.arc(this.main.x, this.main.y, this.main.r - 5, 0, Math.PI * 2);
    ctx.clip();

    /* Paint-like transparency — heavier circles are more opaque */
    ctx.globalAlpha = circle.alpha ?? 0.78;

    ctx.shadowColor = isHovered || isSelected
      ? 'rgba(0,0,0,0.45)'
      : 'rgba(0,0,0,0.18)';
    ctx.shadowBlur  = isHovered || isSelected ? 22 : 10;

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

    if (circle.strokeColor) {
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = circle.strokeColor;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    }

    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1; /* rings and overlays always at full opacity */

    /* Gravity-well pulsing amber ring when hovered */
    if (isHovered && !circle.dragging) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.r + 5 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,185,30,${0.45 + pulse * 0.35})`;
      ctx.lineWidth   = 2.5;
      ctx.stroke();

      /* Outer dashed orbit */
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.r + 18 + pulse * 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,185,30,${0.12 + pulse * 0.12})`;
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
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
