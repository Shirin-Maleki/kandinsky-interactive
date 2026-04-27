/* ─────────────────────────────────────────────────────────────────
   audio.js  —  initial: AudioContext bootstrap and reverb convolver
   ───────────────────────────────────────────────────────────────── */

class KandinskyAudio {
  constructor() {
    this.ctx          = null;
    this.masterGain   = null;
    this.reverb       = null;
    this.initialized  = false;
    this._initPromise = null;
  }

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

    this.reverb = await this._buildReverb(2.5);
    this.reverb.connect(this.ctx.destination);

    this.initialized = true;
  }

  /* Synthetic impulse-response convolver — exponentially decaying noise */
  async _buildReverb(duration) {
    const sr     = this.ctx.sampleRate;
    const length = Math.ceil(sr * duration);
    const buf    = this.ctx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.8);
      }
    }
    const node  = this.ctx.createConvolver();
    node.buffer = buf;
    return node;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
}
