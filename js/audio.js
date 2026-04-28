/* ─────────────────────────────────────────────────────────────────
   audio.js
   Web Audio API synthesis engine.
   Each circle has a waveform type, fundamental frequency, and plays
   through a shared reverb convolver + master gain chain.
   ───────────────────────────────────────────────────────────────── */

class KandinskyAudio {
  constructor() {
    this.ctx         = null;
    this.masterGain  = null;
    this.reverb      = null;
    this.reverbSend  = null;
    this.initialized = false;
    this._active     = new Map(); /* circleId → { osc, gainNode } */
    this._initPromise = null;
  }

  /* Call once from the first user-gesture handler */
  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._setup();
    return this._initPromise;
  }

  async _setup() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.reverb     = await this._buildReverb(2.5);
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.setValueAtTime(0.28, this.ctx.currentTime);
    this.reverb.connect(this.reverbSend);
    this.reverbSend.connect(this.ctx.destination);

    this.initialized = true;
  }

  /* Synthetic impulse-response convolver */
  async _buildReverb(duration) {
    const sr      = this.ctx.sampleRate;
    const length  = Math.ceil(sr * duration);
    const buf     = this.ctx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.8);
      }
    }
    const node    = this.ctx.createConvolver();
    node.buffer   = buf;
    return node;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /* Full attack–decay–sustain–release tone triggered by a click */
  playCircle(circle) {
    if (!this.initialized) return;
    this._stop(circle.id);

    const t    = this.ctx.currentTime;
    const osc  = this.ctx.createOscillator();
    const gn   = this.ctx.createGain();
    const filt = this.ctx.createBiquadFilter();

    osc.type = circle.wave;
    osc.frequency.setValueAtTime(circle.freq, t);
    /* Slight pitch inflection for expressiveness */
    osc.frequency.linearRampToValueAtTime(circle.freq * 1.006, t + 0.08);
    osc.frequency.linearRampToValueAtTime(circle.freq,         t + 0.35);

    filt.type            = 'bandpass';
    filt.frequency.value = circle.freq * 2.2;
    filt.Q.value         = 1.8;

    /* ADSR */
    gn.gain.setValueAtTime(0, t);
    gn.gain.linearRampToValueAtTime(0.52, t + 0.025);
    gn.gain.exponentialRampToValueAtTime(0.22, t + 0.45);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 1.9);

    osc.connect(filt);
    filt.connect(gn);
    gn.connect(this.masterGain);
    gn.connect(this.reverb);

    osc.start(t);
    osc.stop(t + 1.9);
    osc.onended = () => this._active.delete(circle.id);

    this._active.set(circle.id, { osc, gn });
  }

  /* Subtle chime on hover */
  playHover(circle) {
    if (!this.initialized) return;
    const t   = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gn  = this.ctx.createGain();

    osc.type            = 'sine';
    osc.frequency.value = circle.freq * 4;

    gn.gain.setValueAtTime(0, t);
    gn.gain.linearRampToValueAtTime(0.07, t + 0.04);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gn);
    gn.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  _stop(id) {
    if (!this._active.has(id)) return;
    const { osc, gn } = this._active.get(id);
    const t = this.ctx.currentTime;
    try {
      gn.gain.cancelScheduledValues(t);
      gn.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.stop(t + 0.08);
    } catch (_) {}
    this._active.delete(id);
  }
}
