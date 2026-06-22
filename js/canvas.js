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

    /* Structural lines — geometry defines both appearance and audio pitch.
       Formula: freq = clamp(40000 / (len^0.8 × width^0.5), 55, 880)
       Thick/long lines → low deep frequencies; thin/short → high bright ones.
       vibFreq (visual oscillation speed) = clamp(10000 / (len+200), 10, 30) */
    this.lines = [
      /* Original Kandinsky lines */
      { x1:118, y1:105, x2:685, y2:695, width:4.0, color:'#0D0D1A' },  /* bold diagonal   */
      { x1:95,  y1:545, x2:608, y2:95,  width:1.8, color:'#252525' },  /* cross diagonal  */
      { x1:620, y1:580, x2:720, y2:480, width:1.2, color:'#363636' },  /* short accent    */
      /* Extended lines for richer composition */
      { x1:62,  y1:398, x2:740, y2:402, width:2.5, color:'#1A1A2E' },  /* near-horizontal */
      { x1:397, y1:30,  x2:403, y2:758, width:1.6, color:'#222240' },  /* near-vertical   */
      { x1:155, y1:615, x2:495, y2:175, width:1.0, color:'#2E2E2E' },  /* medium diagonal */
      { x1:545, y1:648, x2:745, y2:318, width:0.8, color:'#404040' },  /* short steep NE  */
    ];

    /* Compute freq and vibFreq from geometry for each line */
    this.lines.forEach(ln => this._computeLineProps(ln));

    /* Pluck cooldown timestamps, one entry per line */
    this._lineCooldown = this.lines.map(() => 0);

    /* Effect pools — populated by addRipple / addParticleBurst */
    this.ripples   = [];
    this.particles = [];

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

  /* Derive audio pitch and visual vibration rate from line geometry */
  _computeLineProps(line) {
    const len       = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
    line.len        = len;
    line.freq       = Math.max(55,  Math.min(880, 40000 / (Math.pow(len, 0.8) * Math.pow(line.width, 0.5))));
    line.vibFreq    = Math.max(10,  Math.min(30,  10000 / (len + 200)));
    line.vibAmp     = 0;
    line.vibPhase   = 0;
  }

  /* ── Scene layers ───────────────────────────────────────────── */

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
    ctx.strokeStyle = '#080818';
    ctx.stroke();
    ctx.restore();
  }

  /* Four autonomously sweeping colour beams — amber, violet, green, yellow */
  drawBackgroundRays(time) {
    const { ctx } = this;
    const { x: cx, y: cy, r } = this.main;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
    ctx.clip();

    const rays = [
      /* amber  — ~22 s cycle */
      { angle: 0.72 + Math.sin(time * 0.00028) * 0.21,
        rgba: [232, 176, 48],  peak: 0.12 },
      /* violet — ~33 s cycle, offset phase */
      { angle: 2.10 + Math.sin(time * 0.00019 + 1.4) * 0.15,
        rgba: [107, 35, 135], peak: 0.14 },
      /* green  — ~26 s cycle */
      { angle: 4.00 + Math.sin(time * 0.00024 + 2.1) * 0.19,
        rgba: [0, 200, 83],   peak: 0.13 },
      /* yellow — ~20 s cycle, offset phase */
      { angle: 5.30 + Math.sin(time * 0.00031 + 0.4) * 0.17,
        rgba: [253, 216, 53], peak: 0.13 },
    ];

    for (const ray of rays) {
      const [rr, gg, bb] = ray.rgba;
      const p            = ray.peak;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ray.angle);
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0,    `rgba(${rr},${gg},${bb},0)`);
      g.addColorStop(0.26, `rgba(${rr},${gg},${bb},${p * 0.6})`);
      g.addColorStop(0.5,  `rgba(${rr},${gg},${bb},${p})`);
      g.addColorStop(0.74, `rgba(${rr},${gg},${bb},${p * 0.6})`);
      g.addColorStop(1,    `rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }

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

  /* Draw all structural lines — calm or vibrating */
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
    const nx  = -dy / len, ny = dx / len; /* perpendicular unit vector */

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

  /* Draw one interactive circle — semi-transparent, gravity-well ring on hover */
  drawCircle(circle, isHovered, isSelected, time) {
    const { ctx } = this;
    ctx.save();

    ctx.beginPath();
    ctx.arc(this.main.x, this.main.y, this.main.r - 5, 0, Math.PI * 2);
    ctx.clip();

    ctx.globalAlpha = circle.alpha ?? 0.78;

    ctx.shadowColor = isHovered || isSelected ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.18)';
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
    ctx.globalAlpha = 1;

    /* Gravity-well pulsing ring on hover */
    if (isHovered && !circle.dragging) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.r + 5 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,185,30,${0.45 + pulse * 0.35})`;
      ctx.lineWidth   = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.r + 18 + pulse * 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,185,30,${0.12 + pulse * 0.12})`;
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

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

  /* ── Effect pools ───────────────────────────────────────────── */

  /* Spawn a ripple ring expanding from circle — magic:'ripple' */
  addRipple(circle) {
    this.ripples.push({
      x: circle.x, y: circle.y,
      r: circle.r * 0.9,
      targetR: circle.r * 3.8,
      color: circle.color,
      life: 1.0,
    });
  }

  /* Spawn a radial particle burst from circle — magic:'burst' */
  addParticleBurst(circle) {
    const count = 14 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const speed = circle.r * 0.07 + Math.random() * 3.5;
      this.particles.push({
        x: circle.x, y: circle.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: circle.color,
        size: 2.5 + Math.random() * (circle.r * 0.06),
      });
    }
  }

  tickRipples() {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.r    += (rp.targetR - rp.r) * 0.055;
      rp.life -= 0.022;
      if (rp.life <= 0) this.ripples.splice(i, 1);
    }
  }

  tickParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x     += p.vx;
      p.y     += p.vy;
      p.vx    *= 0.93; /* air drag */
      p.vy    *= 0.93;
      p.vy    += 0.08; /* subtle gravity pull */
      p.life  -= 0.026;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  drawRipples() {
    if (this.ripples.length === 0) return;
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.main.x, this.main.y, this.main.r - 5, 0, Math.PI * 2);
    ctx.clip();

    for (const rp of this.ripples) {
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = rp.color;
      ctx.globalAlpha = rp.life * 0.65;
      ctx.lineWidth   = rp.life * 3.5;
      ctx.stroke();

      /* Second, subtler outer ring */
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r * 1.18, 0, Math.PI * 2);
      ctx.globalAlpha = rp.life * 0.25;
      ctx.lineWidth   = rp.life * 1.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawParticles() {
    if (this.particles.length === 0) return;
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.main.x, this.main.y, this.main.r - 5, 0, Math.PI * 2);
    ctx.clip();

    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle   = p.color;
      ctx.globalAlpha = p.life * 0.85;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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
